"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().max(280).optional(),
});

const joinSchema = z.object({
  invite_code: z
    .string()
    .min(4, "Invalid invite code")
    .transform((v) => v.trim().toUpperCase()),
});

const renameSchema = z.object({
  group_id: z.string().uuid(),
  name: z.string().min(2).max(60),
  description: z.string().max(280).optional(),
});

export type ActionResult = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createGroupAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();

  // Direct insert. Works because migration 0002 relaxed the SELECT policy on
  // `groups` to allow the creator to read back rows they own — without that,
  // .select("id") would fail (creator isn't a member yet at that instant).
  let groupId: string | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        invite_code: code,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (!error && data) {
      groupId = data.id;
      break;
    }
    // 23505 = unique_violation (invite code collision) — retry with a new code
    if (error && error.code !== "23505") {
      return { error: error.message };
    }
  }
  if (!groupId) return { error: "Could not generate a unique invite code" };

  // Add creator as a first member.
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: user.id });
  if (memberError && memberError.code !== "23505") {
    return { error: memberError.message };
  }

  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
}

export async function joinGroupAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = joinSchema.safeParse({
    invite_code: formData.get("invite_code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await requireUser();

  // Look up the group by invite code. RLS does not let us read groups we
  // aren't a member of, so we expose a SECURITY DEFINER lookup via a
  // regular .from query: we made invite_code unique. We use rpc here for
  // bypass: actually, the simplest path — query with auth, but RLS blocks
  // non-members. We work around by adding a quick lookup function below if
  // needed; for now we use the auth user's session and a direct query that
  // RLS allows once they become a member. Since they aren't a member yet,
  // we need a SECURITY DEFINER helper. Simplest: insert into group_members
  // and let the unique constraint return errors. We need group_id though.
  // Use the dedicated lookup function get_group_by_invite_code (added in
  // migration 0002).
  const { data: lookup, error: lookupError } = await supabase.rpc(
    "get_group_by_invite_code",
    { code: parsed.data.invite_code },
  );

  if (lookupError) return { error: lookupError.message };
  if (!lookup || lookup.length === 0) return { error: "Invite code not found" };

  const groupId = lookup[0].id as string;

  const { error: insertError } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: user.id });
  if (insertError && insertError.code !== "23505") {
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
}

export async function regenerateInviteCodeAction(groupId: string) {
  const { supabase, user } = await requireUser();
  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .single();
  if (!group || group.created_by !== user.id) {
    return { error: "Only the creator can regenerate the invite code" };
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const code = generateInviteCode();
    const { error } = await supabase
      .from("groups")
      .update({ invite_code: code })
      .eq("id", groupId);
    if (!error) {
      revalidatePath(`/groups/${groupId}/settings`);
      return { code };
    }
    if (error.code !== "23505") return { error: error.message };
  }
  return { error: "Could not generate a unique invite code" };
}

export async function updateGroupAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = renameSchema.safeParse({
    group_id: formData.get("group_id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("groups")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .eq("id", parsed.data.group_id);
  if (error) return { error: error.message };

  revalidatePath(`/groups/${parsed.data.group_id}`);
  revalidatePath(`/groups/${parsed.data.group_id}/settings`);
  return {};
}

export async function removeMemberAction(groupId: string, userId: string) {
  const { supabase, user } = await requireUser();
  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .single();
  if (!group) return { error: "Group not found" };
  if (group.created_by !== user.id && userId !== user.id) {
    return { error: "Not authorized" };
  }
  if (userId === group.created_by) {
    return { error: "The creator can't be removed" };
  }
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}/settings`);
  return {};
}

export async function leaveGroupAction(groupId: string) {
  const { supabase, user } = await requireUser();
  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .single();
  if (group?.created_by === user.id) {
    return { error: "Creators can't leave their own group" };
  }
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
