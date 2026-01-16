-- ============================================
-- ИСПРАВЛЕНИЕ: Profile not found
-- ============================================
-- Выполнить в SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

-- 1. Проверяем существует ли профиль с этим ID
SELECT 
  '1. Проверка профиля' as check_type,
  id,
  user_id,
  telegram_id,
  first_name,
  coins,
  xp,
  created_at
FROM profiles
WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';

-- Если результат пустой - профиль не существует!

-- 2. Проверяем может ли это быть auth.user_id
SELECT 
  '2. Проверка по auth.users' as check_type,
  u.id as auth_user_id,
  p.id as profile_id,
  p.telegram_id,
  p.first_name,
  p.coins
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
   OR p.id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';

-- 3. Ищем профиль по telegram_id (если есть)
SELECT 
  '3. Все профили пользователя' as check_type,
  id,
  user_id,
  telegram_id,
  first_name,
  coins,
  created_at
FROM profiles
WHERE telegram_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Проверяем функцию increment_profile_value
SELECT 
  '4. Проверка функции' as check_type,
  proname as function_name,
  prosrc as source_code_preview
FROM pg_proc
WHERE proname = 'increment_profile_value';

-- 5. ИСПРАВЛЕНИЕ: Обновляем функцию increment_profile_value для лучшей диагностики
CREATE OR REPLACE FUNCTION public.increment_profile_value(
  p_profile_id UUID,
  p_column TEXT,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_current_value INTEGER;
BEGIN
  -- Валидация входных данных
  IF p_column NOT IN ('coins', 'xp', 'duel_pass_sp') THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column;
  END IF;
  
  -- Проверяем существование профиля (для лучшей диагностики)
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_profile_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    -- Дополнительная информация для диагностики
    RAISE EXCEPTION 'Profile not found: %. Please check if this is a valid profile.id (not user_id or telegram_id)', p_profile_id;
  END IF;
  
  -- Получаем текущее значение
  EXECUTE format('SELECT COALESCE(%I, 0) FROM profiles WHERE id = $1', p_column)
  INTO v_current_value
  USING p_profile_id;
  
  -- Обновляем значение
  EXECUTE format(
    'UPDATE profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    p_column, p_column
  ) USING p_amount, p_profile_id;
  
  -- Логируем успешное обновление
  RAISE NOTICE 'Successfully updated %.% from % to % (+%)',
    'profiles', p_column, v_current_value, v_current_value + p_amount, p_amount;
END;
$$;

-- 6. Проверяем как TestSession передает profileId
-- Нужно посмотреть в код - возможно передается auth.uid() вместо profile.id

-- 7. ВРЕМЕННОЕ РЕШЕНИЕ: Создаем wrapper функцию которая автоматически находит profile.id
CREATE OR REPLACE FUNCTION public.increment_profile_value_safe(
  p_user_identifier UUID, -- может быть profile.id или auth.uid() или telegram_id
  p_column TEXT,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Пытаемся найти профиль по разным способам
  
  -- Вариант 1: Это уже profile.id
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE id = p_user_identifier;
  
  -- Вариант 2: Это auth.uid() (user_id)
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE user_id = p_user_identifier;
  END IF;
  
  -- Если не нашли - ошибка
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find profile for identifier: %. Tried: profile.id, user_id', p_user_identifier;
  END IF;
  
  -- Вызываем оригинальную функцию с правильным profile.id
  PERFORM public.increment_profile_value(v_profile_id, p_column, p_amount);
END;
$$;

COMMENT ON FUNCTION public.increment_profile_value_safe IS 'Safe wrapper that automatically finds profile.id from auth.uid() or profile.id';

-- 8. Финальная проверка
SELECT 
  '=== ФИНАЛЬНАЯ ДИАГНОСТИКА ===' as check_type,
  CASE 
    WHEN NOT EXISTS(SELECT 1 FROM profiles WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98')
    THEN '❌ Профиль с этим ID не существует - возможно передается auth.uid() вместо profile.id'
    ELSE '✅ Профиль найден - проблема в другом'
  END as verdict;

-- 9. Тест функции (раскомментировать для теста)
-- SELECT increment_profile_value_safe('78fd7d40-88c8-4ee3-a64c-61d630ba3c98', 'coins', 10);

