
DO $$
DECLARE
    func_record RECORD;
    func_sig TEXT;
BEGIN
    -- Перебираем все функции в схеме 'public'
    FOR func_record IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS func_name,
            pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prokind = 'f' -- Только обычные функции
    LOOP
        -- Формируем сигнатуру: public.function_name(args)
        func_sig := quote_ident(func_record.schema_name) || '.' || quote_ident(func_record.func_name) || '(' || func_record.args || ')';
        
        -- Выводим для отладки
        RAISE NOTICE 'Fixing search_path for: %', func_sig;

        -- Выполняем ALTER
        EXECUTE 'ALTER FUNCTION ' || func_sig || ' SET search_path = public, temp';
    END LOOP;
END $$;
