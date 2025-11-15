-- ============================================
-- Скрипт для настройки Cron Job Stars Payment Retry
-- ============================================
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Шаг 1: Проверить доступность pg_cron
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Если расширение не установлено, выполните:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- ⚠️ ВАЖНО: pg_cron доступен только на платных планах Supabase (Pro и выше)
-- Если у вас Free план, используйте альтернативный вариант (см. ниже)

-- Шаг 2: Проверить существующие cron jobs
SELECT * FROM cron.job WHERE jobname = 'stars-payment-retry';

-- Шаг 3: Удалить существующий cron job (если нужно пересоздать)
-- SELECT cron.unschedule('stars-payment-retry');

-- Шаг 4: Создать cron job для автоматического retry
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

-- Шаг 5: Проверить, что cron job создан
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'stars-payment-retry';

-- ============================================
-- Альтернативный вариант (если pg_cron недоступен)
-- ============================================
-- Если у вас Free план Supabase, используйте внешний сервис для cron:
-- 
-- 1. GitHub Actions (бесплатно)
-- 2. Cron-job.org (бесплатно)
-- 3. EasyCron (бесплатно до 1 job)
-- 4. Supabase Edge Function + внешний cron
--
-- Пример запроса для внешнего cron:
-- POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry
-- Headers: Authorization: Bearer YOUR_ANON_KEY
--
-- Расписание: каждые 5 минут (*/5 * * * *)

