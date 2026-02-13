-- Migration: Create License Points History
-- This table will store historical values for the graph in LicenseCard

CREATE TABLE IF NOT EXISTS public.user_license_points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points SMALLINT NOT NULL DEFAULT 8,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, recorded_at)
);

-- Index for fast history retrieval
CREATE INDEX IF NOT EXISTS idx_license_points_history_user_date 
ON public.user_license_points_history(user_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.user_license_points_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own points history"
ON public.user_license_points_history FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage history"
ON public.user_license_points_history FOR ALL
USING (true)
WITH CHECK (true);

-- RPC to get the last N days of history
CREATE OR REPLACE FUNCTION public.get_license_points_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    points SMALLINT,
    recorded_at DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT h.points, h.recorded_at
    FROM public.user_license_points_history h
    WHERE h.user_id = p_user_id
    ORDER BY h.recorded_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_license_points_history(UUID, INTEGER) TO authenticated;
