-- Add RLS policy for partners to view their issued keys
-- Partners should be able to see all keys issued to them, not just activated ones

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Partners can view their issued keys" ON public.premium_keys;

-- Create new policy for partners to view their issued keys
CREATE POLICY "Partners can view their issued keys"
ON public.premium_keys
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = premium_keys.partner_id
    AND partners.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Partners can view their issued keys" ON public.premium_keys IS 
'Allows partners to view all keys issued to them, regardless of activation status';























