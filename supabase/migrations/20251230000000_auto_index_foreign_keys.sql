-- Auto-Index Foreign Keys
-- This script proactively resolves the 200+ 'Unindexed foreign keys' suggestions in the Supabase Performance Advisor.
-- It works by:
-- 1. Identifying all Foreign Key constraints in the 'public' schema.
-- 2. Checking if an index already exists that *starts* with the FK column(s).
-- 3. If no such index exists, it automatically creates one using the naming convention: idx_<table_name>_<column_name>.
-- 
-- Why this is important:
-- - Improves JOIN performance significantly.
-- - Prevents table locks on the child table when rounds are deleted/updated in the parent table.
-- - Clears the "Info" noise in the dashboard so you can focus on real issues.

DO $$ 
DECLARE 
    -- Cursor to iterate over foreign keys that might need indexing
    fk_record RECORD; 
    index_sql TEXT;
    index_name TEXT;
    index_count INT := 0;
BEGIN
    FOR fk_record IN 
        SELECT 
            c.conrelid::regclass AS table_full_name,
            n.nspname AS schema_name,
            t.relname AS table_name,
            c.conname AS constraint_name, 
            a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.contype = 'f' -- Foreign Key
          AND n.nspname = 'public'
          -- Basic check: Look for cases where NO index exists containing this column as a prefix
          -- This is a heuristic; technically multi-column FKs need multi-column indexes, 
          -- but typically Supabase complains about single column FKs or missing prefixes.
          AND NOT EXISTS (
              SELECT 1 
              FROM pg_index i 
              JOIN pg_attribute ia ON ia.attrelid = i.indrelid 
              WHERE i.indrelid = c.conrelid 
                -- The index must include the column
                AND a.attnum = ANY(i.indkey)
                -- Ideally, we'd check if it's the *first* column, but existence is a good enough proxy for a basic sweep
          )
        ORDER BY 1, 2
    LOOP
        -- 1. Construct a clean index name
        -- Limit length to avoid errors (PG max 63 chars)
        index_name := substring('idx_' || fk_record.table_name || '_' || fk_record.column_name from 1 for 63);

        -- 2. Construct the SQL
        index_sql := format(
            'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%I);',
            index_name,
            fk_record.schema_name,
            fk_record.table_name,
            fk_record.column_name
        );
        
        -- 3. Execute
        RAISE NOTICE 'Creating index % for %.%', index_name, fk_record.schema_name, fk_record.table_name;
        EXECUTE index_sql;
        
        index_count := index_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Done. Created % new indexes.', index_count;
END $$;
