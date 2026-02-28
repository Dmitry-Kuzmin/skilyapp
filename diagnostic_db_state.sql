-- Diagnostic SQL Script to check the current state of the database.
-- Run this in your Supabase SQL Editor.

-- 1. Check if the critical functions exist and see their definitions
SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_function_arguments(p.oid) AS arguments
FROM 
    pg_proc p
JOIN 
    pg_namespace n ON p.pronamespace = n.oid
WHERE 
    p.proname IN ('get_dashboard_super_v2', 'process_license_event', 'get_player_rank_v2')
    AND n.nspname = 'public';

-- 2. Check if the necessary tables exist
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_name IN ('profiles', 'xp_transactions', 'test_sessions', 'license_history', 'daily_bonus_logs', 'duel_stats');

-- 3. Check for specific columns in profiles that might be missing or causing issues
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name IN ('license_points', 'total_xp_earned', 'coins', 'xp');

-- 4. Check record counts in key tables to see "activity"
SELECT 'profiles' as "table", count(*) as "count" FROM profiles
UNION ALL
SELECT 'xp_transactions', count(*) FROM xp_transactions
UNION ALL
SELECT 'test_sessions', count(*) FROM test_sessions
UNION ALL
SELECT 'license_history', count(*) FROM license_history
UNION ALL
SELECT 'daily_bonus_logs', count(*) FROM daily_bonus_logs;

-- 5. Test the function with a NULL or dummy ID to check for 500 errors (if it exists)
-- This is a safe check: it might return 400 if arguments don't match, but shouldn't 500 if robust.
-- SELECT * FROM get_dashboard_super_v2('00000000-0000-0000-0000-000000000000');
