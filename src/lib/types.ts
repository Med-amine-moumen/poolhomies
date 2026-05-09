export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  is_admin?: boolean;
};

export type MatchComment = {
  id: string;
  match_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type MatchCommentWithProfile = MatchComment & {
  profile: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
};

export type GameType = "8-Ball" | "9-Ball" | "10-Ball" | "Straight Pool" | "Other";

export const GAME_TYPES: GameType[] = [
  "8-Ball",
  "9-Ball",
  "10-Ball",
  "Straight Pool",
  "Other",
];

export type Match = {
  id: string;
  group_id: string;
  winner_id: string;
  loser_id: string;
  location: string | null;
  game_type: GameType | null;
  notes: string | null;
  played_at: string;
  logged_by: string;
  created_at: string;
};

export type MatchWithProfiles = Match & {
  winner: Pick<Profile, "id" | "display_name" | "avatar_url">;
  loser: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type LeaderboardRow = {
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  wins: number;
  losses: number;
  total_matches: number;
  win_pct: number;
  current_streak: number;
  best_streak: number;
};

export type H2HResult = {
  a_wins: number;
  b_wins: number;
  total: number;
  last_match: string | null;
};
