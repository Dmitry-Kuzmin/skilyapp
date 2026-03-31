-- =====================================================
-- bot_messages: полная история переписки с ботом
-- direction='in'  — сообщения от пользователя
-- direction='out' — ответы бота (только ИИ)
-- type: 'text' | 'command' | 'callback' | 'ai'
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bot_messages (
  id          bigserial    PRIMARY KEY,
  telegram_id bigint       NOT NULL,
  username    text,
  direction   text         NOT NULL CHECK (direction IN ('in', 'out')),
  type        text         NOT NULL,
  content     text,
  extra       jsonb,
  created_at  timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_messages_telegram_id_idx ON public.bot_messages (telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bot_messages_created_at_idx  ON public.bot_messages (created_at DESC);

ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.bot_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read" ON public.bot_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "anon_read" ON public.bot_messages
  FOR SELECT TO anon USING (true);
