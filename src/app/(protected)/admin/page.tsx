import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin-panel";
import { FormBackdrop } from "@/components/form-backdrop";
import type { Profile, Group, MatchWithProfiles } from "@/lib/types";

type ProfileRow = Profile & { is_admin: boolean };

export default async function AdminPage() {
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

  // Admins bypass RLS via the admin_all_* policies, so plain queries work.
  const [usersRes, authUsersRes, groupsRes, membersRes, matchesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at, is_admin")
        .order("created_at", { ascending: false }),
      // auth.users emails — exposed to admin via the admin override on profiles
      // doesn't include email, so we read from auth.users directly. This call
      // is only allowed for the service role; with the publishable key we
      // can't read auth.users. Fall back to no email if the call fails.
      supabase.auth.admin
        .listUsers()
        .then((r) => r)
        .catch(() => ({ data: { users: [] }, error: null })),
      supabase
        .from("groups")
        .select("id, name, description, invite_code, created_by, created_at"),
      supabase.from("group_members").select("group_id, user_id"),
      supabase
        .from("matches")
        .select(
          "id, group_id, winner_id, loser_id, location, game_type, notes, played_at, logged_by, created_at, winner:profiles!matches_winner_id_fkey(id,display_name,avatar_url), loser:profiles!matches_loser_id_fkey(id,display_name,avatar_url)",
        )
        .order("played_at", { ascending: false })
        .limit(50),
    ]);

  const profiles = (usersRes.data as ProfileRow[] | null) ?? [];
  const groups = (groupsRes.data as Group[] | null) ?? [];
  const memberships =
    (membersRes.data as { group_id: string; user_id: string }[] | null) ?? [];
  const matches =
    (matchesRes.data as unknown as MatchWithProfiles[] | null) ?? [];

  // Email map (only available with service-role key; fine if empty)
  const emailById = new Map<string, string | null>();
  const authData = (authUsersRes as { data?: { users?: { id: string; email?: string | null }[] } }).data;
  for (const u of authData?.users ?? []) {
    emailById.set(u.id, u.email ?? null);
  }

  // Match counts per user (winner or loser)
  const matchCount = new Map<string, number>();
  for (const m of matches) {
    matchCount.set(m.winner_id, (matchCount.get(m.winner_id) ?? 0) + 1);
    matchCount.set(m.loser_id, (matchCount.get(m.loser_id) ?? 0) + 1);
  }
  // Group count per user
  const groupCount = new Map<string, number>();
  for (const m of memberships) {
    groupCount.set(m.user_id, (groupCount.get(m.user_id) ?? 0) + 1);
  }

  const users = profiles.map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? null,
    group_count: groupCount.get(p.id) ?? 0,
    match_count: matchCount.get(p.id) ?? 0,
  }));

  // Member + match counts per group
  const memberPerGroup = new Map<string, number>();
  const matchPerGroup = new Map<string, number>();
  for (const m of memberships) {
    memberPerGroup.set(m.group_id, (memberPerGroup.get(m.group_id) ?? 0) + 1);
  }
  for (const m of matches) {
    matchPerGroup.set(m.group_id, (matchPerGroup.get(m.group_id) ?? 0) + 1);
  }

  const groupRows = groups.map((g) => ({
    ...g,
    member_count: memberPerGroup.get(g.id) ?? 0,
    match_count: matchPerGroup.get(g.id) ?? 0,
  }));

  return (
    <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
      <FormBackdrop />
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-fg hover:text-accent mb-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
      >
        <ChevronLeft className="size-4" />
        Back to dashboard
      </Link>
      <AdminPanel
        currentUserId={user.id}
        users={users}
        groups={groupRows}
        recentMatches={matches}
      />
    </main>
  );
}
