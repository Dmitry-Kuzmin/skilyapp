import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const supabaseClient = supabase as any;

const isDev = process.env.NODE_ENV === "development";
const logWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};
const logError = (...args: any[]) => {
  if (isDev) console.error(...args);
};

const isCorsError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message || String(error);
  return (
    message.includes("access control") ||
    message.includes("CORS") ||
    message.includes("Load failed") ||
    message.includes("Failed to fetch")
  );
};

export type DuelPassData = {
  level: number;
  xp: number;
  progress: number;
  spToNextLevel: number;
  hasUnlockedFreeReward: boolean;
  hasUnlockedPremiumReward: boolean;
};

export type DuelPassSeasonData = {
  name_ru?: string;
  days_remaining?: number;
  end_date?: string;
} | null;

export const DEFAULT_DUEL_PASS_DATA: DuelPassData = Object.freeze({
  level: 1,
  xp: 0,
  progress: 0,
  spToNextLevel: 0,
  hasUnlockedFreeReward: false,
  hasUnlockedPremiumReward: false,
});

type DuelPassQueryResult = {
  duelPassData: DuelPassData;
  seasonData: DuelPassSeasonData;
};

const buildFallbackResult = (): DuelPassQueryResult => ({
  duelPassData: { ...DEFAULT_DUEL_PASS_DATA },
  seasonData: null,
});

const fetchDuelPass = async (profileId: string): Promise<DuelPassQueryResult> => {
  try {
    const [seasonResult, rewardsResult] = await Promise.allSettled([
      supabaseClient.rpc("get_active_season"),
      supabaseClient
        .from("duel_pass_season_rewards")
        .select("season_id, level, sp_required")
        .order("level", { ascending: true }),
    ]);

    if (seasonResult.status === "rejected") {
      const error = seasonResult.reason;
      if (isCorsError(error)) {
        logWarn("[useDuelPassData] CORS error loading season (likely auth)");
      } else {
        logWarn("[useDuelPassData] Error loading season:", error);
      }
      return buildFallbackResult();
    }

    const seasons = seasonResult.value.data;
    if (!seasons || seasons.length === 0) {
      logWarn("[useDuelPassData] No active season found");
      return buildFallbackResult();
    }

    const activeSeason = seasons[0];

    const { data: progressData, error: progressError } = await supabaseClient.rpc(
      "get_or_create_season_progress",
      {
        p_user_id: profileId,
        p_season_id: activeSeason.id,
      }
    );

    if (progressError) {
      if (isCorsError(progressError)) {
        logWarn("[useDuelPassData] CORS error loading season progress");
      } else {
        logWarn("[useDuelPassData] Error loading season progress:", progressError);
      }
      return buildFallbackResult();
    }

    if (!progressData || progressData.length === 0) {
      logWarn("[useDuelPassData] No season progress data");
      return buildFallbackResult();
    }

    const progress = progressData[0];
    const currentSP = progress.season_points || 0;
    const currentLevel = progress.level || 1;

    const { data: claimedRewardsData, error: claimedRewardsError } = await supabaseClient
      .from("user_claimed_rewards")
      .select("level, is_premium")
      .eq("user_id", profileId)
      .eq("season", activeSeason.id);

    if (claimedRewardsError) {
      logWarn("[useDuelPassData] Error loading claimed rewards:", claimedRewardsError);
    }

    const claimedFreeLevels = new Set<number>();
    const claimedPremiumLevels = new Set<number>();

    if (claimedRewardsData) {
      claimedRewardsData.forEach((record: { level: number; is_premium: boolean }) => {
        if (!record || !record.level) return;
        if (record.is_premium) {
          claimedPremiumLevels.add(record.level);
        } else {
          claimedFreeLevels.add(record.level);
        }
      });
    }

    const rewardsData =
      rewardsResult.status === "fulfilled" && rewardsResult.value.data
        ? rewardsResult.value.data.filter((reward: any) => reward.season_id === activeSeason.id)
        : [];

    const unlockedLevels = Math.max(currentLevel, 0);
    const claimedFreeUnlocked = Array.from(claimedFreeLevels).filter((lvl) => lvl <= currentLevel).length;
    const claimedPremiumUnlocked = Array.from(claimedPremiumLevels).filter((lvl) => lvl <= currentLevel).length;

    const hasUnlockedFreeReward = unlockedLevels > 0 && claimedFreeUnlocked < unlockedLevels;
    const hasUnlockedPremiumReward = unlockedLevels > 0 && claimedPremiumUnlocked < unlockedLevels;

    if (!rewardsData.length) {
      logWarn("[useDuelPassData] No rewards data for active season");
      return {
        duelPassData: {
          level: currentLevel,
          xp: currentSP,
          progress: 0,
          spToNextLevel: 0,
          hasUnlockedFreeReward,
          hasUnlockedPremiumReward,
        },
        seasonData: {
          name_ru: activeSeason.name_ru,
          days_remaining: activeSeason.days_remaining,
          end_date: activeSeason.end_date,
        },
      };
    }

    const nextLevelReward = rewardsData.find((reward: any) => reward.level === currentLevel + 1);
    const totalSPNeeded = rewardsData[rewardsData.length - 1]?.sp_required || 3000;
    const nextLevelSP = nextLevelReward?.sp_required || totalSPNeeded;
    const currentLevelRequirement =
      rewardsData.find((reward: any) => reward.level === currentLevel)?.sp_required || 0;
    const previousLevelRequirement =
      rewardsData.find((reward: any) => reward.level === currentLevel - 1)?.sp_required || 0;

    const spForCurrentLevel =
      currentLevel > 1
        ? Math.max(currentLevelRequirement - previousLevelRequirement, 1)
        : nextLevelSP;

    const spToNextLevel = Math.max(0, nextLevelSP - currentSP);
    const progressPercent =
      spForCurrentLevel > 0
        ? Math.min(((spForCurrentLevel - spToNextLevel) / spForCurrentLevel) * 100, 100)
        : 0;

    return {
      duelPassData: {
        level: currentLevel,
        xp: currentSP,
        progress: Math.max(0, progressPercent),
        spToNextLevel,
        hasUnlockedFreeReward,
        hasUnlockedPremiumReward,
      },
      seasonData: {
        name_ru: activeSeason.name_ru,
        days_remaining: activeSeason.days_remaining,
        end_date: activeSeason.end_date,
      },
    };
  } catch (error) {
    if (isCorsError(error)) {
      logWarn("[useDuelPassData] CORS error loading duel pass data");
    } else {
      logError("[useDuelPassData] Unexpected error:", error);
    }
    return buildFallbackResult();
  }
};

export const useDuelPassData = (profileId?: string | null) => {
  const enabled = Boolean(profileId);

  const query = useQuery<DuelPassQueryResult>({
    queryKey: ["duelPass", profileId],
    queryFn: () => fetchDuelPass(profileId as string),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 минуты - увеличиваем кэш
    gcTime: 10 * 60 * 1000, // 10 минут
    retry: 1,
    refetchInterval: false, // Отключаем автообновление
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false, // Не обновляем при фокусе
    refetchOnMount: false, // Не обновляем при монтировании
  });

    return {
      ...query,
      duelPassData: query.data?.duelPassData ?? (enabled ? { ...DEFAULT_DUEL_PASS_DATA } : null),
      seasonData: query.data?.seasonData ?? null,
    };
};

