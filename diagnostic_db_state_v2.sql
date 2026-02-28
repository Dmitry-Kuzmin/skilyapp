-- Safe Diagnostic SQL Script v2
-- This script will not fail if tables are missing.

DO $$
DECLARE
    rec RECORD;
    table_list TEXT[] := ARRAY[
        'profiles', 
        'transactions', 
        'test_sessions', 
        'game_sessions',
        'user_license_points_history', 
        'daily_bonus_logs', 
        'user_daily_bonus',
        'duel_stats',
        'achievements',
        'user_progress',
        'topics',
        'user_topic_progress'
    ];
    t_name TEXT;
    table_exists BOOLEAN;
    row_count BIGINT;
BEGIN
    RAISE NOTICE '--- Checking Tables Presence and Counts ---';
    FOREACH t_name IN ARRAY table_list
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t_name
        ) INTO table_exists;

        IF table_exists THEN
            EXECUTE format('SELECT count(*) FROM %I', t_name) INTO row_count;
            RAISE NOTICE 'Table %: EXISTS, Rows: %', t_name, row_count;
        ELSE
            RAISE NOTICE 'Table %: MISSING', t_name;
        END IF;
    END LOOP;

    RAISE NOTICE '--- Checking Critical Functions ---';
    FOR rec IN 
        SELECT proname, pg_get_function_arguments(oid) as args
        FROM pg_proc 
        WHERE proname IN ('get_dashboard_super_v2', 'process_license_event', 'get_player_rank_v2')
    LOOP
        RAISE NOTICE 'Function %: EXISTS, Args: %', rec.proname, rec.args;
    END LOOP;

    RAISE NOTICE '--- Checking Profile Columns ---';
    FOR rec IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name IN ('license_points', 'coins', 'xp', 'total_xp_earned', 'last_daily_point_at')
    LOOP
        RAISE NOTICE 'Column profiles.%: EXISTS, Type: %', rec.column_name, rec.data_type;
    END LOOP;
END $$;
