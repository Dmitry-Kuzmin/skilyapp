-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: RLS политики для profiles
-- Проблема: политика "Users can view own profile" блокирует доступ к профилям соперников
-- Решение: разрешить чтение всех профилей для отображения имен в дуэлях

-- 1. Удаляем ВСЕ существующие политики SELECT для profiles (чтобы избежать конфликтов)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 2. Убеждаемся что RLS включен
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Создаем политику для чтения всех профилей (нужно для дуэлей)
-- ВАЖНО: Используем SECURITY DEFINER или просто USING (true) для разрешения чтения
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

-- 7. Проверяем что политики применены
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'profiles'
    AND policyname = 'Profiles are viewable by everyone';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Политика "Profiles are viewable by everyone" не была создана!';
  ELSE
    RAISE NOTICE '✅ Политика "Profiles are viewable by everyone" успешно создана';
  END IF;
END $$;

