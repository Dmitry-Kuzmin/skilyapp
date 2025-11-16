-- Fix RLS policies for transactions table
-- Allow users to insert their own transactions (for boost purchases, etc.)

-- Drop existing insert policy
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;

-- Create new policy that allows users to insert their own transactions
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Also allow service role to insert (for webhooks, etc.)
CREATE POLICY "Service role can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);

