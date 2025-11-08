-- Упрощение RLS политики для уведомлений
-- Проблема: mismatch between server and client bindings
-- Решение: максимально упростить RLS политику для работы с Realtime

-- ============================================
-- 1. УДАЛЕНИЕ СТАРОЙ ПОЛИТИКИ
-- ============================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- ============================================
-- 2. СОЗДАНИЕ ПРОСТОЙ RLS ПОЛИТИКИ
-- ============================================

-- Создаем максимально простую политику, которая работает для всех пользователей
-- RLS будет фильтровать на сервере, а клиент получит только свои уведомления
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    -- Простое сравнение: user_id должен совпадать с profile_id текущего пользователя
    -- Используем функцию для получения profile_id
    user_id = get_user_profile_id_for_notifications()
    OR
    -- Fallback 1: для веб-пользователей через auth.uid()
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = duel_notifications.user_id 
      AND user_id = auth.uid()
    ))
    OR
    -- Fallback 2: для Telegram пользователей через telegram_id
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = duel_notifications.user_id 
      AND telegram_id = COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
        0
      )
    )
  );

-- ============================================
-- 3. ПРОВЕРКА
-- ============================================

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
END $$;

