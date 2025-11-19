import { useCallback, useEffect, useState, useRef } from "react";
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

// Глобальный кэш для баланса монет (не очищается при навигации)
const coinsCache: Record<string, { balance: number; timestamp: number }> = {};
const CACHE_DURATION = 60000; // 1 минута

export function useCoins() {
  const { profileId } = useUserContext();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasInitializedRef = useRef(false);

  const supabaseClient = supabase as any;

  const refreshBalance = useCallback(async (force = false) => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    
    // Проверяем кэш перед загрузкой
    const cached = coinsCache[profileId];
    const now = Date.now();
    if (!force && cached && (now - cached.timestamp) < CACHE_DURATION) {
      setBalance(cached.balance);
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
        // Сохраняем в кэш
        coinsCache[profileId] = { balance: data.coins, timestamp: now };
      }
    } catch (error) {
      console.error("[useCoins] Error refreshing balance:", error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    // При первой загрузке проверяем кэш
    if (!hasInitializedRef.current && profileId) {
      const cached = coinsCache[profileId];
      if (cached) {
        setBalance(cached.balance);
        setLoading(false);
        hasInitializedRef.current = true;
        // Обновляем в фоне, если кэш устарел
        const now = Date.now();
        if ((now - cached.timestamp) >= CACHE_DURATION) {
          refreshBalance(true);
        }
        return;
      }
      hasInitializedRef.current = true;
    }
    
    refreshBalance();
  }, [profileId, refreshBalance]);

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
          // Обновляем кэш
          if (profileId) {
            coinsCache[profileId] = { balance: data.new_balance, timestamp: Date.now() };
          }
        } else {
          await refreshBalance(true);
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
          // Обновляем кэш
          if (profileId) {
            coinsCache[profileId] = { balance: data.new_balance, timestamp: Date.now() };
          }
        } else {
          await refreshBalance(true);
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


