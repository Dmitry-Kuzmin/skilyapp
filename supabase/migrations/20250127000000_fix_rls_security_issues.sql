-- =====================================================
-- Fix RLS Security Issues
-- =====================================================
-- Исправление критических проблем безопасности:
-- 1. Включение RLS для таблиц с пользовательскими данными
-- 2. Добавление RLS для справочных таблиц (read-only)
-- 3. Ограничение доступа к системным логам

-- =====================================================
-- 1. КРИТИЧНО: duel_notifications
-- =====================================================
-- Включаем RLS (политики уже существуют, но RLS был отключен)
ALTER TABLE public.duel_notifications ENABLE ROW LEVEL SECURITY;

-- Проверяем, что политики существуют, если нет - создаем
DO $$
BEGIN
  -- Проверяем политику SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON public.duel_notifications
      FOR SELECT
      USING (
        user_id IN (
          SELECT id FROM public.profiles
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
      );
  END IF;

  -- Проверяем политику INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'System can create notifications'
  ) THEN
    CREATE POLICY "System can create notifications"
      ON public.duel_notifications
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- Проверяем политику UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON public.duel_notifications
      FOR UPDATE
      USING (
        user_id IN (
          SELECT id FROM public.profiles
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
      );
  END IF;
END $$;

-- =====================================================
-- 2. КРИТИЧНО: telegram_link_history
-- =====================================================
ALTER TABLE public.telegram_link_history ENABLE ROW LEVEL SECURITY;

-- Проверяем и создаем политики, если их нет
DO $$
BEGIN
  -- Пользователи могут видеть только свою историю привязок
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'telegram_link_history' 
    AND policyname = 'Users can view their own link history'
  ) THEN
    CREATE POLICY "Users can view their own link history"
      ON public.telegram_link_history
      FOR SELECT
      USING (
        profile_id IN (
          SELECT id FROM public.profiles
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
      );
  END IF;

  -- Только система может создавать записи (через service_role)
  -- Примечание: service_role автоматически обходит RLS, поэтому Edge Functions будут работать
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'telegram_link_history' 
    AND policyname = 'System can create link history'
  ) THEN
    CREATE POLICY "System can create link history"
      ON public.telegram_link_history
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Пользователи не могут обновлять или удалять историю
-- (это делает только система через service_role, который обходит RLS)

-- =====================================================
-- 3. СРЕДНЯЯ КРИТИЧНОСТЬ: cron_job_logs
-- =====================================================
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Проверяем и создаем политику, если её нет
DO $$
BEGIN
  -- Только авторизованные пользователи могут читать логи (read-only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cron_job_logs' 
    AND policyname = 'Authenticated users can read cron logs'
  ) THEN
    CREATE POLICY "Authenticated users can read cron logs"
      ON public.cron_job_logs
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Только service_role может создавать/обновлять логи
-- (это делается через Edge Functions или cron jobs)
-- Примечание: service_role автоматически обходит RLS

-- =====================================================
-- 4. НИЗКАЯ КРИТИЧНОСТЬ: duel_pass_rewards (справочная таблица)
-- =====================================================
ALTER TABLE public.duel_pass_rewards ENABLE ROW LEVEL SECURITY;

-- Проверяем и создаем политику, если её нет
DO $$
BEGIN
  -- Все авторизованные пользователи могут читать награды
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_pass_rewards' 
    AND policyname = 'Authenticated users can read rewards'
  ) THEN
    CREATE POLICY "Authenticated users can read rewards"
      ON public.duel_pass_rewards
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Только service_role может изменять награды
-- (это делается через миграции)
-- Примечание: service_role автоматически обходит RLS, Edge Functions будут работать

-- =====================================================
-- 5. НИЗКАЯ КРИТИЧНОСТЬ: notification_rules (справочная таблица)
-- =====================================================
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- Проверяем и создаем политику, если её нет
DO $$
BEGIN
  -- Все авторизованные пользователи могут читать правила
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_rules' 
    AND policyname = 'Authenticated users can read notification rules'
  ) THEN
    CREATE POLICY "Authenticated users can read notification rules"
      ON public.notification_rules
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Только service_role может изменять правила
-- (это делается через миграции)
-- Примечание: service_role автоматически обходит RLS, Edge Functions будут работать

-- =====================================================
-- 6. НИЗКАЯ КРИТИЧНОСТЬ: bot_tips (справочная таблица)
-- =====================================================
ALTER TABLE public.bot_tips ENABLE ROW LEVEL SECURITY;

-- Проверяем и создаем политику, если её нет
DO $$
BEGIN
  -- Все авторизованные пользователи могут читать советы
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bot_tips' 
    AND policyname = 'Authenticated users can read bot tips'
  ) THEN
    CREATE POLICY "Authenticated users can read bot tips"
      ON public.bot_tips
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Только service_role может изменять советы
-- (это делается через миграции)
-- Примечание: service_role автоматически обходит RLS, Edge Functions будут работать

-- =====================================================
-- 7. НИЗКАЯ КРИТИЧНОСТЬ: bot_guide_sections (справочная таблица)
-- =====================================================
ALTER TABLE public.bot_guide_sections ENABLE ROW LEVEL SECURITY;

-- Проверяем и создаем политику, если её нет
DO $$
BEGIN
  -- Все авторизованные пользователи могут читать гайды
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bot_guide_sections' 
    AND policyname = 'Authenticated users can read bot guides'
  ) THEN
    CREATE POLICY "Authenticated users can read bot guides"
      ON public.bot_guide_sections
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Только service_role может изменять гайды
-- (это делается через миграции)
-- Примечание: service_role автоматически обходит RLS, Edge Functions будут работать

-- =====================================================
-- Комментарии для документации
-- =====================================================
COMMENT ON TABLE public.duel_notifications IS 'Уведомления о дуэлях. RLS включен - пользователи видят только свои уведомления.';
COMMENT ON TABLE public.telegram_link_history IS 'История привязок Telegram. RLS включен - пользователи видят только свою историю.';
COMMENT ON TABLE public.cron_job_logs IS 'Логи выполнения cron задач. RLS включен - только авторизованные пользователи могут читать.';
COMMENT ON TABLE public.duel_pass_rewards IS 'Справочная таблица наград сезона. RLS включен - read-only для всех авторизованных.';
COMMENT ON TABLE public.notification_rules IS 'Справочная таблица правил уведомлений. RLS включен - read-only для всех авторизованных.';
COMMENT ON TABLE public.bot_tips IS 'Справочная таблица советов для бота. RLS включен - read-only для всех авторизованных.';
COMMENT ON TABLE public.bot_guide_sections IS 'Справочная таблица гайдов для бота. RLS включен - read-only для всех авторизованных.';

