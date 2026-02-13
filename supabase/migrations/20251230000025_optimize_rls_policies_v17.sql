
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

        -- === 1. АГРЕССИВНАЯ ЗАМЕНА (REPLACE ALL) ===
        -- Заменяем ВСЕ вхождения, даже если они уже оптимизированы (мы это исправим на шаге 2)
        
        -- auth.uid()
        IF new_using IS NOT NULL THEN new_using := REPLACE(new_using, 'auth.uid()', '(select auth.uid())'); END IF;
        IF new_check IS NOT NULL THEN new_check := REPLACE(new_check, 'auth.uid()', '(select auth.uid())'); END IF;

        -- auth.jwt()
        IF new_using IS NOT NULL THEN new_using := REPLACE(new_using, 'auth.jwt()', '(select auth.jwt())'); END IF;
        IF new_check IS NOT NULL THEN new_check := REPLACE(new_check, 'auth.jwt()', '(select auth.jwt())'); END IF;

        -- auth.role()
        IF new_using IS NOT NULL THEN new_using := REPLACE(new_using, 'auth.role()', '(select auth.role())'); END IF;
        IF new_check IS NOT NULL THEN new_check := REPLACE(new_check, 'auth.role()', '(select auth.role())'); END IF;

        -- auth.email()
        IF new_using IS NOT NULL THEN new_using := REPLACE(new_using, 'auth.email()', '(select auth.email())'); END IF;
        IF new_check IS NOT NULL THEN new_check := REPLACE(new_check, 'auth.email()', '(select auth.email())'); END IF;

        -- === 2. ИСПРАВЛЕНИЕ ДВОЙНЫХ ОБЕРТОК ===
        -- Если мы заменили то, что уже было (select auth.uid()), мы получили (select (select auth.uid()))
        -- Исправляем это обратно
        
        -- Цикл очистки (на случай тройных вложений, хотя маловероятно)
        LOOP
            EXIT WHEN 
                (new_using IS NULL OR new_using NOT LIKE '%(select (select %') AND 
                (new_check IS NULL OR new_check NOT LIKE '%(select (select %');
            
            IF new_using IS NOT NULL THEN
                new_using := REPLACE(new_using, '(select (select auth.uid()))', '(select auth.uid())');
                new_using := REPLACE(new_using, '(select (select auth.jwt()))', '(select auth.jwt())');
                new_using := REPLACE(new_using, '(select (select auth.role()))', '(select auth.role())');
                new_using := REPLACE(new_using, '(select (select auth.email()))', '(select auth.email())');
            END IF;
            
            IF new_check IS NOT NULL THEN
                new_check := REPLACE(new_check, '(select (select auth.uid()))', '(select auth.uid())');
                new_check := REPLACE(new_check, '(select (select auth.jwt()))', '(select auth.jwt())');
                new_check := REPLACE(new_check, '(select (select auth.role()))', '(select auth.role())');
                new_check := REPLACE(new_check, '(select (select auth.email()))', '(select auth.email())');
            END IF;
        END LOOP;

        -- === 3. ПРОВЕРКА И ПРИМЕНЕНИЕ ===
        IF new_using IS DISTINCT FROM pol.using_expr OR new_check IS DISTINCT FROM pol.check_expr THEN
            table_full_name := quote_ident(pol.schema_name) || '.' || quote_ident(pol.table_name);
            RAISE NOTICE 'Fixing Policy: "%" on %', pol.policy_name, table_full_name;
            
            cmd_sql := 'ALTER POLICY ' || quote_ident(pol.policy_name) || ' ON ' || table_full_name;
            
            IF new_using IS NOT NULL THEN
                cmd_sql := cmd_sql || ' USING (' || new_using || ')';
            END IF;

            IF new_check IS NOT NULL THEN
                -- Если USING не менялся, но есть, SQL требует его не указывать или указывать?
                -- ALTER POLICY позволяет менять только WITH CHECK.
                cmd_sql := cmd_sql || ' WITH CHECK (' || new_check || ')';
            END IF;
            
            EXECUTE cmd_sql;
        END IF;

    END LOOP;
END $$;
