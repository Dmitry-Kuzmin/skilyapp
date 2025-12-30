-- RLS Consolidation V3 - "Fixing Syntax & Null Logic"
-- Fixed "USING ()" syntax error by coalescing null expressions to 'true'.
-- improved logic for handling Permissive policies where NULL qual means TRUE.

DO $$
DECLARE
    -- Cursor for Exploding ALL policies
    all_pol RECORD;
    exploded_count INT := 0;
    
    -- Cursor for Consolidating
    group_rec RECORD;
    pol_data JSONB;
    
    -- Accumulators for merging
    final_using_parts TEXT[];
    final_check_parts TEXT[];
    current_using_part TEXT;
    current_check_part TEXT;
    
    -- Helper vars for parts
    raw_using TEXT;
    raw_check TEXT;
    role_check TEXT;
    
    final_using_expr TEXT;
    final_check_expr TEXT;
    
    -- Creating/Dropping
    new_pol_name TEXT;
    create_sql TEXT;
    merged_count INT := 0;
    
    -- Helpers
    using_clause TEXT;
    check_clause TEXT;
BEGIN

    ---------------------------------------------------------------------------
    -- PHASE 1: EXPLODE 'ALL' (*) POLICIES
    ---------------------------------------------------------------------------
    FOR all_pol IN
        SELECT 
            n.nspname AS schema_name,
            c.relname AS table_name,
            p.polname,
            p.polroles,
            pg_get_expr(p.polqual, p.polrelid) AS using_expr,
            pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr,
            (
                SELECT coalesce(string_agg(r.rolname, ', '), 'public')
                FROM unnest(p.polroles) oid_role
                LEFT JOIN pg_roles r ON r.oid = oid_role
                WHERE oid_role != 0
            ) AS role_name_literal
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.polcmd = '*' 
          AND p.polpermissive = true
    LOOP
        -- Fix: Default NULL expressions to 'true' to avoid "USING ()" syntax error
        using_clause := coalesce(all_pol.using_expr, 'true');
        check_clause := coalesce(all_pol.check_expr, using_clause); 

        RAISE NOTICE 'Exploding ALL policy: % on %.%', all_pol.polname, all_pol.schema_name, all_pol.table_name;
        
        -- Drop original
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', all_pol.polname, all_pol.schema_name, all_pol.table_name);
        
        -- CREATE 4 SPECIFIC POLICIES
        
        -- SELECT
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s);', 
                       all_pol.polname || '_select_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, using_clause);
                       
        -- DELETE
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s);', 
                       all_pol.polname || '_delete_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, using_clause);
                       
        -- INSERT (WITH CHECK only)
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s);', 
                       all_pol.polname || '_insert_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, check_clause);
                       
        -- UPDATE (USING + WITH CHECK)
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s);', 
                       all_pol.polname || '_update_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, using_clause, check_clause);
                       
        exploded_count := exploded_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Exploded % ALL policies.', exploded_count;

    ---------------------------------------------------------------------------
    -- PHASE 2: CONSOLIDATE (CROSS-ROLE MERGE)
    ---------------------------------------------------------------------------
    FOR group_rec IN
        SELECT 
            n.nspname AS schema_name,
            c.relname AS table_name,
            p.polcmd AS cmd_type,
            jsonb_agg(jsonb_build_object(
                'name', p.polname,
                'roles', (
                    SELECT coalesce(array_agg(r.rolname), ARRAY['public'])
                    FROM unnest(p.polroles) oid_role
                    LEFT JOIN pg_roles r ON r.oid = oid_role
                    WHERE oid_role != 0
                ),
                'using', pg_get_expr(p.polqual, p.polrelid),
                'check', pg_get_expr(p.polwithcheck, p.polrelid)
            )) as policies
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.polpermissive = true
        GROUP BY 1, 2, 3
        HAVING count(*) > 1 
    LOOP
        final_using_parts := ARRAY[]::TEXT[];
        final_check_parts := ARRAY[]::TEXT[];
        
        -- Iterate policies in this group
        FOR pol_data IN SELECT * FROM jsonb_array_elements(group_rec.policies)
        LOOP
            -- 1. Determine Role Guard
            IF (pol_data->'roles') @> '["public"]' THEN
                role_check := 'true';
            ELSE
                 SELECT string_agg(quote_literal(val), ', ') 
                 INTO role_check 
                 FROM jsonb_array_elements_text(pol_data->'roles') val;
                 role_check := 'auth.role() IN (' || role_check || ')';
            END IF;
            
            -- 2. Extract RAW expressions (defaulting to 'true' if NULL)
            raw_using := coalesce(pol_data->>'using', 'true');
            
            -- Logic for Check: depends on Command and presence of USING
            -- If INSERT: default check to true if missing
            -- If UPDATE: default check to USING if missing
            IF group_rec.cmd_type = 'a' THEN
                raw_check := coalesce(pol_data->>'check', 'true');
            ELSIF group_rec.cmd_type = 'w' THEN
                 raw_check := coalesce(pol_data->>'check', raw_using);
            ELSE 
                 raw_check := null; -- Other commands don't use WITH CHECK usually (SELECT/DELETE)
            END IF;

            -- 3. Build Safe Expressions
            
            -- USING handling
            IF group_rec.cmd_type IN ('r', 'w', 'd') THEN
                IF role_check = 'true' THEN
                    current_using_part := '(' || raw_using || ')';
                ELSE
                    current_using_part := '(' || role_check || ' AND (' || raw_using || '))';
                END IF;
                final_using_parts := final_using_parts || current_using_part;
            END IF;
            
            -- WITH CHECK handling
            IF group_rec.cmd_type IN ('a', 'w') THEN
                 IF role_check = 'true' THEN
                    current_check_part := '(' || raw_check || ')';
                ELSE
                    current_check_part := '(' || role_check || ' AND (' || raw_check || '))';
                END IF;
                final_check_parts := final_check_parts || current_check_part;
            END IF;
            
        END LOOP;
        
        -- Combine with OR
        final_using_expr := array_to_string(final_using_parts, ' OR ');
        final_check_expr := array_to_string(final_check_parts, ' OR ');

        -- Create Name
        new_pol_name := 'merged_' || 
            CASE group_rec.cmd_type 
                WHEN 'r' THEN 'select' 
                WHEN 'a' THEN 'insert' 
                WHEN 'w' THEN 'update' 
                WHEN 'd' THEN 'delete' 
            END || '_' || 
            group_rec.table_name || '_' || 
            substring(md5(coalesce(final_using_expr, '') || coalesce(final_check_expr, '')) from 1 for 8);
            
        RAISE NOTICE 'Merging % policies on %.% (%) -> %', 
                     jsonb_array_length(group_rec.policies), group_rec.schema_name, group_rec.table_name, group_rec.cmd_type, new_pol_name;

        -- Drop Old
        FOR pol_data IN SELECT * FROM jsonb_array_elements(group_rec.policies)
        LOOP
             EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', 
                            pol_data->>'name', group_rec.schema_name, group_rec.table_name);
        END LOOP;
        
        -- Create New
        create_sql := format('CREATE POLICY %I ON %I.%I FOR %s TO public',
                             new_pol_name, group_rec.schema_name, group_rec.table_name,
                             CASE group_rec.cmd_type 
                               WHEN 'r' THEN 'SELECT' 
                               WHEN 'a' THEN 'INSERT' 
                               WHEN 'w' THEN 'UPDATE' 
                               WHEN 'd' THEN 'DELETE' 
                             END);
                             
        IF final_using_expr IS NOT NULL AND final_using_expr <> '' THEN
            create_sql := create_sql || ' USING (' || final_using_expr || ')';
        END IF;
        
        IF final_check_expr IS NOT NULL AND final_check_expr <> '' THEN
            create_sql := create_sql || ' WITH CHECK (' || final_check_expr || ')';
        END IF;
        
        create_sql := create_sql || ';';
        EXECUTE create_sql;
        
        merged_count := merged_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Consolidation complete. Merged % groups.', merged_count;

END $$;
