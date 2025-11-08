-- ============================================
-- УПРОЩЕННАЯ RLS ПОЛИТИКА ДЛЯ REALTIME
-- ============================================
-- Проблема: Realtime не может обработать SECURITY DEFINER функции
-- Решение: Используем более простую политику с прямыми проверками
-- ============================================

-- 1. УДАЛЯЕМ СТАРУЮ ПОЛИТИКУ
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;

-- 2. СОЗДАЕМ УПРОЩЕННУЮ ПОЛИТИКУ БЕЗ ФУНКЦИЙ И БЕЗ ПОДЗАПРОСОВ
-- Realtime требует максимально простую политику
-- Используем прямой подзапрос, но объединяем условия в один запрос
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE 
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR
        (telegram_id IS NOT NULL AND telegram_id = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
          0
        ))
    )
  );

-- 3. ПРОВЕРЯЕМ, ЧТО ПОЛИТИКА СОЗДАНА
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    RAISE NOTICE '✅ Simplified RLS policy created successfully';
  ELSE
    RAISE WARNING '⚠️ RLS policy not found';
  END IF;
END $$;

