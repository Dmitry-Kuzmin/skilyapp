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

const PREMIUM_CACHE_DURATION = 5 * 60 * 1000; // 5 минут
const PREMIUM_CACHE_KEY = "premium_status_cache";
const isBrowser = typeof window !== "undefined";

const readCachedPremium = (profileId: string): PremiumState | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(PREMIUM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<
      string,
      { data: PremiumState; timestamp: number }
    >;
    const cached = parsed?.[profileId];
    if (!cached) return null;
    if (Date.now() - cached.timestamp > PREMIUM_CACHE_DURATION) return null;
    return cached.data;
  } catch (error) {
    console.warn("[usePremium] Failed to read cache:", error);
    return null;
  }
};

const writeCachedPremium = (profileId: string, data: PremiumState) => {
  if (!isBrowser) return;
  try {
    const raw = window.localStorage.getItem(PREMIUM_CACHE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, { data: PremiumState; timestamp: number }>)
      : {};
    parsed[profileId] = { data, timestamp: Date.now() };
    window.localStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.warn("[usePremium] Failed to persist cache:", error);
  }
};

export function usePremium() {
  const { profileId } = useUserContext();
  const [state, setState] = useState<PremiumState>(() => {
    if (!profileId) return initialState;
    const cached = readCachedPremium(profileId);
    return cached ?? initialState;
  });
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
        const resolvedState: PremiumState = {
          isPremium: data.isPremium,
          isTrial: data.isTrial,
          isLifetime: data.isLifetime || false,
          activeUntil: data.activeUntil ?? null,
          daysRemaining: data.daysRemaining === null ? 999999 : (data.daysRemaining ?? 0), // null = Premium Forever
          coins: data.coins ?? 0,
          subscriptionType: data.subscriptionType || null,
          subscriptionStatus: data.subscriptionStatus || null,
        };
        setState(resolvedState);
        writeCachedPremium(profileId, resolvedState);
      }
    } catch (err) {
      // Тихая обработка ошибок - используем кэш или дефолтные значения
      // Не логируем в консоль, чтобы не засорять её в production
      if (import.meta.env.DEV) {
        console.warn("[usePremium] Failed to fetch status, using cache:", err);
      }
      // Пытаемся использовать кэш при ошибке
      const cached = readCachedPremium(profileId);
      if (cached) {
        setState(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const cached = readCachedPremium(profileId);
    if (cached) {
      setState(cached);
    }
    fetchStatus();
  }, [fetchStatus, profileId]);

  return {
    ...state,
    loading,
    refresh: fetchStatus,
  };
}


