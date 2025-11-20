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
  v_http_response http_response;
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
    -- Вызываем Edge Function через http
    -- Используем supabase_functions.http_request для вызова Edge Function
    SELECT * INTO v_http_response
    FROM http((
      'POST',
      current_setting('app.settings.supabase_url') || '/functions/v1/season-end-rewards',
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
      ],
      'application/json',
      json_build_object('season_id', v_season.id)::text
    )::http_request);

    -- Логируем результат
    INSERT INTO public.cron_job_logs (
      job_name,
      status,
      result_data,
      error_message
    ) VALUES (
      'check_and_distribute_season_rewards',
      CASE WHEN v_http_response.status = 200 THEN 'success' ELSE 'error' END,
      jsonb_build_object(
        'season_id', v_season.id,
        'season_number', v_season.season_number,
        'http_status', v_http_response.status,
        'response', v_http_response.content
      ),
      CASE WHEN v_http_response.status != 200 THEN v_http_response.content ELSE NULL END
    );

    -- Обновляем статус сезона (делаем неактивным после обработки)
    UPDATE duel_pass_seasons
    SET is_active = false
    WHERE id = v_season.id;

    v_result := jsonb_build_object(
      'success', true,
      'season_id', v_season.id,
      'season_number', v_season.season_number,
      'processed', true
    );
  END LOOP;

  -- Если не нашли сезонов для обработки
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'success', true,
      'message', 'No seasons to process'
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

