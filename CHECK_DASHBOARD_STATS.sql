-- ============================================
-- ДИАГНОСТИКА: Почему статистика не обновляется
-- ============================================

-- 1. Проверяем есть ли записи в test_results для пользователя
SELECT 
  '1️⃣ Записи в test_results' as check_name,
  COUNT(*) as total_tests,
  SUM(correct_count) as total_correct,
  SUM(questions_count) as total_questions,
  SUM(questions_count - correct_count) as total_errors,
  CASE 
    WHEN SUM(questions_count) > 0 
    THEN ROUND((SUM(correct_count)::float / SUM(questions_count)::float) * 100, 1)
    ELSE 0
  END as accuracy_percent
FROM test_results
WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';

-- 2. Проверяем последние 10 тестов
SELECT 
  '2️⃣ Последние тесты' as check_name,
  created_at,
  score as score_percent,
  correct_count,
  questions_count,
  coins_awarded,
  sp_awarded
FROM test_results
WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Проверяем есть ли записи в game_sessions (старая система)
SELECT 
  '3️⃣ Записи в game_sessions' as check_name,
  COUNT(*) as total_sessions,
  SUM(total_questions) as total_questions,
  SUM(score) as total_correct
FROM game_sessions
WHERE user_id = (
  SELECT user_id FROM profiles WHERE id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
);

-- 4. Проверяем существует ли RPC функция get_dashboard_stats
SELECT 
  '4️⃣ RPC функция get_dashboard_stats' as check_name,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'get_dashboard_stats'
    )
    THEN '✅ Существует'
    ELSE '❌ Не существует (используется fallback)'
  END as status;

-- 5. Тестируем RPC функцию (если существует)
DO $$
BEGIN
  BEGIN
    PERFORM public.get_dashboard_stats('78fd7d40-88c8-4ee3-a64c-61d630ba3c98');
    RAISE NOTICE '5️⃣ Тест RPC функции: ✅ Работает';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '5️⃣ Тест RPC функции: ❌ Ошибка: %', SQLERRM;
  END;
END $$;

-- 6. Вычисляем статистику вручную (как должно быть)
SELECT 
  '6️⃣ Правильная статистика' as check_name,
  (
    SELECT COUNT(*) 
    FROM test_results 
    WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
  ) as tests_completed,
  (
    SELECT SUM(questions_count) 
    FROM test_results 
    WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
  ) as total_questions,
  (
    SELECT SUM(correct_count) 
    FROM test_results 
    WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
  ) as correct_answers,
  (
    SELECT SUM(questions_count - correct_count) 
    FROM test_results 
    WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
  ) as errors,
  (
    SELECT 
      CASE 
        WHEN SUM(questions_count) > 0 
        THEN ROUND((SUM(correct_count)::float / SUM(questions_count)::float) * 100, 1)
        ELSE 0
      END
    FROM test_results 
    WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98'
  ) as accuracy;

-- 7. Финальный вердикт
SELECT 
  '=== ФИНАЛЬНЫЙ ВЕРДИКТ ===' as check_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM test_results WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98') = 0
    THEN '❌ В test_results нет данных - тесты не сохраняются!'
    
    WHEN NOT EXISTS(
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'get_dashboard_stats'
    )
    THEN '❌ RPC функция get_dashboard_stats не существует - dashboard использует game_sessions'
    
    ELSE '✅ Данные есть, нужно создать/исправить RPC функцию get_dashboard_stats'
  END as verdict;

