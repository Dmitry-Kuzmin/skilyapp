-- ============================================
-- Проверка применения миграций ставок и страховки
-- ============================================

-- 1. Проверка типов
SELECT typname, typtype 
FROM pg_type 
WHERE typname IN ('duel_bet_status', 'duel_bet_result')
ORDER BY typname;

-- 2. Проверка таблиц
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('duel_bets', 'duel_bet_history', 'duel_bet_flags')
ORDER BY tablename;

-- 3. Проверка индексов
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('duel_bets', 'duel_bet_history', 'duel_bet_flags')
ORDER BY tablename, indexname;

-- 4. Проверка RLS политик
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('duel_bets', 'duel_bet_history', 'duel_bet_flags')
ORDER BY tablename, policyname;

-- 5. Проверка функции get_current_profile_id()
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'get_current_profile_id';

-- 6. Проверка constraint на duel_transactions
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'duel_transactions'::regclass
AND conname LIKE '%transaction_type%';

-- ============================================
-- Если все запросы вернули данные - миграции применены успешно!
-- ============================================

