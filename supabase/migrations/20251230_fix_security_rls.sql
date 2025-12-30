ALTER TABLE public.fraud_check_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for service_role" ON public.fraud_check_queue FOR ALL USING (auth.role() = 'service_role');
