-- ОТКАТ И ИСПРАВЛЕНИЕ: Восстановление работоспособности RLS политик
-- Эта миграция откатывает проблемные изменения и восстанавливает работоспособность

-- ============================================
-- 1. ВОССТАНОВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ПРОФИЛЕЙ
-- ============================================
-- Возвращаем политику, которая разрешает чтение всех профилей (для отображения имен)

-- Удаляем все политики profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем политику, которая разрешает чтение всех профилей
-- Это необходимо для отображения имени соперника в дуэли
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ============================================
-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================
-- Используем простую политику БЕЗ подзапросов для совместимости с Realtime

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику БЕЗ подзапросов
-- Это критично для работы с Realtime - подзапросы могут вызывать binding mismatch
-- Используем прямую проверку через функцию, которая возвращает profile_id
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$;

-- Политика с использованием функции (без подзапроса в USING)
CREATE POLICY "Users can view their own notifications"
  ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id());

-- ============================================
-- 3. ВКЛЮЧЕНИЕ REALTIME ДЛЯ УВЕДОМЛЕНИЙ
-- ============================================

-- Убеждаемся, что realtime включен для таблицы
-- Удаляем из publication, если есть, затем добавляем
DO $$
BEGIN
  -- Пытаемся удалить из publication (если есть)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE duel_notifications;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Игнорируем ошибку, если таблицы нет в publication
  END;
  
  -- Добавляем в publication
  ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
END $$;


