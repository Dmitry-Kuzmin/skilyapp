import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

interface PremiumState {
  isPremium: boolean;
  isTrial: boolean;
  isLifetime: boolean;
  activeUntil: string | null;
  daysRemaining: number;
  coins: number;
  subscriptionType: string | null;
  subscriptionStatus: string | null;
}

const initialState: PremiumState = {
  isPremium: false,
  isTrial: false,
  isLifetime: false,
  activeUntil: null,
  daysRemaining: 0,
  coins: 0,
  subscriptionType: null,
  subscriptionStatus: null,
};

export function usePremium() {
  const { profileId } = useUserContext();
  const [state, setState] = useState<PremiumState>(initialState);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("premium-status", {
        body: { user_id: profileId },
      });
      if (error) throw error;
      if (data?.success) {
        setState({
          isPremium: data.isPremium,
          isTrial: data.isTrial,
          isLifetime: data.isLifetime || false,
          activeUntil: data.activeUntil ?? null,
          daysRemaining: data.daysRemaining === null ? 999999 : (data.daysRemaining ?? 0), // null = Premium Forever
          coins: data.coins ?? 0,
          subscriptionType: data.subscriptionType || null,
          subscriptionStatus: data.subscriptionStatus || null,
        });
      }
    } catch (err) {
      console.error("[usePremium] Failed to fetch status", err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...state,
    loading,
    refresh: fetchStatus,
  };
}


