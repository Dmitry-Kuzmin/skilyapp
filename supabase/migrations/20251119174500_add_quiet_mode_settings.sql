-- =====================================================
-- Quiet mode & importance settings for notifications
-- =====================================================

ALTER TABLE public.user_notification_settings
  ADD COLUMN IF NOT EXISTS quiet_mode_until timestamptz,
  ADD COLUMN IF NOT EXISTS only_important boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_quiet_mode
  ON public.user_notification_settings(quiet_mode_until)
  WHERE quiet_mode_until IS NOT NULL;

-- Расширяем дефолтный список категорий (включаем progress/system/monetization/premium)
ALTER TABLE public.user_notification_settings
  ALTER COLUMN categories_enabled
  SET DEFAULT '["duel","progress","motivation","educational","system","monetization","premium","daily"]'::jsonb;

UPDATE public.user_notification_settings
SET categories_enabled = '["duel","progress","motivation","educational","system","monetization","premium","daily"]'::jsonb
WHERE categories_enabled::text = '["duel", "daily", "motivation", "educational"]';



