-- ============================================
-- Настройка Cron Job для автоматического retry начислений Stars Payment
-- ============================================
-- Этот cron job будет запускаться каждые 5 минут и обрабатывать
-- платежи со статусом 'pending', 'failed' или 'retrying'

-- Шаг 1: Установить расширение pg_cron (если еще не установлено)
-- Примечание: pg_cron доступен только на платных планах Supabase (Pro и выше)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Шаг 2: Проверить, не существует ли уже такой cron job
DO $$
BEGIN
  -- Удалить существующий cron job, если есть
  PERFORM cron.unschedule('stars-payment-retry');
EXCEPTION
  WHEN OTHERS THEN
    -- Игнорировать ошибку, если job не существует
    NULL;
END $$;

-- Шаг 3: Создать новый cron job
-- Запускается каждые 5 минут (*/5 * * * *)
SELECT cron.schedule(
  'stars-payment-retry',
  '*/5 * * * *', -- Каждые 5 минут
  $$
  SELECT net.http_post(
    url := 'https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    )
  );
  $$
);

-- Комментарий к cron job
COMMENT ON EXTENSION pg_cron IS 'Cron job для автоматического retry начислений Stars Payment';

