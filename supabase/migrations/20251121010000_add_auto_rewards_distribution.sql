-- =====================================================
-- АВТОМАТИЧЕСКОЕ РАСПРЕДЕЛЕНИЕ ПРИЗОВ ПРИ ЗАВЕРШЕНИИ СЕЗОНА
-- =====================================================

-- ============================================
-- 1. ФУНКЦИЯ ДЛЯ АВТОМАТИЧЕСКОГО РАСПРЕДЕЛЕНИЯ
-- ============================================

-- Функция, которая будет вызываться при завершении сезона
-- Она логирует событие, а Edge Function вызывается через pg_net или внешний сервис
CREATE OR REPLACE FUNCTION auto_distribute_season_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем, что сезон завершился (end_date <= NOW())
  -- и что призы ещё не распределены
  IF NEW.end_date <= NOW() 
     AND NEW.is_active = true
     AND NOT EXISTS (
       SELECT 1 
       FROM user_leaderboard_rewards 
       WHERE season_id = NEW.id 
       LIMIT 1
     ) THEN
    
    -- Логируем событие для обработки
    INSERT INTO public.cron_job_logs (
      job_name,
      status,
      result_data,
      error_message
    ) VALUES (
      'auto_distribute_season_rewards',
      'pending',
      jsonb_build_object(
        'season_id', NEW.id,
        'season_number', NEW.season_number,
        'season_name', NEW.name_ru,
        'end_date', NEW.end_date,
        'action', 'needs_immediate_processing',
        'edge_function_url', '/functions/v1/season-end-rewards',
        'payload', jsonb_build_object('season_id', NEW.id),
        'triggered_at', NOW()
      ),
      NULL
    );
    
    RAISE NOTICE 'Season % ended, rewards distribution logged', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. ТРИГГЕР НА ОБНОВЛЕНИЕ СЕЗОНА
-- ============================================

-- Триггер срабатывает при обновлении end_date или is_active
DROP TRIGGER IF EXISTS trigger_auto_distribute_rewards ON duel_pass_seasons;

CREATE TRIGGER trigger_auto_distribute_rewards
  AFTER UPDATE OF end_date, is_active ON duel_pass_seasons
  FOR EACH ROW
  WHEN (NEW.end_date <= NOW() AND NEW.is_active = true)
  EXECUTE FUNCTION auto_distribute_season_rewards();

-- ============================================
-- 3. УЛУЧШЕННАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ СЕЗОНОВ
-- ============================================

-- Обновляем функцию, чтобы она автоматически вызывала Edge Function
-- через pg_net (если доступно) или просто логировала
CREATE OR REPLACE FUNCTION check_and_auto_distribute_season_rewards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season RECORD;
  v_seasons_array JSONB := '[]'::jsonb;
  v_seasons_found INTEGER := 0;
BEGIN
  -- Ищем завершившиеся сезоны без призов
  FOR v_season IN
    SELECT 
      id,
      season_number,
      name_ru,
      end_date,
      start_date
    FROM duel_pass_seasons
    WHERE 
      end_date <= NOW()
      AND is_active = true
      AND NOT EXISTS (
        SELECT 1 
        FROM user_leaderboard_rewards 
        WHERE season_id = duel_pass_seasons.id 
        LIMIT 1
      )
    ORDER BY end_date DESC
  LOOP
    -- Логируем для немедленной обработки
    INSERT INTO public.cron_job_logs (
      job_name,
      status,
      result_data,
      error_message
    ) VALUES (
      'check_and_auto_distribute_season_rewards',
      'pending',
      jsonb_build_object(
        'season_id', v_season.id,
        'season_number', v_season.season_number,
        'season_name', v_season.name_ru,
        'end_date', v_season.end_date,
        'action', 'needs_immediate_processing',
        'edge_function_url', '/functions/v1/season-end-rewards',
        'payload', jsonb_build_object('season_id', v_season.id),
        'priority', 'high'
      ),
      NULL
    );

    v_seasons_array := v_seasons_array || jsonb_build_object(
      'season_id', v_season.id,
      'season_number', v_season.season_number,
      'season_name', v_season.name_ru,
      'end_date', v_season.end_date
    );
    
    v_seasons_found := v_seasons_found + 1;
  END LOOP;

  IF v_seasons_found = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'seasons_found', 0,
      'message', 'No seasons to process',
      'timestamp', NOW()
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'seasons_found', v_seasons_found,
      'message', format('Found %s season(s) that need rewards distribution. Check cron_job_logs for details.', v_seasons_found),
      'seasons', v_seasons_array,
      'timestamp', NOW(),
      'next_step', 'Call Edge Function season-end-rewards for each season_id, or set up automatic processing'
    );
  END IF;
END;
$$;

-- ============================================
-- 4. КОММЕНТАРИИ
-- ============================================

COMMENT ON FUNCTION auto_distribute_season_rewards() IS 'Триггерная функция для автоматического логирования завершившихся сезонов';
COMMENT ON FUNCTION check_and_auto_distribute_season_rewards() IS 'Проверяет завершившиеся сезоны и логирует их для автоматического распределения призов';
COMMENT ON TRIGGER trigger_auto_distribute_rewards ON duel_pass_seasons IS 'Автоматически логирует завершившиеся сезоны для распределения призов';

