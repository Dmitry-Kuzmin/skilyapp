
DO $$
DECLARE
    -- Курсор для перебора групп политик, которые нужно объединить
    policy_group RECORD;
    
    -- Переменные для сборки нового правила
    combined_using TEXT;
    combined_with_check TEXT;
    old_policies_names TEXT[];
    
    -- Имя новой политики
    new_policy_name TEXT;
    
    -- SQL команды
    drop_sql TEXT;
    create_sql TEXT;
    
    -- Счетчики
    merged_count INT := 0;
BEGIN
    -- 1. Перебираем группы: (Схема, Таблица, Роль, Команда), где количество политик > 1
    -- Исключаем политики, которые 'RESTRICTIVE' (они работают через AND, их нельзя просто так мержить с PERMISSIVE)
    FOR policy_group IN
        SELECT 
            n.nspname AS schema_name,
            c.relname AS table_name,
            p.polroles AS roles_ids, -- массив OID ролей
            CASE 
                WHEN p.polroles = '{0}' THEN 'public' -- 0 usually means public/all
                ELSE (SELECT rolname FROM pg_roles WHERE oid = p.polroles[1]) -- берем первую роль (обычно она одна в Supabase)
            END AS role_name,
            p.polcmd AS cmd_type, -- 'r' (select), 'a' (insert), 'w' (update), 'd' (delete), '*' (all)
            array_agg(p.polname) AS pol_names,
            array_agg(pg_get_expr(p.polqual, p.polrelid)) AS using_exprs,
            array_agg(pg_get_expr(p.polwithcheck, p.polrelid)) AS check_exprs
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.polpermissive = true -- только PERMISSIVE (по умолчанию)
        GROUP BY 1, 2, 3, 4, 5
        HAVING count(*) > 1
    LOOP
        -- Сброс переменных
        combined_using := NULL;
        combined_with_check := NULL;
        
        -- 2. Сборка выражений через OR
        -- USING
        SELECT string_agg('(' || u || ')', ' OR ') 
        INTO combined_using
        FROM unnest(policy_group.using_exprs) AS u
        WHERE u IS NOT NULL;

        -- WITH CHECK
        SELECT string_agg('(' || c || ')', ' OR ') 
        INTO combined_with_check
        FROM unnest(policy_group.check_exprs) AS c
        WHERE c IS NOT NULL;

        -- Если вообще пусто (теоретически невозможно для policies, но на всякий случай)
        IF combined_using IS NULL AND combined_with_check IS NULL THEN
            CONTINUE;
        END IF;

        -- 3. Формирование имени новой политики
        -- Формат: merged_[cmd]_[role]_[random_hash] для уникальности, или просто описательно
        -- cmd_type: r=SELECT, a=INSERT, w=UPDATE, d=DELETE
        new_policy_name := 'merged_' || 
                           CASE policy_group.cmd_type 
                               WHEN 'r' THEN 'select' 
                               WHEN 'a' THEN 'insert' 
                               WHEN 'w' THEN 'update' 
                               WHEN 'd' THEN 'delete' 
                               ELSE 'all' 
                           END || '_' || 
                           policy_group.role_name || '_' || 
                           md5(array_to_string(policy_group.pol_names, ','));
        
        -- Обрезаем имя, если слишком длинное (Postgres limit 63 chars)
        IF length(new_policy_name) > 63 THEN
            new_policy_name := substring(new_policy_name from 1 for 63);
        END IF;

        RAISE NOTICE 'Merging policies on %.% for role % cmd %: % -> %', 
                     policy_group.schema_name, policy_group.table_name, 
                     policy_group.role_name, policy_group.cmd_type, 
                     policy_group.pol_names, new_policy_name;

        -- 4. Генерация SQL
        
        -- Сначала удаляем старые
        DECLARE
            p_name TEXT;
        BEGIN
            FOREACH p_name IN ARRAY policy_group.pol_names
            LOOP
                drop_sql := format('DROP POLICY IF EXISTS %I ON %I.%I;', 
                                   p_name, policy_group.schema_name, policy_group.table_name);
                EXECUTE drop_sql;
            END LOOP;
        END;

        -- Создаем новую
        create_sql := format('CREATE POLICY %I ON %I.%I FOR %s TO %I', 
                             new_policy_name, 
                             policy_group.schema_name, 
                             policy_group.table_name,
                             CASE policy_group.cmd_type 
                               WHEN 'r' THEN 'SELECT' 
                               WHEN 'a' THEN 'INSERT' 
                               WHEN 'w' THEN 'UPDATE' 
                               WHEN 'd' THEN 'DELETE' 
                               ELSE 'ALL' 
                             END,
                             policy_group.role_name);

        IF combined_using IS NOT NULL THEN
            create_sql := create_sql || ' USING (' || combined_using || ')';
        END IF;

        IF combined_with_check IS NOT NULL THEN
            create_sql := create_sql || ' WITH CHECK (' || combined_with_check || ')';
        END IF;

        create_sql := create_sql || ';';
        
        EXECUTE create_sql;
        
        merged_count := merged_count + 1;
        
    END LOOP;
    
    RAISE NOTICE 'Successfully merged % policy groups.', merged_count;
END $$;
