-- Migration: Bulk Fix Function Search Paths and Security Policies
-- Description: Uses dynamic SQL to fix all functions and updates RLS policies.

DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- 1. Исправляем все функции в схеме public
    FOR func_record IN 
        SELECT 
            n.nspname as schema,
            p.proname as name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
                       func_record.schema, 
                       func_record.name, 
                       func_record.args);
    END LOOP;
END $$;

-- 2. Индивидуальные исправления для тех, что могли быть пропущены или требуют особого внимания
-- (Тут оставляем те же исправления RLS, что и раньше)

-- Исправляем таблицу ответов
DROP POLICY IF EXISTS "Authenticated can delete answers" ON public.answers_golden;
DROP POLICY IF EXISTS "Authenticated can insert answers" ON public.answers_golden;
DROP POLICY IF EXISTS "Authenticated can update answers" ON public.answers_golden;

CREATE POLICY "Admins can manage answers" 
ON public.answers_golden FOR ALL 
TO authenticated 
USING (auth.jwt()->>'role' = 'service_role');

-- Исправляем таблицу стран
DROP POLICY IF EXISTS "Authenticated users can manage countries_delete_gen" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can manage countries_insert_gen" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can manage countries_update_gen" ON public.countries;

CREATE POLICY "Admins can manage countries" 
ON public.countries FOR ALL 
TO service_role 
USING (true);

-- Исправляем тесты
DROP POLICY IF EXISTS "Authenticated users can delete tests" ON public.tests;
DROP POLICY IF EXISTS "Authenticated users can update tests" ON public.tests;

CREATE POLICY "Admins can manage tests definitions" 
ON public.tests FOR ALL 
TO service_role 
USING (true);

-- Усиливаем защиту логов
ALTER POLICY "Service role full access to analytics_events_log_delete_gen" ON public.analytics_events_log TO service_role;
ALTER POLICY "Service role full access to analytics_events_log_update_gen" ON public.analytics_events_log TO service_role;
ALTER POLICY "System can manage notification logs_delete_gen" ON public.notification_logs TO service_role;
ALTER POLICY "System can manage notification logs_update_gen" ON public.notification_logs TO service_role;

-- Безопасная отправка фидбека
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.ai_feedback;
CREATE POLICY "Users can insert feedback" ON public.ai_feedback FOR INSERT TO authenticated WITH CHECK (true);
