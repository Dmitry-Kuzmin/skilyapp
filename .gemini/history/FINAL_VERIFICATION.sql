-- ============================================
-- ФИНАЛЬНАЯ ПРОВЕРКА: Все готово?
-- ============================================

-- 1. Проверка конфигурации наград
SELECT 
  '1️⃣ Конфигурация наград' as check_name,
  CASE 
    WHEN get_active_reward_config('test_rewards', NULL) IS NOT NULL 
    THEN '✅ Работает'
    ELSE '❌ Не работает'
  END as status;

-- 2. Проверка функции increment_profile_value
SELECT 
  '2️⃣ Функция increment_profile_value' as check_name,
  CASE 
    WHEN p.prosecdef AND 'search_path=public' = ANY(p.proconfig)
    THEN '✅ SECURITY DEFINER + search_path'
    ELSE '❌ Неправильные настройки'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'increment_profile_value';

-- 3. Проверка профиля
SELECT 
  '3️⃣ Профиль пользователя' as check_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM profiles WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98')
    THEN '✅ Существует'
    ELSE '❌ Не найден'
  END as status;

-- 4. Проверка таблицы test_results
SELECT 
  '4️⃣ Таблица test_results' as check_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'test_results')
    THEN '✅ Существует'
    ELSE '❌ Не найдена'
  END as status;

-- 5. Полный тест системы (симуляция начисления наград)
DO $$
DECLARE
  v_coins_before INTEGER;
  v_coins_after INTEGER;
  v_config JSONB;
BEGIN
  -- Получаем баланс до
  SELECT coins INTO v_coins_before FROM profiles WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';
  
  -- Загружаем конфигурацию
  v_config := get_active_reward_config('test_rewards', NULL);
  
  -- Тестируем начисление 10 монет
  PERFORM increment_profile_value('78fd7d40-88c8-4ee3-a64c-61d630ba3c98', 'coins', 10);
  
  -- Получаем баланс после
  SELECT coins INTO v_coins_after FROM profiles WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';
  
  -- Проверяем результат
  IF v_coins_after = v_coins_before + 10 THEN
    RAISE NOTICE '5️⃣ Полный тест системы: ✅ SUCCESS (% -> % монет)', v_coins_before, v_coins_after;
  ELSE
    RAISE NOTICE '5️⃣ Полный тест системы: ❌ FAILED (ожидалось %, получено %)', v_coins_before + 10, v_coins_after;
  END IF;
END $$;

-- 6. Текущий баланс
SELECT 
  '6️⃣ Текущий баланс' as check_name,
  coins || ' монет' as status
FROM profiles 
WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';

-- 7. ФИНАЛЬНЫЙ ВЕРДИКТ
SELECT 
  '🎯 === ФИНАЛЬНЫЙ СТАТУС ===' as check_name,
  CASE 
    WHEN get_active_reward_config('test_rewards', NULL) IS NULL
    THEN '❌ Конфигурация наград не работает'
    
    WHEN NOT EXISTS(
      SELECT 1 FROM pg_proc p
      WHERE p.proname = 'increment_profile_value' 
        AND p.prosecdef = true
    )
    THEN '❌ Функция increment_profile_value не имеет SECURITY DEFINER'
    
    WHEN NOT EXISTS(
      SELECT 1 FROM profiles WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
    )
    THEN '❌ Профиль не найден'
    
    ELSE '✅ ВСЕ СИСТЕМЫ РАБОТАЮТ! Можно тестировать в приложении.'
  END as status;

