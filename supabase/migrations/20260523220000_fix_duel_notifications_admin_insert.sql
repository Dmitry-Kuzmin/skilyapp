-- Admins need to insert notifications into duel_notifications for other users
-- (e.g. when responding to question reports)
-- Previously there was NO INSERT policy at all, so admin responses silently failed.

CREATE POLICY "Admins can insert notifications for any user"
  ON public.duel_notifications
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Also allow Edge Functions (service_role) to insert — already implicit via RLS bypass,
-- but make it explicit for clarity.
-- service_role bypasses RLS by default, so no extra policy needed.
