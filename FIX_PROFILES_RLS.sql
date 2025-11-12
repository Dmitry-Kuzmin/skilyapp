-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: RLS политики для profiles
-- Проблема: политика "Users can view own profile" блокирует доступ к профилям соперников
-- Решение: разрешить чтение всех профилей для отображения имен в дуэлях
-- 
-- ПРИМЕНИТЬ ВРУЧНУЮ В SUPABASE SQL EDITOR!

-- 0. ПРОВЕРКА: Смотрим текущие политики перед изменением
SELECT 
  policyname,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 1. Удаляем ВСЕ существующие политики SELECT для profiles (чтобы избежать конфликтов)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- 2. Убеждаемся что RLS включен
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Создаем политику для чтения всех профилей (нужно для дуэлей)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 4. Убеждаемся что политика для обновления существует
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (
    (user_id = auth.uid())
    OR (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json->>'telegram_id')::bigint)
    OR (clerk_id = (auth.uid())::text)
  );

-- 5. Убеждаемся что политика для вставки существует
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid())
    OR (telegram_id IS NOT NULL)
  );

-- 6. Комментарий для документации
COMMENT ON POLICY "Profiles are viewable by everyone" ON public.profiles IS 
  'КРИТИЧНО: Разрешает чтение всех профилей для отображения имени соперника в дуэлях. Без этой политики невозможно получить имена игроков.';

-- 7. Проверяем что политики применены правильно
DO $$
DECLARE
  policy_count INTEGER;
  policy_qual TEXT;
BEGIN
  -- Сначала проверяем количество
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'profiles'
    AND policyname = 'Profiles are viewable by everyone'
    AND cmd = 'SELECT';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION '❌ Политика "Profiles are viewable by everyone" не была создана!';
  ELSE
    -- Затем получаем условие политики
    SELECT qual INTO policy_qual
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'profiles'
      AND policyname = 'Profiles are viewable by everyone'
      AND cmd = 'SELECT'
    LIMIT 1;
    
    RAISE NOTICE '✅ Политика "Profiles are viewable by everyone" успешно создана';
    RAISE NOTICE '📋 Условие политики: %', policy_qual;
    
    -- Проверяем что условие правильное (должно быть 'true' или '(true)')
    IF policy_qual IS NULL OR (policy_qual NOT LIKE '%true%' AND policy_qual != 'true') THEN
      RAISE WARNING '⚠️ Условие политики может быть неправильным: %', policy_qual;
      RAISE WARNING '⚠️ Ожидается: true или (true)';
    ELSE
      RAISE NOTICE '✅ Условие политики корректно: разрешает чтение всех профилей';
    END IF;
  END IF;
END $$;

-- 8. ФИНАЛЬНАЯ ПРОВЕРКА: Показываем все политики после изменений
SELECT 
  policyname,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

