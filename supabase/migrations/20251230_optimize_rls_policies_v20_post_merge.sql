-- RLS Optimization V20 - Post-Merge Fix
-- This script proactively fixes 'Auth RLS Initialization Plan' warnings in the NEWLY created merged policies.
-- It iterates through all policies and wraps 'auth.uid()', 'auth.role()', etc., in '(select ...)' subqueries.
-- This is necessary because the consolidation script copied the original logic literal, which likely contained unwrapped calls.

DO $$
DECLARE
    pol RECORD;
    new_using TEXT;
    new_check TEXT;
    table_full_name TEXT;
    cmd_sql TEXT;
BEGIN
    FOR pol IN
        SELECT 
            n.nspname AS schema_name,
            c.relname AS table_name,
            p.polname AS policy_name,
            pg_get_expr(p.polqual, p.polrelid) AS using_expr,
            pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        new_using := pol.using_expr;
        new_check := pol.check_expr;

        -- === 1. REGEX REPLACEMENT (Case Insensitive) ===
        -- Replace auth.uid() -> (select auth.uid())
        
        -- auth.uid()
        IF new_using IS NOT NULL THEN 
            new_using := REGEXP_REPLACE(new_using, 'auth\.uid\(\)', '(select auth.uid())', 'gi'); 
        END IF;
        IF new_check IS NOT NULL THEN 
            new_check := REGEXP_REPLACE(new_check, 'auth\.uid\(\)', '(select auth.uid())', 'gi'); 
        END IF;

        -- auth.jwt()
        IF new_using IS NOT NULL THEN 
            new_using := REGEXP_REPLACE(new_using, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi'); 
        END IF;
        IF new_check IS NOT NULL THEN 
            new_check := REGEXP_REPLACE(new_check, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi'); 
        END IF;

        -- auth.role()
        IF new_using IS NOT NULL THEN 
            new_using := REGEXP_REPLACE(new_using, 'auth\.role\(\)', '(select auth.role())', 'gi'); 
        END IF;
        IF new_check IS NOT NULL THEN 
            new_check := REGEXP_REPLACE(new_check, 'auth\.role\(\)', '(select auth.role())', 'gi'); 
        END IF;
        
        -- auth.email()
        IF new_using IS NOT NULL THEN 
            new_using := REGEXP_REPLACE(new_using, 'auth\.email\(\)', '(select auth.email())', 'gi'); 
        END IF;
        IF new_check IS NOT NULL THEN 
            new_check := REGEXP_REPLACE(new_check, 'auth\.email\(\)', '(select auth.email())', 'gi'); 
        END IF;

        -- current_setting(...)
        -- Matches current_setting('...') and wraps it if not already wrapped
        IF new_using IS NOT NULL THEN 
            new_using := REGEXP_REPLACE(new_using, 'current_setting\(([^)]+)\)', '(select current_setting(\1))', 'gi'); 
        END IF;
        IF new_check IS NOT NULL THEN 
            new_check := REGEXP_REPLACE(new_check, 'current_setting\(([^)]+)\)', '(select current_setting(\1))', 'gi'); 
        END IF;


        -- === 2. CLEANUP DOUBLE WRAPPING ===
        -- Fixes artifacts like (select (select auth.uid())) -> (select auth.uid())
        
        IF new_using IS NOT NULL THEN
            new_using := REPLACE(new_using, '(select (select ', '(select ');
            -- Specific cleanups for common patterns to ensure correctness
            new_using := REPLACE(new_using, '(select (select auth.uid()))', '(select auth.uid())');
            new_using := REPLACE(new_using, '(select (select auth.jwt()))', '(select auth.jwt())');
            new_using := REPLACE(new_using, '(select (select auth.role()))', '(select auth.role())');
            new_using := REPLACE(new_using, '(select (select auth.email()))', '(select auth.email())');
        END IF;
        
        IF new_check IS NOT NULL THEN
            new_check := REPLACE(new_check, '(select (select ', '(select ');
            new_check := REPLACE(new_check, '(select (select auth.uid()))', '(select auth.uid())');
            new_check := REPLACE(new_check, '(select (select auth.jwt()))', '(select auth.jwt())');
            new_check := REPLACE(new_check, '(select (select auth.role()))', '(select auth.role())');
            new_check := REPLACE(new_check, '(select (select auth.email()))', '(select auth.email())');
        END IF;

        -- === 3. APPLY UPDATES ===
        IF new_using IS DISTINCT FROM pol.using_expr OR new_check IS DISTINCT FROM pol.check_expr THEN
            table_full_name := quote_ident(pol.schema_name) || '.' || quote_ident(pol.table_name);
            RAISE NOTICE 'Optimizing Policy: "%" on %', pol.policy_name, table_full_name;
            
            cmd_sql := 'ALTER POLICY ' || quote_ident(pol.policy_name) || ' ON ' || table_full_name;
            
            IF new_using IS NOT NULL THEN
                cmd_sql := cmd_sql || ' USING (' || new_using || ')';
            END IF;

            IF new_check IS NOT NULL THEN
                cmd_sql := cmd_sql || ' WITH CHECK (' || new_check || ')';
            END IF;
            
            EXECUTE cmd_sql;
        END IF;

    END LOOP;
END $$;
