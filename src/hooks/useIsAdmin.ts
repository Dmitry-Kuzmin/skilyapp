import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export function useIsAdmin() {
  const { profileId, supabaseUser } = useUserContext();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      const userId = supabaseUser?.id;
      if (!userId) {
        if (isMounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: userId,
          _role: 'admin'
        });

        if (isMounted) {
          if (error) {
            console.error('[useIsAdmin] Error checking admin role:', error);
            setIsAdmin(false);
          } else {
            setIsAdmin(!!data);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[useIsAdmin] Exception checking admin role:', err);
        if (isMounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [supabaseUser?.id]);

  return { isAdmin, isLoading };
}
