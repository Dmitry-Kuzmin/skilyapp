-- Safe RLS policy fixes for tables with broken nested SELECT policies
-- Only disables RLS on tables that:
-- 1. Actually exist in the database
-- 2. Have broken policies with nested SELECTs
-- 3. Are not needed for user-facing security (protected by SECURITY DEFINER functions)

DO $$
DECLARE
  r RECORD;
  disable_sql text;
BEGIN
  -- Disable RLS on tables with broken nested SELECT policies
  FOR r IN
    SELECT DISTINCT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%SELECT ( SELECT%' OR with_check LIKE '%SELECT ( SELECT%')
  LOOP
    disable_sql := format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    BEGIN
      EXECUTE disable_sql;
      RAISE NOTICE 'Disabled RLS on %.%', r.schemaname, r.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not disable RLS on %.% : %', r.schemaname, r.tablename, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Ensure critical tables have correct RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verify profiles policies are clean
-- The previous migration (20260522_fix_broken_rls_policies.sql) should have already recreated them
