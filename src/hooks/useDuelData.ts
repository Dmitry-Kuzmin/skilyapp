import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DuelDataCacheEntry {
  questions?: any[];
  players?: LoadPlayersResult | null;
  boosts?: BoostInventoryItem[] | null;
  betInfo?: BetInfo | null;
}

type DuelDataCache = Record<string, DuelDataCacheEntry>;

export interface LoadPlayersResult {
  myPlayerId: string | null;
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
  players: any[];
}

export interface BoostInventoryItem {
  boost_type: string;
  quantity: number;
}

export interface BetInfo {
  betAmount: number;
  totalBank: number;
  isHost: boolean;
  hostInsurance: boolean;
  opponentInsurance: boolean;
  coverageHost: number;
  coverageOpponent: number;
}

export const useDuelData = (duelId: string | null, profileId?: string | null) => {
  const cacheRef = useRef<DuelDataCache>({});

  const getCacheEntry = () => {
    const key = duelId || "__no_duel__";
    if (!cacheRef.current[key]) {
      cacheRef.current[key] = {};
    }
    return cacheRef.current[key]!;
  };

  const fetchQuestions = useCallback(async (): Promise<any[]> => {
    if (!duelId || !profileId) {
      return [];
    }

    const cache = getCacheEntry();
    if (cache.questions) {
      return cache.questions;
    }

    const loadViaEdge = async () => {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout: Edge Function не ответил за 30 секунд")), 30000);
          });

          const invokePromise = supabase.functions.invoke("duel-manager", {
            body: {
              action: "get_questions",
              duel_id: duelId,
              profile_id: profileId,
            },
          });

          const { data, error } = (await Promise.race([invokePromise, timeoutPromise])) as any;

          if (error) {
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }

          if (data?.questions?.length) {
            return data.questions;
          }
          break;
        } catch (err) {
          if (attempt === maxRetries - 1) {
            throw err;
          }
        }
      }
      return null;
    };

    const loadDirect = async () => {
      const { data, error } = await supabase
        .from("duel_questions")
        .select("*")
        .eq("duel_id", duelId)
        .order("position");

      if (error) {
        throw error;
      }

      if (!data?.length) {
        throw new Error("Вопросы не найдены");
      }

      return data;
    };

    let questions = null;
    try {
      questions = await loadViaEdge();
    } catch (error) {
      console.error("[useDuelData] Edge function questions error:", error);
    }

    if (!questions) {
      questions = await loadDirect();
    }

    cache.questions = questions;
    return questions;
  }, [duelId, profileId]);

  const enrichPlayersWithProfiles = async (players: any[]) => {
    const enriched = await Promise.all(
      players.map(async (player) => {
        if (player?.profiles?.first_name || player?.profiles?.username || player?.profiles?.photo_url) {
          return player;
        }
        if (!player?.user_id) {
          return player;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, username, photo_url")
          .eq("id", player.user_id)
          .maybeSingle();

        if (!error && data) {
          return { ...player, profiles: data };
        }
        return player;
      })
    );

    return enriched;
  };

  const fetchPlayers = useCallback(async (): Promise<LoadPlayersResult | null> => {
    if (!duelId) return null;

    const cache = getCacheEntry();
    if (cache.players) {
      return cache.players;
    }

    const buildResult = (players: any[]) => {
      const myPlayer = players.find((p) => p.user_id === profileId);
      const opponent = players.find((p) => p.user_id !== profileId);

      const myName = myPlayer?.name || myPlayer?.profiles?.first_name || myPlayer?.profiles?.username || "Ты";
      const opponentName =
        opponent?.name || opponent?.profiles?.first_name || opponent?.profiles?.username || "Соперник";

      return {
        myPlayerId: myPlayer?.id ?? null,
        myScore: myPlayer?.score ?? 0,
        opponentScore: opponent?.score ?? 0,
        myName,
        opponentName,
        players,
      };
    };

    try {
      const { data, error } = await supabase.functions.invoke("duel-manager", {
        body: {
          action: "get_players",
          duel_id: duelId,
          profile_id: profileId,
        },
      });

      if (!error && data?.players?.length) {
        const playersWithProfiles = await enrichPlayersWithProfiles(data.players);
        const result = buildResult(playersWithProfiles);
        cache.players = result;
        return result;
      }
    } catch (error) {
      console.error("[useDuelData] Edge function players error:", error);
    }

    const { data } = await supabase
      .from("duel_players")
      .select("*, profiles(first_name, username, photo_url)")
      .eq("duel_id", duelId);

    if (!data?.length) {
      return null;
    }

    const playersWithProfiles = await enrichPlayersWithProfiles(data);
    const result = buildResult(playersWithProfiles);
    cache.players = result;
    return result;
  }, [duelId, profileId]);

  const fetchBoostInventory = useCallback(async (): Promise<BoostInventoryItem[]> => {
    if (!profileId) return [];

    const cache = getCacheEntry();
    if (cache.boosts) {
      return cache.boosts;
    }

    const { data, error } = await supabase
      .from("boost_inventory")
      .select("boost_type, quantity")
      .eq("user_id", profileId);

    if (error) {
      throw error;
    }

    const boosts = data || [];
    cache.boosts = boosts;
    return boosts;
  }, [profileId]);

  const fetchBetInfo = useCallback(async (): Promise<BetInfo | null> => {
    if (!duelId) return null;

    const cache = getCacheEntry();
    if (cache.betInfo) {
      return cache.betInfo;
    }

    const { data: duelData, error: duelError } = await supabase
      .from("duels")
      .select("bet_amount, host_user")
      .eq("id", duelId)
      .single();

    if (duelError || !(duelData?.bet_amount > 0)) {
      return null;
    }

    const { data: betRow } = await supabase
      .from("duel_bets")
      .select("host_insurance_enabled, host_coverage_rate, opponent_insurance_enabled, opponent_coverage_rate")
      .eq("duel_id", duelId)
      .maybeSingle();

    const betInfo: BetInfo = {
      betAmount: duelData.bet_amount,
      totalBank: duelData.bet_amount * 2,
      isHost: duelData.host_user === profileId,
      hostInsurance: Boolean(betRow?.host_insurance_enabled),
      opponentInsurance: Boolean(betRow?.opponent_insurance_enabled),
      coverageHost: betRow?.host_coverage_rate || 0,
      coverageOpponent: betRow?.opponent_coverage_rate || 0,
    };

    cache.betInfo = betInfo;
    return betInfo;
  }, [duelId, profileId]);

  const invalidate = useCallback(() => {
    if (!duelId) return;
    delete cacheRef.current[duelId];
  }, [duelId]);

  return {
    fetchQuestions,
    fetchPlayers,
    fetchBoostInventory,
    fetchBetInfo,
    invalidate,
  };
};

