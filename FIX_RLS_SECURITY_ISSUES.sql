-- ============================================
-- ИСПРАВЛЕНИЕ ОШИБОК БЕЗОПАСНОСТИ RLS
-- ============================================
-- Выполните этот скрипт в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- ============================================

-- 1. ИСПРАВЛЕНИЕ: duel_notifications
-- Включаем RLS (если был отключен)
ALTER TABLE public.duel_notifications ENABLE ROW LEVEL SECURITY;

-- Убеждаемся, что политики существуют (если нет - создадим)
DO $$
BEGIN
  -- Политика SELECT
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
          SELECT id FROM profiles
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
      );
  END IF;

  -- Политика INSERT
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

  -- Политика UPDATE
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
          SELECT id FROM profiles
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
      );
  END IF;
END $$;

-- 2. ИСПРАВЛЕНИЕ: duel_pass_rewards
-- Включаем RLS
ALTER TABLE public.duel_pass_rewards ENABLE ROW LEVEL SECURITY;

-- Создаем политики для duel_pass_rewards
-- Все пользователи могут видеть награды (это справочная информация)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_pass_rewards' 
    AND policyname = 'Anyone can view duel pass rewards'
  ) THEN
    CREATE POLICY "Anyone can view duel pass rewards"
      ON public.duel_pass_rewards
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- 3. ПРОВЕРКА: Убеждаемся, что RLS включен
DO $$
DECLARE
  rls_enabled_notifications boolean;
  rls_enabled_rewards boolean;
BEGIN
  SELECT relrowsecurity INTO rls_enabled_notifications
  FROM pg_class
  WHERE relname = 'duel_notifications' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  SELECT relrowsecurity INTO rls_enabled_rewards
  FROM pg_class
  WHERE relname = 'duel_pass_rewards' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  RAISE NOTICE 'RLS для duel_notifications: %', CASE WHEN rls_enabled_notifications THEN 'ВКЛЮЧЕН' ELSE 'ОТКЛЮЧЕН' END;
  RAISE NOTICE 'RLS для duel_pass_rewards: %', CASE WHEN rls_enabled_rewards THEN 'ВКЛЮЧЕН' ELSE 'ОТКЛЮЧЕН' END;
END $$;

-- ============================================
-- ГОТОВО! После выполнения проверьте Security Advisor
-- ============================================

