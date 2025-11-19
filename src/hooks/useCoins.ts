import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

type RewardType =
  | "daily_login"
  | "complete_test"
  | "win_duel"
  | "lose_duel"
  | "streak_3_days"
  | "streak_7_days"
  | "monthly_premium_bonus";

type SpendType = "boost_50_50" | "boost_hint" | "boost_time" | "second_chance";

export function useCoins() {
  const { profileId } = useUserContext();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabaseClient = supabase as any;

  const refreshBalance = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("coins")
        .eq("id", profileId)
        .single();

      if (!error && typeof data?.coins === "number") {
        setBalance(data.coins);
      }
    } catch (error) {
      console.error("[useCoins] Error refreshing balance:", error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const earnCoins = useCallback(
    async (rewardType: RewardType, metadata?: Record<string, unknown>) => {
      if (!profileId) return;
      setLoading(true);
      try {
        const { data, error } = await supabaseClient.functions.invoke("coins-earn", {
          body: { user_id: profileId, reward_type: rewardType, metadata },
        });
        if (error) throw error;
        if (data?.new_balance !== undefined) {
          setBalance(data.new_balance);
        } else {
          await refreshBalance();
        }
      } catch (err) {
        console.error("[useCoins] earnCoins error", err);
      } finally {
        setLoading(false);
      }
    },
    [profileId, refreshBalance]
  );

  const spendCoins = useCallback(
    async (spendType: SpendType, metadata?: Record<string, unknown>) => {
      if (!profileId) return;
      setLoading(true);
      try {
        const { data, error } = await supabaseClient.functions.invoke("coins-spend", {
          body: { user_id: profileId, spend_type: spendType, metadata },
        });
        if (error) throw error;
        if (data?.new_balance !== undefined) {
          setBalance(data.new_balance);
        } else {
          await refreshBalance();
        }
        return { success: true, spend_amount: data?.spend_amount };
      } catch (err) {
        console.error("[useCoins] spendCoins error", err);
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [profileId, refreshBalance]
  );

  return {
    balance,
    loading,
    refresh: refreshBalance,
    earnCoins,
    spendCoins,
  };
}


