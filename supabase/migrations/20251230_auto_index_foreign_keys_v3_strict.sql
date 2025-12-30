-- Auto-Index Foreign Keys V3 (Strict Mode)
-- The previous script missed cases where the column was part of a composite index (e.g. PK) but not the LEADING column.
-- This V3 script ensures that for every single-column Foreign Key, there is an index that STARTS with that column.

DO $$ 
DECLARE 
    fk_record RECORD; 
    index_sql TEXT;
    index_name TEXT;
    created_count INT := 0;
BEGIN
    FOR fk_record IN 
        SELECT 
            c.conrelid::regclass AS table_full_name,
            n.nspname AS schema_name,
            t.relname AS table_name,
            c.conname AS constraint_name, 
            a.attname AS column_name,
            a.attnum
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_attribute a ON a.attnum = c.conkey[1] AND a.attrelid = c.conrelid
        WHERE c.contype = 'f' 
          AND n.nspname = 'public'
          AND array_length(c.conkey, 1) = 1 -- Focus on single-column FKs (vast majority)
          -- Strict Check: Does NO index exist where this column is the FIRST column?
          AND NOT EXISTS (
              SELECT 1 
              FROM pg_index i 
              WHERE i.indrelid = c.conrelid 
                -- indkey is 0-indexed in vector access, check if first key matches column
                AND i.indkey[0] = a.attnum
          )
        ORDER BY 1, 2
    LOOP
        -- Construct index name
        index_name := substring('idx_' || fk_record.table_name || '_' || fk_record.column_name from 1 for 63);

        -- Create logic
        index_sql := format(
            'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%I);',
            index_name,
            fk_record.schema_name,
            fk_record.table_name,
            fk_record.column_name
        );
        
        RAISE NOTICE 'Fixing Unindexed FK: %.% uses column %, creating index %', 
                     fk_record.schema_name, fk_record.table_name, fk_record.column_name, index_name;
                     
        EXECUTE index_sql;
        created_count := created_count + 1;
    END LOOP;
    
    RAISE NOTICE 'V3 Finished. Created % indexes.', created_count;
END $$;
