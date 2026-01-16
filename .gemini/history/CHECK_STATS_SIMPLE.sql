-- ============================================
-- ПРОСТАЯ ПРОВЕРКА СТАТИСТИКИ
-- ============================================

-- Ваша статистика из test_results
SELECT 
  'Ваша статистика' as info,
  COUNT(*) as tests_completed,
  SUM(questions_count) as total_questions,
  SUM(correct_count) as correct_answers,
  SUM(questions_count - correct_count) as errors,
  CAST(
    CASE 
      WHEN SUM(questions_count) > 0 
      THEN (SUM(correct_count)::NUMERIC / SUM(questions_count)::NUMERIC) * 100
      ELSE 0
    END AS INTEGER
  ) as accuracy_percent
FROM test_results
WHERE user_id = '78fd7d40-88c8-4ee3-a64c-61d630ba3c98';

-- Тест RPC функции get_dashboard_stats
SELECT 
  'Тест RPC функции' as info,
  (public.get_dashboard_stats('78fd7d40-88c8-4ee3-a64c-61d630ba3c98')->'stats'->>'tests_completed')::int as tests,
  (public.get_dashboard_stats('78fd7d40-88c8-4ee3-a64c-61d630ba3c98')->'stats'->>'total_questions')::int as questions,
  (public.get_dashboard_stats('78fd7d40-88c8-4ee3-a64c-61d630ba3c98')->'stats'->>'correct_answers')::int as correct,
  (public.get_dashboard_stats('78fd7d40-88c8-4ee3-a64c-61d630ba3c98')->'stats'->>'accuracy')::int as accuracy;

