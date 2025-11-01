-- Fix RLS policies for duel_questions - restrict to players only
DROP POLICY IF EXISTS "Anyone can view duel questions" ON duel_questions;
CREATE POLICY "Players can view their duel questions"
  ON duel_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duel_players
      WHERE duel_players.duel_id = duel_questions.duel_id
        AND duel_players.user_id IN (
          SELECT id FROM profiles 
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
    )
  );

-- Fix RLS policies for duel_answers - restrict to players only
DROP POLICY IF EXISTS "Anyone can view duel answers" ON duel_answers;
CREATE POLICY "Players can view duel answers"
  ON duel_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duel_players
      WHERE duel_players.duel_id = duel_answers.duel_id
        AND duel_players.user_id IN (
          SELECT id FROM profiles 
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
    )
  );

-- Create function to increment profile values
CREATE OR REPLACE FUNCTION public.increment_profile_value(
  p_profile_id UUID,
  p_column TEXT,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    p_column, p_column
  )
  USING p_amount, p_profile_id;
END;
$$;

-- Create function to upsert duel stats
CREATE OR REPLACE FUNCTION public.upsert_duel_stats(
  p_user_id UUID,
  p_is_win BOOLEAN,
  p_is_draw BOOLEAN,
  p_score INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO duel_stats (
    user_id, total_duels, wins, draws, losses, 
    total_points, current_streak, best_streak, avg_score
  )
  VALUES (
    p_user_id, 1,
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    CASE WHEN p_is_draw THEN 1 ELSE 0 END,
    CASE WHEN NOT p_is_win AND NOT p_is_draw THEN 1 ELSE 0 END,
    p_score,
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    p_score
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_duels = duel_stats.total_duels + 1,
    wins = duel_stats.wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    draws = duel_stats.draws + CASE WHEN p_is_draw THEN 1 ELSE 0 END,
    losses = duel_stats.losses + CASE WHEN NOT p_is_win AND NOT p_is_draw THEN 1 ELSE 0 END,
    total_points = duel_stats.total_points + p_score,
    current_streak = CASE 
      WHEN p_is_win THEN duel_stats.current_streak + 1 
      ELSE 0 
    END,
    best_streak = GREATEST(
      duel_stats.best_streak,
      CASE WHEN p_is_win THEN duel_stats.current_streak + 1 ELSE 0 END
    ),
    avg_score = (duel_stats.total_points + p_score)::numeric / (duel_stats.total_duels + 1),
    updated_at = NOW();
END;
$$;