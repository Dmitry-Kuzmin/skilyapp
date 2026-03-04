-- Migration: Secure RLS for Audit and Achievement Definitions
-- Description: Enables RLS and sets up basic security policies for tables reported by Supabase Linter.

-- 1. Secure user_license_points_audit
ALTER TABLE public.user_license_points_audit ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_license_points_audit' 
        AND policyname = 'Users can view their own license audit logs'
    ) THEN
        CREATE POLICY "Users can view their own license audit logs"
        ON public.user_license_points_audit
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Secure achievement_definitions
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'achievement_definitions' 
        AND policyname = 'Authenticated users can view achievement definitions'
    ) THEN
        CREATE POLICY "Authenticated users can view achievement definitions"
        ON public.achievement_definitions
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- 3. Optimization: Ensure indexes exist for performance (Safety first)
CREATE INDEX IF NOT EXISTS idx_user_license_points_audit_user_id ON public.user_license_points_audit(user_id);
