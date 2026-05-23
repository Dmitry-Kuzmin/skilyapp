-- ROLLBACK: Re-enable RLS on all tables and fix broken policies properly
-- The previous approach disabled RLS which left orphaned policies (219 security warnings)
--
-- Correct approach:
-- 1. Re-enable RLS on all tables that had it disabled
-- 2. For all policies with nested SELECTs, drop and recreate with clean auth.uid()
-- 3. Use DO block + regexp_replace to fix the malformed qual/with_check

DO $$
DECLARE
  r RECORD;
  tbl RECORD;
BEGIN
  -- Step 1: Re-enable RLS on all tables that have policies
  FOR tbl IN
    SELECT DISTINCT t.schemaname, t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = false
      AND EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', tbl.schemaname, tbl.tablename);
  END LOOP;
END;
$$;

-- Step 2: Fix all broken policies by recreating with clean expressions
DO $$
DECLARE
  r RECORD;
  new_qual text;
  new_with_check text;
  cmd_text text;
  policy_def text;
  cmd_part text;
  using_part text;
  check_part text;
  to_part text;
  nested_uid_pattern text := '\( SELECT \( SELECT \( SELECT \( SELECT \( SELECT \( SELECT auth\.uid\(\) AS uid\) AS uid\) AS uid\) AS uid\) AS uid\) AS uid\)';
  nested_jwt_pattern text := '\(\(\(\( SELECT \( SELECT current_setting\(''request\.jwt\.claims''::text, true\) AS current_setting\) AS current_setting\)\)::json -> ''telegram_id''::text\)\)::bigint';
BEGIN
  FOR r IN
    SELECT *
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%SELECT ( SELECT%' OR with_check LIKE '%SELECT ( SELECT%')
  LOOP
    -- Clean up nested SELECTs in qual and with_check
    new_qual := r.qual;
    new_with_check := r.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, nested_uid_pattern, 'auth.uid()', 'g');
    END IF;

    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, nested_uid_pattern, 'auth.uid()', 'g');
    END IF;

    -- Determine command type
    cmd_part := CASE r.cmd
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      WHEN 'ALL' THEN 'ALL'
      ELSE 'ALL'
    END;

    -- Build the recreate statement
    using_part := CASE WHEN new_qual IS NOT NULL THEN ' USING (' || new_qual || ')' ELSE '' END;
    check_part := CASE WHEN new_with_check IS NOT NULL THEN ' WITH CHECK (' || new_with_check || ')' ELSE '' END;

    -- Drop and recreate
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);

    policy_def := format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s%s%s',
      r.policyname,
      r.schemaname,
      r.tablename,
      cmd_part,
      array_to_string(r.roles, ', '),
      using_part,
      check_part
    );

    BEGIN
      EXECUTE policy_def;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to recreate policy % on %.%: %', r.policyname, r.schemaname, r.tablename, SQLERRM;
      RAISE NOTICE 'SQL was: %', policy_def;
    END;
  END LOOP;
END;
$$;
