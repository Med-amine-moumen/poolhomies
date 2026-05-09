-- ============================================================================
-- 0004 — replace get_leaderboard with loop-based streak calculation
--
-- The original set-based (gaps-and-islands) version used match UUID as the
-- tiebreaker when two matches share the same played_at, which produced
-- non-deterministic streak ordering. This version uses created_at as the
-- tiebreaker and computes streaks via explicit loops — simpler to reason
-- about and correct for the typical case.
--
-- Also back-fills profile rows for any auth users created before the trigger
-- was in place (orphaned-user repair).
-- ============================================================================

-- Drop old function so we can change the language/body freely.
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
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  member         RECORD;
  match_rec      RECORD;
  curr_streak    INT;
  max_streak     INT;
  running_streak INT;
BEGIN
  FOR member IN
    SELECT p.id, p.display_name, p.avatar_url
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = group_uuid
  LOOP
    SELECT COALESCE(COUNT(*), 0) INTO wins
    FROM public.matches m
    WHERE m.group_id = group_uuid AND m.winner_id = member.id;

    SELECT COALESCE(COUNT(*), 0) INTO losses
    FROM public.matches m
    WHERE m.group_id = group_uuid AND m.loser_id = member.id;

    total_matches := wins + losses;

    win_pct := CASE
      WHEN total_matches > 0 THEN ROUND((wins::NUMERIC / total_matches::NUMERIC) * 100, 1)
      ELSE 0
    END;

    -- Current streak: walk matches newest-first; count leading wins, stop at first loss
    curr_streak := 0;
    FOR match_rec IN
      SELECT m.winner_id
      FROM public.matches m
      WHERE m.group_id = group_uuid
        AND (m.winner_id = member.id OR m.loser_id = member.id)
      ORDER BY m.played_at DESC, m.created_at DESC
    LOOP
      IF match_rec.winner_id = member.id THEN
        curr_streak := curr_streak + 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;

    -- Best streak: walk matches oldest-first; track longest win run
    max_streak     := 0;
    running_streak := 0;
    FOR match_rec IN
      SELECT m.winner_id
      FROM public.matches m
      WHERE m.group_id = group_uuid
        AND (m.winner_id = member.id OR m.loser_id = member.id)
      ORDER BY m.played_at ASC, m.created_at ASC
    LOOP
      IF match_rec.winner_id = member.id THEN
        running_streak := running_streak + 1;
        IF running_streak > max_streak THEN
          max_streak := running_streak;
        END IF;
      ELSE
        running_streak := 0;
      END IF;
    END LOOP;

    player_id      := member.id;
    display_name   := member.display_name;
    avatar_url     := member.avatar_url;
    current_streak := curr_streak;
    best_streak    := max_streak;

    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;

-- ============================================================================
-- Back-fill profile rows for auth users that pre-date the trigger
-- ============================================================================
INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    split_part(u.email, '@', 1)
  )
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
