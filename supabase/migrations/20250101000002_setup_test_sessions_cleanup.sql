-- ============================================
-- Настройка автоматической очистки старых незавершенных тестовых сессий
-- Использует pg_cron для ежедневной очистки
-- ============================================
-- 
-- ⚠️ ВАЖНО: pg_cron доступен только на платных планах Supabase (Pro и выше)
-- Если у вас Free план, используйте альтернативный вариант (см. ниже)
-- ============================================

-- Проверяем доступность pg_cron
DO $$
BEGIN
  -- Пробуем включить расширение
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    RAISE NOTICE '✅ pg_cron успешно включен';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '⚠️  pg_cron недоступен. Это нормально для Free плана Supabase.';
    RAISE WARNING '   Используйте альтернативный вариант: ручная очистка или внешний сервис.';
    RETURN;
  END;

  -- Удаляем старую задачу, если существует
  BEGIN
    PERFORM cron.unschedule('cleanup-old-test-sessions');
  EXCEPTION WHEN OTHERS THEN
    -- Игнорируем ошибку, если задача не существует
    NULL;
  END;

  -- Создаем задачу для ежедневной очистки незавершенных сессий старше 24 часов
  -- Запускается каждый день в 03:00 UTC
  BEGIN
    PERFORM cron.schedule(
      'cleanup-abandoned-sessions',
      '0 3 * * *', -- Каждую ночь в 03:00 UTC
      $$
        DELETE FROM public.test_sessions
        WHERE status = 'started'
          AND started_at < NOW() - INTERVAL '24 hours';
        
        -- Также очищаем abandoned сессии старше 7 дней
        DELETE FROM public.test_sessions
        WHERE status = 'abandoned'
          AND updated_at < NOW() - INTERVAL '7 days';
      $$
    );
    RAISE NOTICE '✅ Cron задача cleanup-abandoned-sessions создана';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '⚠️  Не удалось создать cron задачу: %', SQLERRM;
  END;
END $$;

-- Комментарий
COMMENT ON EXTENSION pg_cron IS 'Автоматическая очистка старых тестовых сессий (только для Pro плана и выше)';

-- ============================================
-- АЛЬТЕРНАТИВНЫЙ ВАРИАНТ (для Free плана)
-- ============================================
-- Если pg_cron недоступен, используйте один из вариантов:
--
-- 1. РУЧНАЯ ОЧИСТКА (SQL запрос):
--    DELETE FROM public.test_sessions
--    WHERE status = 'started' AND started_at < NOW() - INTERVAL '24 hours';
--
-- 2. ВНЕШНИЙ СЕРВИС (GitHub Actions, cron-job.org, и т.д.):
--    Вызывайте Edge Function для очистки через HTTP запрос
--
-- 3. ПЕРЕХОД НА PRO ПЛАН:
--    pg_cron будет доступен автоматически

