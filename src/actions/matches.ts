"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const logSchema = z
  .object({
    group_id: z.string().uuid(),
    winner_id: z.string().uuid("Pick a winner"),
    loser_id: z.string().uuid("Pick an opponent"),
    location: z.string().max(120).optional(),
    game_type: z
      .enum(["8-Ball", "9-Ball", "10-Ball", "Straight Pool", "Other"])
      .default("8-Ball"),
    notes: z.string().max(500).optional(),
    played_at: z.string().optional(),
    tz_offset: z.coerce.number().int().min(-840).max(720).default(0),
  })
  .refine((v) => v.winner_id !== v.loser_id, {
    message: "Winner and opponent must be different players",
    path: ["loser_id"],
  });

export type ActionResult = { error?: string };

export async function logWinAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = logSchema.safeParse({
    group_id: formData.get("group_id"),
    winner_id: formData.get("winner_id"),
    loser_id: formData.get("loser_id"),
    location: (formData.get("location") as string) || undefined,
    game_type: formData.get("game_type") || "8-Ball",
    notes: (formData.get("notes") as string) || undefined,
    played_at: (formData.get("played_at") as string) || undefined,
    tz_offset: formData.get("tz_offset") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // datetime-local inputs submit "YYYY-MM-DDTHH:MM" with no timezone.
  // We reconstruct the correct UTC time using the browser's offset
  // (getTimezoneOffset: positive = west of UTC, negative = east).
  const playedAt = parsed.data.played_at
    ? (() => {
        const off = parsed.data.tz_offset;
        const sign = off <= 0 ? "+" : "-";
        const abs = Math.abs(off);
        const hh = String(Math.floor(abs / 60)).padStart(2, "0");
        const mm = String(abs % 60).padStart(2, "0");
        return new Date(`${parsed.data.played_at}:00${sign}${hh}:${mm}`).toISOString();
      })()
    : new Date().toISOString();

  const { error } = await supabase.from("matches").insert({
    group_id: parsed.data.group_id,
    winner_id: parsed.data.winner_id,
    loser_id: parsed.data.loser_id,
    location: parsed.data.location ?? null,
    game_type: parsed.data.game_type,
    notes: parsed.data.notes ?? null,
    played_at: playedAt,
    logged_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/groups/${parsed.data.group_id}`);
  revalidatePath(`/groups/${parsed.data.group_id}/history`);
  revalidatePath("/dashboard");
  redirect(`/groups/${parsed.data.group_id}`);
}

const commentSchema = z.object({
  match_id: z.string().uuid(),
  group_id: z.string().uuid(),
  body: z.string().trim().min(1, "Comment can't be empty").max(500),
});

export type CommentResult = { error?: string; ok?: boolean };

export async function addMatchCommentAction(
  _prev: CommentResult | undefined,
  formData: FormData,
): Promise<CommentResult> {
  const parsed = commentSchema.safeParse({
    match_id: formData.get("match_id"),
    group_id: formData.get("group_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("match_comments").insert({
    match_id: parsed.data.match_id,
    user_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: error.message };

  revalidatePath(`/groups/${parsed.data.group_id}/history`);
  revalidatePath(`/groups/${parsed.data.group_id}`);
  return { ok: true };
}

export async function deleteMatchCommentAction(
  commentId: string,
  groupId: string,
): Promise<CommentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS allows author + admin to delete; we let the database enforce that.
  const { error } = await supabase
    .from("match_comments")
    .delete()
    .eq("id", commentId);
  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}/history`);
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function deleteMatchAction(
  matchId: string,
  groupId: string,
): Promise<CommentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS lets only admins delete matches (matches are otherwise immutable).
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}/history`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
