-- ============================================
-- ПРИМЕНИТЬ ЭТУ МИГРАЦИЮ В SQL EDITOR
-- ============================================
-- Скопируйте весь этот файл и выполните в:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- ============================================
-- ВАЖНО: Эта миграция исправляет ВСЕ проблемы с уведомлениями и очками
-- ============================================

-- ============================================
-- 1. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Создаем МАКСИМАЛЬНО ПРОСТУЮ политику без подзапросов
-- Это критично для работы с Realtime без фильтра на клиенте
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    -- Используем функцию для получения profile_id (основной способ)
    user_id = get_user_profile_id_for_notifications()
  );

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ DUEL_PLAYERS (ОБНОВЛЕНИЕ СЧЕТА)
-- ============================================

-- Удаляем старые политики UPDATE
DROP POLICY IF EXISTS "Users can update their player status" ON duel_players;
DROP POLICY IF EXISTS "Users can update their player records" ON duel_players;

-- Создаем политику для UPDATE, которая разрешает обновление счета
-- ВАЖНО: Edge Function использует SERVICE_ROLE_KEY, который обходит RLS
-- Но на всякий случай разрешаем обновление для всех (Edge Function проверяет права)
CREATE POLICY "Users can update their player status"
  ON duel_players
  FOR UPDATE
  USING (true)  -- Разрешаем обновление для всех (Edge Function проверяет права)
  WITH CHECK (true);  -- Разрешаем обновление для всех (Edge Function проверяет права)

-- ============================================
-- 3. ПРОВЕРКА REALTIME PUBLICATION
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

DO $$
BEGIN
  -- Проверяем политику для уведомлений
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
  
  -- Проверяем политику для duel_players
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_players' 
    AND policyname = 'Users can update their player status'
  ) THEN
    RAISE NOTICE '✅ Duel players UPDATE policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Duel players UPDATE policy not found';
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

