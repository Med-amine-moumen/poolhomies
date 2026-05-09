-- ============================================================================
-- 0005 — restore set-based get_leaderboard with correct sort order
--
-- The loop-based version from 0004 returned rows in group_members insertion
-- order because RETURN NEXT has no implicit ORDER BY. Replacing with the
-- original set-based approach (cleaner, faster) but using played_at +
-- created_at as the streak tiebreaker instead of the UUID match_id.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_leaderboard(uuid);

CREATE OR REPLACE FUNCTION public.get_leaderboard(group_uuid UUID)
RETURNS TABLE (
  player_id     UUID,
  display_name  TEXT,
  avatar_url    TEXT,
  wins          BIGINT,
  losses        BIGINT,
  total_matches BIGINT,
  win_pct       NUMERIC,
  current_streak INT,
  best_streak   INT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH members AS (
    SELECT gm.user_id AS id, p.display_name, p.avatar_url
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = group_uuid
  ),
  player_matches AS (
    SELECT
      m.played_at,
      m.created_at,
      mem.id  AS player_id,
      CASE WHEN m.winner_id = mem.id THEN 'W' ELSE 'L' END AS result,
      ROW_NUMBER() OVER (
        PARTITION BY mem.id
        ORDER BY m.played_at ASC, m.created_at ASC
      ) AS rn
    FROM public.matches m
    JOIN members mem ON mem.id = m.winner_id OR mem.id = m.loser_id
    WHERE m.group_id = group_uuid
  ),
  grouped AS (
    -- gaps-and-islands: consecutive same-result rows get the same grp value
    SELECT
      player_id,
      result,
      rn,
      rn - ROW_NUMBER() OVER (PARTITION BY player_id, result ORDER BY rn) AS grp
    FROM player_matches
  ),
  streak_runs AS (
    SELECT
      player_id,
      result,
      COUNT(*)  AS run_len,
      MAX(rn)   AS run_end
    FROM grouped
    GROUP BY player_id, result, grp
  ),
  best_per_player AS (
    SELECT player_id, MAX(run_len)::INT AS best_streak
    FROM streak_runs
    WHERE result = 'W'
    GROUP BY player_id
  ),
  last_run AS (
    -- most recent run per player; if it is a W run, that is the current streak
    SELECT DISTINCT ON (player_id)
      player_id, result, run_len
    FROM streak_runs
    ORDER BY player_id, run_end DESC
  ),
  agg AS (
    SELECT
      mem.id           AS player_id,
      mem.display_name,
      mem.avatar_url,
      COALESCE(SUM(CASE WHEN pm.result = 'W' THEN 1 ELSE 0 END), 0)::BIGINT AS wins,
      COALESCE(SUM(CASE WHEN pm.result = 'L' THEN 1 ELSE 0 END), 0)::BIGINT AS losses
    FROM members mem
    LEFT JOIN player_matches pm ON pm.player_id = mem.id
    GROUP BY mem.id, mem.display_name, mem.avatar_url
  )
  SELECT
    a.player_id,
    a.display_name,
    a.avatar_url,
    a.wins,
    a.losses,
    (a.wins + a.losses)                                           AS total_matches,
    CASE
      WHEN (a.wins + a.losses) = 0 THEN 0::NUMERIC
      ELSE ROUND((a.wins::NUMERIC / (a.wins + a.losses)) * 100, 1)
    END                                                           AS win_pct,
    CASE WHEN lr.result = 'W' THEN lr.run_len::INT ELSE 0 END    AS current_streak,
    COALESCE(bp.best_streak, 0)                                   AS best_streak
  FROM agg a
  LEFT JOIN best_per_player bp ON bp.player_id = a.player_id
  LEFT JOIN last_run         lr ON lr.player_id = a.player_id
  ORDER BY a.wins DESC, a.losses ASC, a.display_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
