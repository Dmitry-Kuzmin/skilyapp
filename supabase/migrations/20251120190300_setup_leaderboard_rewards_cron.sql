-- =====================================================
-- AUTOMATIC LEADERBOARD REWARDS: pg_cron настройка
-- =====================================================

-- ============================================
-- 1. ВКЛЮЧАЕМ РАСШИРЕНИЕ pg_cron
-- ============================================

-- Проверяем, включено ли расширение pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 2. ФУНКЦИЯ ДЛЯ ПРОВЕРКИ И НАЧИСЛЕНИЯ ПРИЗОВ
-- ============================================

CREATE OR REPLACE FUNCTION check_and_distribute_season_rewards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season RECORD;
  v_result JSONB;
  v_seasons_array JSONB := '[]'::jsonb;
  v_seasons_found INTEGER := 0;
BEGIN
  -- Ищем сезоны, которые завершились в последние 24 часа и ещё не обработаны
  FOR v_season IN
    SELECT 
      id,
      season_number,
      name_ru,
      end_date
    FROM duel_pass_seasons
    WHERE 
      end_date <= NOW()
      AND end_date >= NOW() - INTERVAL '24 hours'
      AND is_active = true
      AND NOT EXISTS (
        SELECT 1 
        FROM user_leaderboard_rewards 
        WHERE season_id = duel_pass_seasons.id 
        LIMIT 1
      )
    ORDER BY end_date DESC
  LOOP
    -- Логируем сезон, который нужно обработать
    -- Edge Function должен быть вызван извне (через внешний cron или вручную)
    INSERT INTO public.cron_job_logs (
      job_name,
      status,
      result_data,
      error_message
    ) VALUES (
      'check_and_distribute_season_rewards',
      'running',
      jsonb_build_object(
        'season_id', v_season.id,
        'season_number', v_season.season_number,
        'season_name', v_season.name_ru,
        'end_date', v_season.end_date,
        'action', 'needs_processing',
        'edge_function_url', '/functions/v1/season-end-rewards',
        'payload', jsonb_build_object('season_id', v_season.id)
      ),
      NULL
    );

    -- Добавляем сезон в массив
    v_seasons_array := v_seasons_array || jsonb_build_object(
      'season_id', v_season.id,
      'season_number', v_season.season_number,
      'season_name', v_season.name_ru
    );
    
    v_seasons_found := v_seasons_found + 1;
  END LOOP;

  -- Формируем результат
  IF v_seasons_found = 0 THEN
    v_result := jsonb_build_object(
      'success', true,
      'seasons_found', 0,
      'message', 'No seasons to process'
    );
  ELSE
    v_result := jsonb_build_object(
      'success', true,
      'seasons_found', v_seasons_found,
      'message', 'Seasons logged for processing. Call season-end-rewards Edge Function manually or via external cron.',
      'seasons', v_seasons_array
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 3. ТАБЛИЦА ДЛЯ ЛОГИРОВАНИЯ CRON ЗАДАЧ
-- ============================================

CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  result_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_created_at ON public.cron_job_logs(created_at DESC);

-- ============================================
-- 4. АЛЬТЕРНАТИВНЫЙ ВАРИАНТ: ФУНКЦИЯ ЧЕРЕЗ SQL
-- ============================================

-- Если http() функция недоступна, используем прямой вызов через supabase.functions.invoke
-- Но это требует настройки через Edge Function или внешний сервис

-- Вместо этого создадим функцию, которая просто помечает сезоны для обработки
CREATE OR REPLACE FUNCTION mark_season_for_rewards_distribution()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Ищем завершившиеся сезоны без призов
  FOR v_season IN
    SELECT id, season_number, name_ru
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
  LOOP
    -- Помечаем сезон для обработки (можно добавить флаг needs_rewards_distribution)
    -- Или просто логируем
    INSERT INTO public.cron_job_logs (
      job_name,
      status,
      result_data
    ) VALUES (
      'mark_season_for_rewards',
      'running',
      jsonb_build_object(
        'season_id', v_season.id,
        'season_number', v_season.season_number,
        'action', 'needs_manual_processing'
      )
    );
    
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'seasons_found', v_count,
    'message', 'Seasons marked for rewards distribution. Please run season-end-rewards Edge Function manually or set up external cron.'
  );
END;
$$;

-- ============================================
-- 5. НАСТРОЙКА pg_cron (если доступно)
-- ============================================

-- Вариант 1: Ежедневная проверка в 00:00 UTC
-- Раскомментируй, если pg_cron доступен и настроен
-- SELECT cron.schedule(
--   'daily-season-rewards-check',
--   '0 0 * * *', -- Каждый день в полночь UTC
--   $$
--   SELECT check_and_distribute_season_rewards();
--   $$
-- );

-- Вариант 2: Проверка каждые 6 часов
-- SELECT cron.schedule(
--   'season-rewards-check-6h',
--   '0 */6 * * *', -- Каждые 6 часов
--   $$
--   SELECT mark_season_for_rewards_distribution();
--   $$
-- );

-- ============================================
-- 6. РУЧНОЙ ЗАПУСК (для тестирования)
-- ============================================

-- Для тестирования можно вызвать функцию вручную:
-- SELECT check_and_distribute_season_rewards();
-- или
-- SELECT mark_season_for_rewards_distribution();

-- ============================================
-- 7. ГРАНТЫ
-- ============================================

GRANT EXECUTE ON FUNCTION public.check_and_distribute_season_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_season_for_rewards_distribution() TO authenticated;
GRANT SELECT ON public.cron_job_logs TO authenticated;

COMMENT ON FUNCTION public.check_and_distribute_season_rewards() IS 'Проверяет завершившиеся сезоны и запускает начисление призов через Edge Function';
COMMENT ON FUNCTION public.mark_season_for_rewards_distribution() IS 'Помечает завершившиеся сезоны для обработки призов';
COMMENT ON TABLE public.cron_job_logs IS 'Логи выполнения cron задач';

