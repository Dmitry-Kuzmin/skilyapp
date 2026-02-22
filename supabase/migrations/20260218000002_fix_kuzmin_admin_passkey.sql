
-- Migration: Ensure kuzmin.public@gmail.com is admin across all login methods
-- This migration handles cases where the user might have multiple auth entries (e.g. Email + Passkey)
-- and ensures they all have the 'admin' role in public.user_roles.

DO $$
DECLARE
  v_user RECORD;
  v_admin_count INTEGER := 0;
BEGIN
  -- We look for ALL users with this email (Supabase might have multiple if different providers are used
  -- and email linking isn't perfect, although ILIKE helps catch mismatches).
  FOR v_user IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email ILIKE 'kuzmin.public@gmail.com'
  LOOP
    -- Ensure the admin role exists for this user ID
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Sync with profiles just in case there's any logic depending on metadata
    -- Although mostly we use has_role() RPC.
    
    v_admin_count := v_admin_count + 1;
    RAISE NOTICE 'Admin role ensured for user_id: % (%)', v_user.id, v_user.email;
  END LOOP;

  IF v_admin_count = 0 THEN
    RAISE WARNING 'User with email kuzmin.public@gmail.com not found in auth.users';
  ELSE
    RAISE NOTICE 'Successfully processed % user entries for kuzmin.public@gmail.com', v_admin_count;
  END IF;
END $$;
