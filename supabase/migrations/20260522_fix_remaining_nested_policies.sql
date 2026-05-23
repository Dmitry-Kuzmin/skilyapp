-- Fix remaining 98 policies with nested SELECTs (auth.role, current_setting wrappers)
-- These have variable depth, so we apply regex iteratively until no more nested SELECTs remain

CREATE OR REPLACE FUNCTION pg_temp.unwrap_nested_select(input text) RETURNS text AS $$
DECLARE
  result text;
  prev_result text;
  i int;
BEGIN
  result := input;
  -- Apply up to 10 iterations to unwrap nested SELECTs
  FOR i IN 1..10 LOOP
    prev_result := result;

    -- Pattern: ( SELECT (expr) AS alias)  →  expr (single layer unwrap)
    -- This handles auth.uid(), auth.role(), current_setting() wrappers
    result := regexp_replace(
      result,
      '\( SELECT \( SELECT ([^()]+(?:\([^()]*\)[^()]*)*) AS (\w+)\) AS \w+\)',
      '( SELECT \1 AS \2)',
      'g'
    );

    -- If nothing changed, we're done
    EXIT WHEN result = prev_result;
  END LOOP;

  -- Final cleanup: unwrap the last single ( SELECT X AS Y) when X is just a function call
  -- Pattern: ( SELECT auth.uid() AS uid)  →  auth.uid()
  -- Pattern: ( SELECT auth.role() AS role)  →  auth.role()
  -- Pattern: ( SELECT current_setting(...) AS current_setting)  →  current_setting(...)
  result := regexp_replace(
    result,
    '\( SELECT (auth\.uid\(\)) AS uid\)',
    '\1',
    'g'
  );
  result := regexp_replace(
    result,
    '\( SELECT (auth\.role\(\)) AS role\)',
    '\1',
    'g'
  );
  result := regexp_replace(
    result,
    '\( SELECT (current_setting\([^)]+\)) AS current_setting\)',
    '\1',
    'g'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  r RECORD;
  new_qual text;
  new_with_check text;
  cmd_part text;
  using_part text;
  check_part text;
  policy_def text;
BEGIN
  FOR r IN
    SELECT *
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%SELECT ( SELECT%' OR with_check LIKE '%SELECT ( SELECT%')
  LOOP
    new_qual := pg_temp.unwrap_nested_select(r.qual);
    new_with_check := pg_temp.unwrap_nested_select(r.with_check);

    cmd_part := CASE r.cmd
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      WHEN 'ALL' THEN 'ALL'
      ELSE 'ALL'
    END;

    using_part := CASE WHEN new_qual IS NOT NULL THEN ' USING (' || new_qual || ')' ELSE '' END;
    check_part := CASE WHEN new_with_check IS NOT NULL THEN ' WITH CHECK (' || new_with_check || ')' ELSE '' END;

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
