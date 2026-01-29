-- Fix answer_options RLS to allow SELECT for everyone
-- This is needed for duel creation (Edge Function needs to read answer_options)

-- Drop restrictive policy
DROP POLICY IF EXISTS "Admins can manage answers" ON public.answer_options;

-- Allow SELECT for everyone (answers are public content)
CREATE POLICY "Anyone can read answers" ON public.answer_options
FOR SELECT
USING (true);

-- Only admins can INSERT
CREATE POLICY "Admins can insert answers" ON public.answer_options
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can UPDATE
CREATE POLICY "Admins can update answers" ON public.answer_options
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can DELETE
CREATE POLICY "Admins can delete answers" ON public.answer_options
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
