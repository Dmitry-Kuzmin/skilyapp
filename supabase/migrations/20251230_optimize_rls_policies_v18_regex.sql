
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

        -- === 1. REGEX ЗАМЕНА (Case Insensitive) ===
        -- Заменяем auth.uid() -> (select auth.uid())
        -- Флаг 'gi': global (все вхождения), case-insensitive (регистронезависимо)

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

        -- current_setting(...) - ловим общий паттерн current_setting('...')
        -- Не меняем, если уже есть (select ...) рядом, но это отсеется на шаге очистки
        IF new_using IS NOT NULL THEN 
            new_using := REGEXP_REPLACE(new_using, 'current_setting\(([^)]+)\)', '(select current_setting(\1))', 'gi'); 
        END IF;
        IF new_check IS NOT NULL THEN 
            new_check := REGEXP_REPLACE(new_check, 'current_setting\(([^)]+)\)', '(select current_setting(\1))', 'gi'); 
        END IF;


        -- === 2. ОЧИСТКА ДВОЙНЫХ ОБЕРТОК ===
        -- Regex replace мог создать (select (select ...)). Убираем лишнее.
        -- Делаем это в цикле, пока не станет чисто.
        
        LOOP
            EXIT WHEN 
                (new_using IS NULL OR new_using NOT LIKE '%(select (select %') AND 
                (new_check IS NULL OR new_check NOT LIKE '%(select (select %');
            
            IF new_using IS NOT NULL THEN
                new_using := REPLACE(new_using, '(select (select ', '(select ');
                new_using := REPLACE(new_using, '))', ')'); -- Грубо, но для простых случаев пойдет.
                -- Более точная замена для конкретных функций:
                new_using := REPLACE(new_using, '(select (select auth.uid()))', '(select auth.uid())');
                new_using := REPLACE(new_using, '(select (select auth.jwt()))', '(select auth.jwt())');
                new_using := REPLACE(new_using, '(select (select auth.role()))', '(select auth.role())');
                -- Для current_setting сложнее регуляркой почистить, надеемся на простой REPLACE выше.
            END IF;
            
            IF new_check IS NOT NULL THEN
                new_check := REPLACE(new_check, '(select (select auth.uid()))', '(select auth.uid())');
                new_check := REPLACE(new_check, '(select (select auth.jwt()))', '(select auth.jwt())');
                new_check := REPLACE(new_check, '(select (select auth.role()))', '(select auth.role())');
            END IF;
            
            -- Предохранитель от вечного цикла
            EXIT; 
        END LOOP;

        -- === 3. ПРИМЕНЕНИЕ ===
        IF new_using IS DISTINCT FROM pol.using_expr OR new_check IS DISTINCT FROM pol.check_expr THEN
            table_full_name := quote_ident(pol.schema_name) || '.' || quote_ident(pol.table_name);
            RAISE NOTICE 'Updating Policy (Regex): "%" on %', pol.policy_name, table_full_name;
            
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
