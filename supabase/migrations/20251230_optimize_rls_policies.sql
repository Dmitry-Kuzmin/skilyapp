
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
    -- Перебираем все политики в схеме public
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
        -- Флаг изменений
        new_using := NULL;
        new_check := NULL;

        -- 1. Оптимизируем USING выражение
        current_using := pol.using_expr;
        IF current_using IS NOT NULL AND current_using ~~ '%auth.uid()%' AND current_using !~~ '%(select auth.uid())%' THEN
            new_using := REPLACE(current_using, 'auth.uid()', '(select auth.uid())');
        END IF;

        -- 2. Оптимизируем WITH CHECK выражение
        current_check := pol.check_expr;
        IF current_check IS NOT NULL AND current_check ~~ '%auth.uid()%' AND current_check !~~ '%(select auth.uid())%' THEN
            new_check := REPLACE(current_check, 'auth.uid()', '(select auth.uid())');
        END IF;

        -- Если есть что менять
        IF new_using IS NOT NULL OR new_check IS NOT NULL THEN
            table_full_name := quote_ident(pol.schema_name) || '.' || quote_ident(pol.table_name);
            
            RAISE NOTICE 'Optimizing RLS policy: "%" on %', pol.policy_name, table_full_name;
            
            -- Формируем команду ALTER POLICY
            cmd_sql := 'ALTER POLICY ' || quote_ident(pol.policy_name) || ' ON ' || table_full_name;
            
            -- Если меняем USING (или оставляем старым, если меняем только CHECK)
            IF new_using IS NOT NULL THEN
                cmd_sql := cmd_sql || ' USING (' || new_using || ')';
            ELSIF pol.using_expr IS NOT NULL THEN
                -- Если USING был, но не менялся, его нужно повторить при переопределении? 
                -- Нет, ALTER POLICY позволяет менять части. Но если мы хотим обновить только одну, другую можно не трогать.
                -- ОДНАКО safest way is set what changed.
                NULL;
            END IF;

            -- Если меняем WITH CHECK
            IF new_check IS NOT NULL THEN
                cmd_sql := cmd_sql || ' WITH CHECK (' || new_check || ')';
            END IF;

            -- Примечание: ALTER POLICY ... USING (...) не требует повторения WITH CHECK, если мы его не трогаем.
            -- Но в нашем случае скрипт проверяет оба.
            
            EXECUTE cmd_sql;
        END IF;
    END LOOP;
END $$;
