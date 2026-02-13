
DO $$
DECLARE
    pol RECORD;
    current_using TEXT;
    current_check TEXT;
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

        -- -----------------------------------------------------
        -- 1. Оптимизация auth.uid()
        -- -----------------------------------------------------
        IF new_using ILIKE '%auth.uid()%' AND new_using NOT ILIKE '%(select auth.uid())%' THEN
            new_using := REPLACE(new_using, 'auth.uid()', '(select auth.uid())');
        END IF;
        IF new_check ILIKE '%auth.uid()%' AND new_check NOT ILIKE '%(select auth.uid())%' THEN
            new_check := REPLACE(new_check, 'auth.uid()', '(select auth.uid())');
        END IF;

        -- -----------------------------------------------------
        -- 2. Оптимизация auth.jwt()
        -- -----------------------------------------------------
        IF new_using ILIKE '%auth.jwt()%' AND new_using NOT ILIKE '%(select auth.jwt())%' THEN
            new_using := REPLACE(new_using, 'auth.jwt()', '(select auth.jwt())');
        END IF;
        IF new_check ILIKE '%auth.jwt()%' AND new_check NOT ILIKE '%(select auth.jwt())%' THEN
            new_check := REPLACE(new_check, 'auth.jwt()', '(select auth.jwt())');
        END IF;

        -- -----------------------------------------------------
        -- 3. Оптимизация auth.role()
        -- -----------------------------------------------------
        IF new_using ILIKE '%auth.role()%' AND new_using NOT ILIKE '%(select auth.role())%' THEN
            new_using := REPLACE(new_using, 'auth.role()', '(select auth.role())');
        END IF;
        IF new_check ILIKE '%auth.role()%' AND new_check NOT ILIKE '%(select auth.role())%' THEN
            new_check := REPLACE(new_check, 'auth.role()', '(select auth.role())');
        END IF;

        -- -----------------------------------------------------
        -- 4. Оптимизация auth.email()
        -- -----------------------------------------------------
        IF new_using ILIKE '%auth.email()%' AND new_using NOT ILIKE '%(select auth.email())%' THEN
            new_using := REPLACE(new_using, 'auth.email()', '(select auth.email())');
        END IF;
        IF new_check ILIKE '%auth.email()%' AND new_check NOT ILIKE '%(select auth.email())%' THEN
            new_check := REPLACE(new_check, 'auth.email()', '(select auth.email())');
        END IF;

        -- Проверка на изменения
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
