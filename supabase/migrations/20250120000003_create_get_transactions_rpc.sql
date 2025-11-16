-- Create RPC function to get user transactions (bypasses RLS)
-- This function uses SECURITY DEFINER to allow users to view their own transactions
-- Works for both Telegram and Web users

CREATE OR REPLACE FUNCTION public.get_user_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  transaction_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Return transactions for the user
  -- Используем явные имена таблиц и алиасы для избежания конфликтов
  RETURN QUERY
  SELECT 
    transactions.id,
    transactions.amount,
    transactions.transaction_type,
    transactions.metadata,
    transactions.created_at
  FROM public.transactions
  WHERE transactions.user_id = get_user_transactions.p_user_id
  ORDER BY transactions.created_at DESC
  LIMIT get_user_transactions.p_limit;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO anon;

