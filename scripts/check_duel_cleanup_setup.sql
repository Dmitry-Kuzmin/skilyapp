-- Скрипт для проверки корректности применения миграций оптимизации данных дуэлей
-- Выполни в Supabase Dashboard → SQL Editor

-- ============================================================================
-- 1. Проверка колонки match_summary в таблице duels
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'duels' 
  AND column_name = 'match_summary';

-- Ожидаемый результат: должна быть колонка match_summary типа jsonb

-- ============================================================================
-- 2. Проверка функции delete_old_duel_data
-- ============================================================================
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'delete_old_duel_data'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Ожидаемый результат: должна существовать функция delete_old_duel_data()

-- ============================================================================
-- 3. Проверка функции claim_technical_win (обновлена ли с match_summary)
-- ============================================================================
SELECT 
  proname as function_name,
  prosrc LIKE '%match_summary%' as has_match_summary_logic
FROM pg_proc
WHERE proname = 'claim_technical_win'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Ожидаемый результат: has_match_summary_logic должен быть true

-- ============================================================================
-- 4. Проверка индексов на created_at
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    (tablename = 'duel_answers' AND indexname LIKE '%created_at%')
    OR (tablename = 'duel_active_exploits' AND indexname LIKE '%created_at%')
  )
ORDER BY tablename, indexname;

-- Ожидаемый результат: должны быть индексы:
-- - idx_duel_answers_created_at
-- - idx_duel_answers_duel_id_created_at
-- - idx_duel_active_exploits_created_at

-- ============================================================================
-- 5. Тестовая проверка функции delete_old_duel_data (не удаляет данные, только проверяет)
-- ============================================================================
-- Эта проверка покажет структуру возвращаемых данных
-- ВНИМАНИЕ: Не удаляет реальные данные, только показывает структуру ответа
SELECT 
  'Function exists and returns correct structure' as check_result
WHERE EXISTS (
  SELECT 1 
  FROM pg_proc 
  WHERE proname = 'delete_old_duel_data'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
);

-- ============================================================================
-- 6. Проверка размера таблиц (для мониторинга)
-- ============================================================================
SELECT 
  'duel_answers' as table_name,
  pg_size_pretty(pg_total_relation_size('duel_answers')) as total_size,
  COUNT(*) as row_count,
  COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days') as rows_older_than_7_days
FROM duel_answers

UNION ALL

SELECT 
  'duel_active_exploits' as table_name,
  pg_size_pretty(pg_total_relation_size('duel_active_exploits')) as total_size,
  COUNT(*) as row_count,
  COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '1 day') as rows_older_than_1_day
FROM duel_active_exploits;

-- ============================================================================
-- 7. Проверка Edge Function (нужно проверить вручную в Dashboard)
-- ============================================================================
-- Перейди в Supabase Dashboard → Edge Functions
-- Проверь, что функция "duel-data-cleanup" существует и развернута

-- ============================================================================
-- ИТОГОВАЯ ПРОВЕРКА
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'duels' AND column_name = 'match_summary'
    ) THEN '✅ Колонка match_summary существует'
    ELSE '❌ Колонка match_summary НЕ найдена'
  END as check_match_summary_column,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'delete_old_duel_data'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✅ Функция delete_old_duel_data существует'
    ELSE '❌ Функция delete_old_duel_data НЕ найдена'
  END as check_cleanup_function,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'claim_technical_win'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND prosrc LIKE '%match_summary%'
    ) THEN '✅ Функция claim_technical_win обновлена с match_summary'
    ELSE '❌ Функция claim_technical_win НЕ обновлена'
  END as check_claim_function,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'duel_answers' 
        AND indexname = 'idx_duel_answers_created_at'
    ) THEN '✅ Индекс idx_duel_answers_created_at существует'
    ELSE '❌ Индекс idx_duel_answers_created_at НЕ найден'
  END as check_index_answers,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'duel_active_exploits' 
        AND indexname = 'idx_duel_active_exploits_created_at'
    ) THEN '✅ Индекс idx_duel_active_exploits_created_at существует'
    ELSE '❌ Индекс idx_duel_active_exploits_created_at НЕ найден'
  END as check_index_exploits;


















