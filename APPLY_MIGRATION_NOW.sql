-- ============================================
-- ПРИМЕНИТЬ ЭТУ МИГРАЦИЮ В SQL EDITOR
-- ============================================
-- Скопируйте весь этот файл и выполните в:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- ============================================

-- Исправление RLS политики для уведомлений для работы Realtime в Telegram WebApp
-- Проблема: CHANNEL_ERROR из-за сложных RLS политик с подзапросами
-- Решение: использовать SECURITY DEFINER функцию для получения profile_id

-- ============================================
-- 1. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ PROFILE_ID
-- ============================================

-- Удаляем старую функцию, если есть
DROP FUNCTION IF EXISTS get_user_profile_id_for_notifications();

-- Создаем функцию с SECURITY DEFINER для работы с Telegram пользователями
CREATE OR REPLACE FUNCTION get_user_profile_id_for_notifications()
RETURNS uuid AS $$
DECLARE
  v_profile_id uuid;
  v_telegram_id bigint;
BEGIN
  -- Пытаемся получить telegram_id из JWT claims
  BEGIN
    v_telegram_id := (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint;
  EXCEPTION WHEN OTHERS THEN
    v_telegram_id := NULL;
  END;
  
  -- Ищем profile по user_id (для веб-пользователей) или telegram_id (для Telegram)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE (auth.uid() IS NOT NULL AND user_id = auth.uid())
     OR (v_telegram_id IS NOT NULL AND telegram_id = v_telegram_id)
  LIMIT 1;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ
-- ============================================

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Создаем простую политику с использованием функции
-- Функция с SECURITY DEFINER позволяет обойти проблемы с подзапросами в Realtime
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id_for_notifications());

-- ============================================
-- 3. ВКЛЮЧЕНИЕ REALTIME
-- ============================================

-- Убеждаемся, что таблица добавлена в Realtime publication
DO $$
BEGIN
  -- Удаляем из publication, если есть (для чистоты)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE duel_notifications;
  EXCEPTION WHEN OTHERS THEN
    -- Игнорируем ошибку, если таблицы нет в publication
    NULL;
  END;
  
  -- Добавляем в publication
  ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  
  RAISE NOTICE '✅ Table duel_notifications added to supabase_realtime publication';
END $$;

-- ============================================
-- 4. ПРОВЕРКА
-- ============================================

-- Проверяем, что политика создана
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    RAISE NOTICE '✅ Notifications RLS policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Notifications RLS policy not found';
  END IF;
  
  -- Проверяем, что таблица в publication
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'duel_notifications'
  ) THEN
    RAISE NOTICE '✅ Table duel_notifications is in supabase_realtime publication';
  ELSE
    RAISE WARNING '⚠️ Table duel_notifications is NOT in supabase_realtime publication';
  END IF;
END $$;

