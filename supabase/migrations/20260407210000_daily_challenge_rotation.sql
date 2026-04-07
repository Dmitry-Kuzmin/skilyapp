-- ============================================================
-- Daily Challenge Auto-Rotation
-- Runs daily at 00:01 UTC — deactivates expired challenges and
-- creates fresh ones for the active season.
-- ============================================================

-- ============================================================
-- Function: rotate_daily_season_challenges()
-- ============================================================
CREATE OR REPLACE FUNCTION rotate_daily_season_challenges()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season   RECORD;
  v_today    date := CURRENT_DATE;
  v_tomorrow date := CURRENT_DATE + INTERVAL '1 day';
  v_count    int  := 0;
BEGIN
  -- 1. Deactivate challenges whose start_date is before today
  UPDATE season_challenges
  SET is_active = false
  WHERE is_active = true
    AND start_date < v_today;

  -- 2. For each active season, create today's daily challenges if missing
  FOR v_season IN
    SELECT id FROM duel_pass_seasons WHERE is_active = true
  LOOP
    -- Only insert if today's batch doesn't exist yet
    IF NOT EXISTS (
      SELECT 1 FROM season_challenges
      WHERE season_id       = v_season.id
        AND challenge_type  = 'daily'
        AND start_date      = v_today
    ) THEN
      INSERT INTO season_challenges
        (season_id, challenge_type, title_ru, description_ru, target_type, target_value, reward_sp, reward_coins, start_date, end_date, is_active)
      VALUES
        (v_season.id, 'daily', '3 идеальных теста',  'Пройди 3 теста без ошибок за день', 'tests_perfect', 3,   25, 10, v_today, v_tomorrow, true),
        (v_season.id, 'daily', '100 SP за день',      'Набери 100 Season Points за день',  'sp_earned',    100,  15,  5, v_today, v_tomorrow, true),
        (v_season.id, 'daily', 'Выиграй 1 дуэль',    'Победи соперника в дуэли',          'duels_won',    1,    30, 15, v_today, v_tomorrow, true);

      v_count := v_count + 3;
    END IF;
  END LOOP;

  RETURN 'rotated: deactivated old, created ' || v_count || ' new challenges at ' || NOW();
END;
$$;

-- ============================================================
-- pg_cron: run daily challenge rotation at 00:01 UTC
-- ============================================================
SELECT cron.schedule(
  'daily-challenge-rotation',
  '1 0 * * *',
  $$SELECT rotate_daily_season_challenges()$$
);
