-- ============================================
-- Таблица для дедупликации событий аналитики
-- ============================================
-- Хранит уникальные event_id для предотвращения дубликатов

CREATE TABLE IF NOT EXISTS public.analytics_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL, -- Уникальный ID события с клиента
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  override_template_type TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_analytics_events_log_event_id ON public.analytics_events_log(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_log_user_id ON public.analytics_events_log(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_log_event_type ON public.analytics_events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_log_processed ON public.analytics_events_log(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_analytics_events_log_created_at ON public.analytics_events_log(created_at DESC);

-- RLS
ALTER TABLE public.analytics_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to analytics_events_log"
  ON public.analytics_events_log
  USING (true)
  WITH CHECK (true);

-- Комментарий
COMMENT ON TABLE public.analytics_events_log IS 'Лог событий аналитики с дедупликацией по event_id';
COMMENT ON COLUMN public.analytics_events_log.event_id IS 'Уникальный ID события с клиента для предотвращения дубликатов';

