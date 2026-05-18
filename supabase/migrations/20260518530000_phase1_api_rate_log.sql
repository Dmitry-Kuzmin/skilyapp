-- ============================================================
-- Phase 1.4: api_rate_log — универсальный rate limiter
-- ============================================================
-- Используется во всех публичных Edge Functions для защиты от
-- спама/DDoS/перебора. Один общий шейп — одна логика проверки.

CREATE TABLE IF NOT EXISTS public.api_rate_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  ip_hash TEXT,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR ip_hash IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_log_user_action_time
  ON public.api_rate_log(user_id, action, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_rate_log_ip_action_time
  ON public.api_rate_log(ip_hash, action, created_at DESC)
  WHERE ip_hash IS NOT NULL;

ALTER TABLE public.api_rate_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_log FROM anon, authenticated;

-- Автоочистка: записи старше 24 часов не нужны
CREATE OR REPLACE FUNCTION public.cleanup_api_rate_log()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_rate_log
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON TABLE public.api_rate_log IS
  'Rate-limit лог для Edge Functions. Очищается раз в сутки через cleanup_api_rate_log() (запускать через pg_cron).';
