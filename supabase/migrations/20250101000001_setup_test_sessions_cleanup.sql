-- ============================================
-- Настройка автоматической очистки старых незавершенных тестовых сессий
-- Использует pg_cron для ежедневной очистки
-- ============================================

-- Включаем расширение pg_cron (если еще не включено)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Удаляем старую задачу, если существует
SELECT cron.unschedule('cleanup-old-test-sessions');

-- Создаем задачу для ежедневной очистки незавершенных сессий старше 24 часов
-- Запускается каждый день в 03:00 UTC
SELECT cron.schedule(
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

-- Комментарий
COMMENT ON EXTENSION pg_cron IS 'Автоматическая очистка старых тестовых сессий';

