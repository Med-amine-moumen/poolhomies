"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { error?: string; ok?: boolean };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/dashboard");
  return { supabase, user };
}

export async function setAdminAction(
  userId: string,
  isAdmin: boolean,
): Promise<AdminResult> {
  const { supabase, user } = await requireAdmin();
  if (userId === user.id && !isAdmin) {
    return { error: "You can't remove your own admin role from here" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminDeleteUserAction(
  userId: string,
): Promise<AdminResult> {
  const { supabase, user } = await requireAdmin();
  if (userId === user.id) {
    return { error: "Refuse to delete your own account" };
  }

  const { error } = await supabase.rpc("admin_delete_user", {
    p_user_id: userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminDeleteGroupAction(
  groupId: string,
): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminDeleteMatchAction(
  matchId: string,
): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
