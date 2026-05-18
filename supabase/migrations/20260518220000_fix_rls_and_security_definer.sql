-- ============================================================
-- Fix: enable RLS on course_* tables + fix questions_safe view
-- ============================================================

-- course_config: public read-only config
ALTER TABLE public.course_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_config_select" ON public.course_config
  FOR SELECT TO anon, authenticated USING (true);

-- course_streams: public read-only stream schedule
ALTER TABLE public.course_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_streams_select" ON public.course_streams
  FOR SELECT TO anon, authenticated USING (true);

-- course_leads: contains personal data — only service_role can read/write
-- (Edge Function uses service_role which bypasses RLS)
ALTER TABLE public.course_leads ENABLE ROW LEVEL SECURITY;

-- questions_safe view: remove SECURITY DEFINER (invoker is sufficient)
ALTER VIEW public.questions_safe SET (security_invoker = true);
