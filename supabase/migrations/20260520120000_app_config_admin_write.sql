-- Allow admin users to upsert into app_config (for demo questions config etc.)
CREATE POLICY "Admins can upsert app_config"
ON public.app_config
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);
