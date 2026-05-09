import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Leaderboard } from "@/components/leaderboard";
import { RecentMatches } from "@/components/recent-matches";
import type { LeaderboardRow, MatchWithProfiles } from "@/lib/types";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Self-heal: if any data is missing (creator's own membership, or an
  // opponent referenced in a past match but absent from group_members),
  // call the SECURITY DEFINER repair function. It's a no-op when nothing
  // is missing and the unique constraint makes it idempotent.
  const { data: groupMeta } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", id)
    .single();
  if (groupMeta?.created_by === user.id) {
    await supabase.rpc("repair_group_memberships", { p_group_id: id });
  }

  const [leaderboardRes, matchesRes] = await Promise.all([
    supabase.rpc("get_leaderboard", { group_uuid: id }),
    supabase
      .from("matches")
      .select(
        "id, group_id, winner_id, loser_id, location, game_type, notes, played_at, logged_by, created_at, winner:profiles!matches_winner_id_fkey(id,display_name,avatar_url), loser:profiles!matches_loser_id_fkey(id,display_name,avatar_url)",
      )
      .eq("group_id", id)
      .order("played_at", { ascending: false })
      .limit(8),
  ]);

  const rows = ((leaderboardRes.data as LeaderboardRow[] | null) ?? [])
    .sort((a, b) => Number(b.wins) - Number(a.wins) || Number(a.losses) - Number(b.losses) || a.display_name.localeCompare(b.display_name));
  const matches =
    (matchesRes.data as unknown as MatchWithProfiles[] | null) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Leaderboard groupId={id} rows={rows} currentUserId={user.id} />
      <RecentMatches matches={matches} />
    </div>
  );
}
