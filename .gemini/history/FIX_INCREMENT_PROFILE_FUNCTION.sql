-- ============================================
-- ИСПРАВЛЕНИЕ: increment_profile_value с SECURITY DEFINER
-- ============================================
-- Выполнить в SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

-- 1. Проверяем текущую функцию
SELECT 
  '1. Текущая настройка функции' as check_type,
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER ✅'
    ELSE 'SECURITY INVOKER ❌'
  END as security_type,
  CASE 
    WHEN p.proconfig IS NOT NULL THEN array_to_string(p.proconfig, ', ')
    ELSE 'NOT SET ❌'
  END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'increment_profile_value';

-- 2. УДАЛЯЕМ старую функцию
DROP FUNCTION IF EXISTS public.increment_profile_value(UUID, TEXT, INTEGER);

-- 3. СОЗДАЕМ правильную функцию с SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.increment_profile_value(
  p_profile_id UUID,
  p_column TEXT,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- ❗ КРИТИЧНО: обходит RLS политики
SET search_path = public  -- ❗ КРИТИЧНО: явно указываем схему
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_current_value INTEGER;
  v_new_value INTEGER;
BEGIN
  -- Валидация входных данных
  IF p_column NOT IN ('coins', 'xp', 'duel_pass_sp') THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column;
  END IF;
  
  -- Логируем попытку обновления (для диагностики)
  RAISE NOTICE '[increment_profile_value] Attempting to update % for profile %', p_column, p_profile_id;
  
  -- Проверяем существование профиля БЕЗ RLS (SECURITY DEFINER дает полный доступ)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = p_profile_id
  ) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile not found: %. Please check if this is a valid profile.id', p_profile_id
      USING HINT = 'Make sure you are passing profile.id (from profiles table), not auth.uid()';
  END IF;
  
  -- Получаем текущее значение
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM public.profiles WHERE id = $1', 
    p_column
  )
  INTO v_current_value
  USING p_profile_id;
  
  v_new_value := v_current_value + p_amount;
  
  -- Обновляем значение
  EXECUTE format(
    'UPDATE public.profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE id = $2',
    p_column, p_column
  ) USING p_amount, p_profile_id;
  
  -- Проверяем что обновление прошло
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update profile: %', p_profile_id;
  END IF;
  
  -- Логируем успешное обновление
  RAISE NOTICE '[increment_profile_value] ✅ Successfully updated % from % to % (+%) for profile %',
    p_column, v_current_value, v_new_value, p_amount, p_profile_id;
END;
$$;

COMMENT ON FUNCTION public.increment_profile_value IS 'Increment profile value (coins, xp, duel_pass_sp) with SECURITY DEFINER to bypass RLS';

-- 4. Проверяем что функция правильно создана
SELECT 
  '2. Новая настройка функции' as check_type,
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER ✅'
    ELSE 'SECURITY INVOKER ❌'
  END as security_type,
  CASE 
    WHEN p.proconfig IS NOT NULL THEN array_to_string(p.proconfig, ', ')
    ELSE 'NOT SET ❌'
  END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'increment_profile_value';

-- 5. Тестируем функцию с реальным профилем
DO $$
DECLARE
  v_test_profile_id UUID := '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';
  v_coins_before INTEGER;
  v_coins_after INTEGER;
BEGIN
  -- Получаем текущий баланс
  SELECT COALESCE(coins, 0) INTO v_coins_before
  FROM public.profiles
  WHERE id = v_test_profile_id;
  
  RAISE NOTICE 'Coins before: %', v_coins_before;
  
  -- Тестируем функцию (добавляем 0 монет - безопасно для теста)
  PERFORM public.increment_profile_value(v_test_profile_id, 'coins', 0);
  
  -- Проверяем результат
  SELECT COALESCE(coins, 0) INTO v_coins_after
  FROM public.profiles
  WHERE id = v_test_profile_id;
  
  RAISE NOTICE 'Coins after: %', v_coins_after;
  RAISE NOTICE 'Test result: %', CASE WHEN v_coins_before = v_coins_after THEN '✅ SUCCESS' ELSE '❌ FAILED' END;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test FAILED with error: %', SQLERRM;
END $$;

-- 6. Проверяем RLS политики на profiles
SELECT 
  '3. RLS политики на profiles' as check_type,
  tablename,
  policyname,
  permissive,
  roles::text[],
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- 7. Финальный вердикт
SELECT 
  '=== ФИНАЛЬНЫЙ ВЕРДИКТ ===' as check_type,
  CASE 
    WHEN NOT EXISTS(
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname = 'increment_profile_value'
        AND p.prosecdef = true
    )
    THEN '❌ Функция increment_profile_value не имеет SECURITY DEFINER'
    
    WHEN NOT EXISTS(
      SELECT 1 FROM pg_proc p
      WHERE p.proname = 'increment_profile_value'
        AND 'search_path=public' = ANY(p.proconfig)
    )
    THEN '⚠️ Функция не имеет явного search_path (может работать, но лучше добавить)'
    
    ELSE '✅ Функция increment_profile_value правильно настроена с SECURITY DEFINER и search_path'
  END as verdict;

-- 8. Дополнительная информация для диагностики
SELECT 
  '4. Информация о профиле' as check_type,
  id,
  user_id,
  telegram_id,
  first_name,
  coins,
  xp,
  created_at,
  updated_at
FROM profiles
WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';

