-- RLS Consolidation V2 - "Explode and Merge"
-- This script proactively resolves 'multiple_permissive_policies' warnings by:
-- 1. Exploding any 'ALL' (*) policies into specific (SELECT, INSERT, UPDATE, DELETE) policies.
-- 2. Consolidating ALL permissive policies for a given Table + Action into a SINGLE policy.
--    - It handles different roles (public, anon, authenticated) by creating a master 'TO public' policy
--      and wrapping specific logic with `auth.role() = '...'` checks.
-- This ensures exactly 1 permissive policy per action per table, satisfying the linter.

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
    role_check TEXT;
    final_using_expr TEXT;
    final_check_expr TEXT;
    
    -- Creating/Dropping
    new_pol_name TEXT;
    drop_sql TEXT;
    create_sql TEXT;
    merged_count INT := 0;
    
    -- Helpers
    using_clause TEXT;
    check_clause TEXT;
BEGIN

    ---------------------------------------------------------------------------
    -- PHASE 1: EXPLODE 'ALL' (*) POLICIES
    -- We convert every permissive 'ALL' policy into 4 specific policies.
    ---------------------------------------------------------------------------
    FOR all_pol IN
        SELECT 
            n.nspname AS schema_name,
            c.relname AS table_name,
            p.polname,
            p.polroles,
            pg_get_expr(p.polqual, p.polrelid) AS using_expr,
            pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr,
            -- Determine the explicit role name (if any), default 'public'
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
          AND p.polcmd = '*' -- Target ALL policies
          AND p.polpermissive = true
    LOOP
        -- Detect the logic for WITH CHECK. If null, fall back to USING (standard Postgres behavior).
        check_clause := coalesce(all_pol.check_expr, all_pol.using_expr);
        using_clause := all_pol.using_expr;
        
        RAISE NOTICE 'Exploding ALL policy: % on %.%', all_pol.polname, all_pol.schema_name, all_pol.table_name;
        
        -- Drop the original ALL policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', all_pol.polname, all_pol.schema_name, all_pol.table_name);
        
        -- Create SELECT (uses USING)
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO %s USING (%s);', 
                       all_pol.polname || '_select_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, using_clause);
                       
        -- Create DELETE (uses USING)
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO %s USING (%s);', 
                       all_pol.polname || '_delete_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, using_clause);
                       
        -- Create INSERT (uses CHECK)
        -- Note: INSERT only uses WITH CHECK.
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO %s WITH CHECK (%s);', 
                       all_pol.polname || '_insert_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, check_clause);
                       
        -- Create UPDATE (uses USING and CHECK)
        EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s);', 
                       all_pol.polname || '_update_gen', all_pol.schema_name, all_pol.table_name, all_pol.role_name_literal, using_clause, check_clause);
                       
        exploded_count := exploded_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Exploded % ALL policies.', exploded_count;

    ---------------------------------------------------------------------------
    -- PHASE 2: CONSOLIDATE (CROSS-ROLE MERGE)
    -- Group by (Table, Action). Aggregate logic from ALL roles into one 'TO public' policy.
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
        HAVING count(*) > 1 -- Only process where conflict exists
    LOOP
        final_using_parts := ARRAY[]::TEXT[];
        final_check_parts := ARRAY[]::TEXT[];
        
        -- Iterate over policies in the group
        FOR pol_data IN SELECT * FROM jsonb_array_elements(group_rec.policies)
        LOOP
            -- Build Role Guard: auth.role() IN (...)
            IF (pol_data->'roles') @> '["public"]' THEN
                role_check := 'true';
            ELSE
                 SELECT string_agg(quote_literal(val), ', ') 
                 INTO role_check 
                 FROM jsonb_array_elements_text(pol_data->'roles') val;
                 role_check := 'auth.role() IN (' || role_check || ')';
            END IF;
            
            -- Process USING (SELECT, UPDATE, DELETE)
            IF (pol_data->>'using') IS NOT NULL AND group_rec.cmd_type IN ('r', 'w', 'd') THEN
                IF role_check = 'true' THEN
                    current_using_part := '(' || (pol_data->>'using') || ')';
                ELSE
                    current_using_part := '(' || role_check || ' AND (' || (pol_data->>'using') || '))';
                END IF;
                final_using_parts := final_using_parts || current_using_part;
            END IF;
            
            -- Process WITH CHECK (INSERT, UPDATE)
            IF group_rec.cmd_type IN ('a', 'w') THEN
                -- Resolving effective check clause
                IF (pol_data->>'check') IS NULL THEN
                     -- If INSERT ('a'), null check means TRUE (allow all).
                     -- If UPDATE ('w'), null check defaults to USING clause.
                     IF group_rec.cmd_type = 'a' THEN
                         current_check_part := 'true';
                     ELSE
                         current_check_part := (pol_data->>'using');
                     END IF;
                ELSE
                     current_check_part := (pol_data->>'check');
                END IF;
                
                -- Wrap
                IF current_check_part IS NOT NULL THEN
                    IF role_check = 'true' THEN
                        current_check_part := '(' || current_check_part || ')';
                    ELSE
                        current_check_part := '(' || role_check || ' AND (' || current_check_part || '))';
                    END IF;
                    final_check_parts := final_check_parts || current_check_part;
                END IF;
            END IF;
        END LOOP;
        
        -- Combine
        final_using_expr := array_to_string(final_using_parts, ' OR ');
        final_check_expr := array_to_string(final_check_parts, ' OR ');
        
        -- Generate New Policy Name
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

        -- Drop Old Policies
        FOR pol_data IN SELECT * FROM jsonb_array_elements(group_rec.policies)
        LOOP
             EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', 
                            pol_data->>'name', group_rec.schema_name, group_rec.table_name);
        END LOOP;
        
        -- Create New Policy
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
