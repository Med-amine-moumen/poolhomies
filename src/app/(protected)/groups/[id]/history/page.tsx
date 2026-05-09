import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchHistory } from "@/components/match-history";
import type {
  MatchWithProfiles,
  MatchCommentWithProfile,
  Profile,
} from "@/lib/types";

type MemberRow = {
  user_id: string;
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

type CommentRow = {
  id: string;
  match_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export default async function HistoryPage({
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

  const [matchesRes, membersRes, commentsRes, meRes] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, group_id, winner_id, loser_id, location, game_type, notes, played_at, logged_by, created_at, winner:profiles!matches_winner_id_fkey(id,display_name,avatar_url), loser:profiles!matches_loser_id_fkey(id,display_name,avatar_url)",
      )
      .eq("group_id", id)
      .order("played_at", { ascending: false })
      .limit(200),
    supabase
      .from("group_members")
      .select("user_id, profiles(id, display_name, avatar_url)")
      .eq("group_id", id),
    supabase
      .from("match_comments")
      .select(
        "id, match_id, user_id, body, created_at, profile:profiles!match_comments_user_id_fkey(id,display_name,avatar_url)",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single(),
  ]);

  const matches =
    (matchesRes.data as unknown as MatchWithProfiles[] | null) ?? [];
  const members =
    ((membersRes.data as unknown as MemberRow[] | null)
      ?.map((m) => m.profiles)
      .filter(
        (p): p is Pick<Profile, "id" | "display_name" | "avatar_url"> =>
          p !== null,
      ) ?? []);

  const comments: MatchCommentWithProfile[] = (
    (commentsRes.data as unknown as CommentRow[] | null) ?? []
  )
    .filter((c) => c.profile !== null)
    .map((c) => ({
      id: c.id,
      match_id: c.match_id,
      user_id: c.user_id,
      body: c.body,
      created_at: c.created_at,
      profile: c.profile!,
    }));

  const isAdmin = !!meRes.data?.is_admin;

  return (
    <MatchHistory
      matches={matches}
      members={members}
      comments={comments}
      groupId={id}
      currentUserId={user.id}
      isAdmin={isAdmin}
    />
  );
}
