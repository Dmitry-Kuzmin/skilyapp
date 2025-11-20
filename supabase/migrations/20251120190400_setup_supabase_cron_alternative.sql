-- =====================================================
-- АЛЬТЕРНАТИВНЫЙ ВАРИАНТ: Использование Supabase Edge Functions Cron
-- =====================================================

-- Если pg_cron недоступен, можно использовать внешний сервис для cron
-- или настроить через Supabase Dashboard -> Database -> Cron Jobs

-- ============================================
-- 1. ПРОСТАЯ ФУНКЦИЯ ДЛЯ ВЫЗОВА ИЗ CRON
-- ============================================

-- Эта функция будет вызываться из внешнего cron (например, через GitHub Actions, Vercel Cron, или Supabase Cron)
CREATE OR REPLACE FUNCTION process_ended_seasons()
RETURNS TABLE (
  season_id INTEGER,
  season_number INTEGER,
  season_name TEXT,
  needs_processing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.season_number,
    s.name_ru,
    NOT EXISTS (
      SELECT 1 
      FROM user_leaderboard_rewards ulr
      WHERE ulr.season_id = s.id
      LIMIT 1
    ) as needs_processing
  FROM duel_pass_seasons s
  WHERE 
    s.end_date <= NOW()
    AND s.is_active = true
    AND NOT EXISTS (
      SELECT 1 
      FROM user_leaderboard_rewards ulr
      WHERE ulr.season_id = s.id
      LIMIT 1
    )
  ORDER BY s.end_date DESC;
END;
$$;

-- ============================================
-- 2. ФУНКЦИЯ ДЛЯ РУЧНОГО ЗАПУСКА
-- ============================================

CREATE OR REPLACE FUNCTION trigger_season_rewards_processing(p_season_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season RECORD;
  v_result JSONB;
BEGIN
  -- Проверяем, что сезон существует и завершился
  SELECT * INTO v_season
  FROM duel_pass_seasons
  WHERE id = p_season_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Season not found'
    );
  END IF;

  IF v_season.end_date > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Season has not ended yet',
      'end_date', v_season.end_date
    );
  END IF;

  -- Проверяем, не обработан ли уже сезон
  IF EXISTS (
    SELECT 1 
    FROM user_leaderboard_rewards 
    WHERE season_id = p_season_id 
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Season rewards already distributed'
    );
  END IF;

  -- Помечаем сезон для обработки
  -- Edge Function должен быть вызван вручную или через внешний cron
  RETURN jsonb_build_object(
    'success', true,
    'season_id', p_season_id,
    'season_number', v_season.season_number,
    'message', 'Season marked for processing. Call season-end-rewards Edge Function with this season_id.',
    'edge_function_url', '/functions/v1/season-end-rewards',
    'payload', jsonb_build_object('season_id', p_season_id)
  );
END;
$$;

-- ============================================
-- 3. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОЙ ОБРАБОТКИ (альтернатива)
-- ============================================

-- Создаём функцию-триггер, которая будет вызываться при обновлении сезона
CREATE OR REPLACE FUNCTION on_season_end_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Если сезон завершился (end_date <= NOW() и is_active = false)
  IF NEW.end_date <= NOW() AND NEW.is_active = false AND OLD.is_active = true THEN
    -- Логируем событие
    INSERT INTO cron_job_logs (
      job_name,
      status,
      result_data
    ) VALUES (
      'season_end_trigger',
      'running',
      jsonb_build_object(
        'season_id', NEW.id,
        'season_number', NEW.season_number,
        'action', 'season_ended',
        'message', 'Season ended. Rewards should be distributed via Edge Function.'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Создаём триггер
DROP TRIGGER IF EXISTS trigger_season_end_check ON duel_pass_seasons;
CREATE TRIGGER trigger_season_end_check
  AFTER UPDATE ON duel_pass_seasons
  FOR EACH ROW
  EXECUTE FUNCTION on_season_end_check();

-- ============================================
-- 4. ГРАНТЫ
-- ============================================

GRANT EXECUTE ON FUNCTION public.process_ended_seasons() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_season_rewards_processing(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.process_ended_seasons() IS 'Возвращает список завершившихся сезонов, требующих обработки призов';
COMMENT ON FUNCTION public.trigger_season_rewards_processing(INTEGER) IS 'Помечает конкретный сезон для обработки призов';

