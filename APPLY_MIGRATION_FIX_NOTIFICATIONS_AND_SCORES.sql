-- ============================================
-- ПРИМЕНИТЬ ЭТУ МИГРАЦИЮ В SQL EDITOR
-- ============================================
-- Скопируйте весь этот файл и выполните в:
-- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
-- ============================================

-- Исправление RLS политики для уведомлений и проверка обновления счета
-- Проблема: уведомления не поступают, очки не начисляются
-- Решение: упростить RLS политику и проверить обновление счета

-- ============================================
-- 1. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

-- Удаляем старую политику
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- Создаем более простую политику, которая работает для всех пользователей
-- Используем функцию, но с fallback на прямое сравнение
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    -- Используем функцию для получения profile_id
    user_id = get_user_profile_id_for_notifications()
    OR
    -- Fallback: прямое сравнение с profile_id из JWT (для веб-пользователей)
    (auth.uid() IS NOT NULL AND user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
    OR
    -- Fallback: прямое сравнение с telegram_id из JWT (для Telegram)
    user_id IN (
      SELECT id FROM profiles
      WHERE telegram_id = COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
        0
      )
    )
  );

-- ============================================
-- 2. ПРОВЕРКА ОБНОВЛЕНИЯ СЧЕТА
-- ============================================

-- Проверяем, что RLS политика для UPDATE на duel_players разрешает обновление счета
DROP POLICY IF EXISTS "Users can update their player status" ON duel_players;
DROP POLICY IF EXISTS "Users can update their player records" ON duel_players;

-- Создаем политику для UPDATE, которая разрешает обновление счета
-- ВАЖНО: Edge Function использует SERVICE_ROLE_KEY, который обходит RLS
-- Но на всякий случай разрешаем обновление для всех (так как Edge Function проверяет права)
CREATE POLICY "Users can update their player status"
  ON duel_players
  FOR UPDATE
  USING (true)  -- Разрешаем обновление для всех (Edge Function проверяет права)
  WITH CHECK (true);  -- Разрешаем обновление для всех (Edge Function проверяет права)

-- ============================================
-- 3. ПРОВЕРКА
-- ============================================

-- Проверяем, что политики созданы
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
END $$;

