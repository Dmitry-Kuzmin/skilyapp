-- =====================================================
-- АВТОМАТИЧЕСКОЕ РАСПРЕДЕЛЕНИЕ ПРИЗОВ: Полная настройка
-- =====================================================
-- 
-- Этот файл настраивает автоматическое распределение призов
-- для завершившихся сезонов через pg_cron
--
-- ВАЖНО: pg_cron может вызывать только SQL функции, не Edge Functions напрямую.
-- Поэтому мы используем комбинированный подход:
-- 1. pg_cron вызывает SQL функцию, которая логирует сезоны
-- 2. Внешний сервис (или ручной вызов) читает логи и вызывает Edge Function
--
-- Альтернатива: Используй GitHub Actions (см. .github/workflows/season-rewards.yml)

-- ============================================
-- 1. ПРОВЕРКА pg_cron
-- ============================================

-- Проверяем, доступно ли расширение pg_cron
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '⚠️  pg_cron не установлен. Установи его через Supabase Dashboard → Database → Extensions';
    RAISE NOTICE '   Или используй альтернативу через GitHub Actions (см. .github/workflows/season-rewards.yml)';
  ELSE
    RAISE NOTICE '✅ pg_cron установлен и доступен';
  END IF;
END $$;

-- ============================================
-- 2. УЛУЧШЕННАЯ ФУНКЦИЯ ДЛЯ ЛОГИРОВАНИЯ СЕЗОНОВ
-- ============================================

CREATE OR REPLACE FUNCTION check_and_log_ended_seasons()
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
  -- Ищем сезоны, которые завершились и ещё не обработаны
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
    -- Логируем сезон для обработки
    INSERT INTO public.cron_job_logs (
      job_name,
      status,
      result_data,
      error_message
    ) VALUES (
      'check_and_log_ended_seasons',
      'pending',
      jsonb_build_object(
        'season_id', v_season.id,
        'season_number', v_season.season_number,
        'season_name', v_season.name_ru,
        'end_date', v_season.end_date,
        'start_date', v_season.start_date,
        'action', 'needs_processing',
        'edge_function_url', '/functions/v1/season-end-rewards',
        'payload', jsonb_build_object('season_id', v_season.id),
        'instructions', 'Call Edge Function season-end-rewards with this season_id to distribute rewards'
      ),
      NULL
    );

    -- Добавляем сезон в массив
    v_seasons_array := v_seasons_array || jsonb_build_object(
      'season_id', v_season.id,
      'season_number', v_season.season_number,
      'season_name', v_season.name_ru,
      'end_date', v_season.end_date
    );
    
    v_seasons_found := v_seasons_found + 1;
  END LOOP;

  -- Формируем результат
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
      'next_step', 'Call Edge Function season-end-rewards for each season_id, or set up external cron (GitHub Actions)'
    );
  END IF;
END;
$$;

-- ============================================
-- 3. НАСТРОЙКА pg_cron (если доступно)
-- ============================================

-- Удаляем старую задачу, если существует
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-season-rewards-check') THEN
    PERFORM cron.unschedule('daily-season-rewards-check');
    RAISE NOTICE '✅ Удалена старая задача daily-season-rewards-check';
  END IF;
END $$;

-- Создаём новую задачу (еженедельно, каждое воскресенье в полночь UTC)
-- Это оптимально для месячных сезонов (30 дней)
-- Используем отдельный блок для вызова cron.schedule, чтобы избежать конфликта с $$
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Используем $cron$ как тег для строки, чтобы избежать конфликта с $$
    PERFORM cron.schedule(
      'weekly-season-rewards-check',
      '0 0 * * 0', -- Каждое воскресенье в полночь UTC
      $cron$SELECT check_and_log_ended_seasons();$cron$
    );
    RAISE NOTICE '✅ Создана задача weekly-season-rewards-check (каждое воскресенье в 00:00 UTC)';
  ELSE
    RAISE NOTICE '⚠️  pg_cron недоступен. Используй альтернативу через GitHub Actions';
  END IF;
END $$;

-- ============================================
-- 4. ФУНКЦИЯ ДЛЯ РУЧНОГО ЗАПУСКА
-- ============================================

CREATE OR REPLACE FUNCTION manual_check_seasons()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN check_and_log_ended_seasons();
END;
$$;

-- ============================================
-- 5. ГРАНТЫ
-- ============================================

GRANT EXECUTE ON FUNCTION public.check_and_log_ended_seasons() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_check_seasons() TO authenticated;
GRANT SELECT ON public.cron_job_logs TO authenticated;

COMMENT ON FUNCTION public.check_and_log_ended_seasons() IS 'Проверяет завершившиеся сезоны и логирует их для обработки призов. Вызывается автоматически через pg_cron или вручную.';
COMMENT ON FUNCTION public.manual_check_seasons() IS 'Ручной запуск проверки завершившихся сезонов. Возвращает список сезонов, требующих обработки.';

-- ============================================
-- 6. ИНСТРУКЦИИ ПО ИСПОЛЬЗОВАНИЮ
-- ============================================

-- Для проверки завершившихся сезонов вручную:
-- SELECT manual_check_seasons();

-- Для просмотра логов:
-- SELECT * FROM cron_job_logs 
-- WHERE job_name = 'check_and_log_ended_seasons'
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- Для просмотра созданных cron задач:
-- SELECT jobid, jobname, schedule, active, command 
-- FROM cron.job 
-- WHERE jobname = 'weekly-season-rewards-check';

-- Для просмотра истории выполнения:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-season-rewards-check')
-- ORDER BY start_time DESC 
-- LIMIT 10;

