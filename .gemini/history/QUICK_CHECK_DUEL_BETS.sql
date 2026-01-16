-- ============================================
-- Быстрая проверка ключевых элементов системы ставок
-- ============================================

-- 1. Таблицы созданы?
SELECT 
    'duel_bets' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'duel_bets') 
         THEN '✅ Создана' ELSE '❌ Отсутствует' END as status
UNION ALL
SELECT 
    'duel_bet_history' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'duel_bet_history') 
         THEN '✅ Создана' ELSE '❌ Отсутствует' END as status
UNION ALL
SELECT 
    'duel_bet_flags' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'duel_bet_flags') 
         THEN '✅ Создана' ELSE '❌ Отсутствует' END as status;

-- 2. Типы созданы?
SELECT 
    'duel_bet_status' as type_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'duel_bet_status') 
         THEN '✅ Создан' ELSE '❌ Отсутствует' END as status
UNION ALL
SELECT 
    'duel_bet_result' as type_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'duel_bet_result') 
         THEN '✅ Создан' ELSE '❌ Отсутствует' END as status;

-- 3. Функция get_current_profile_id() существует?
SELECT 
    'get_current_profile_id()' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_profile_id') 
         THEN '✅ Существует' ELSE '❌ Отсутствует' END as status;

-- 4. RLS включен?
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ RLS включен' ELSE '❌ RLS выключен' END as rls_status
FROM pg_tables 
WHERE tablename IN ('duel_bets', 'duel_bet_history', 'duel_bet_flags')
ORDER BY tablename;

-- 5. Политики созданы?
SELECT 
    tablename,
    COUNT(*) as policies_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Политики есть' ELSE '❌ Политик нет' END as status
FROM pg_policies 
WHERE tablename IN ('duel_bets', 'duel_bet_history', 'duel_bet_flags')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- Если все статусы ✅ - система готова к работе!
-- ============================================

