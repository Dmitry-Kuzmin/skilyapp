import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "./useDashboardData";

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

const fetchDuelPass = async (
  profileId: string,
  dashboardData?: any
): Promise<DuelPassQueryResult> => {
  try {
    // ОПТИМИЗАЦИЯ: Используем данные из Super RPC Dashboard если доступны
    // ВАЖНО: season_progress может быть null для нового пользователя - это нормально!
    let activeSeason: any = null;
    let progressData: any = null;

    if (dashboardData?.active_season) {
      activeSeason = dashboardData.active_season;
      // Если прогресса нет (null) - создаем дефолтный объект с нулевыми значениями
      // НЕ вызываем get_or_create_season_progress автоматически!
      const progress = dashboardData.season_progress || {
        id: null,
        user_id: profileId,
        season_id: dashboardData.active_season.id,
        season_points: 0,
        level: 0,
        premium_pass_purchased: false,
        premium_pass_purchased_at: null,
        levels_skipped: 0,
        final_level: null,
        final_sp: null,
        created_at: null,
        updated_at: null,
      };
      progressData = { data: [progress] };
      logWarn("[useDuelPassData] ✅ Using season data from Super RPC", {
        hasProgress: !!dashboardData.season_progress,
        isNewUser: !dashboardData.season_progress,
      });
    } else {
      // Fallback: отдельные запросы
      const [seasonResult] = await Promise.allSettled([
        supabaseClient.rpc("get_active_season"),
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

      activeSeason = seasons[0];

      const progressResult = await supabaseClient.rpc(
        "get_or_create_season_progress",
        {
          p_user_id: profileId,
          p_season_id: activeSeason.id,
        }
      );
      
      if (progressResult.error) {
        if (isCorsError(progressResult.error)) {
          logWarn("[useDuelPassData] CORS error loading season progress");
        } else {
          logWarn("[useDuelPassData] Error loading season progress:", progressResult.error);
        }
        return buildFallbackResult();
      }
      
      progressData = progressResult;
    }

    // Загружаем награды сезона (этот запрос можно тоже добавить в Super RPC позже)
    const rewardsResult = await Promise.allSettled([
      supabaseClient
        .from("duel_pass_season_rewards")
        .select("season_id, level, sp_required")
        .order("level", { ascending: true }),
    ]);

    if (!progressData || !progressData.data || progressData.data.length === 0) {
      logWarn("[useDuelPassData] No season progress data");
      return buildFallbackResult();
    }

    const progress = progressData.data[0];
    // ВАЖНО: Для нового пользователя (season_progress = null) используем уровень 0, а не 1
    // Прогресс создается только когда пользователь реально начинает играть
    const currentSP = progress.season_points || 0;
    const currentLevel = progress.level ?? 0; // Уровень 0 для нового пользователя

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
  // ОПТИМИЗАЦИЯ: Используем данные из Super RPC Dashboard
  const { data: dashboardData } = useDashboardData();

  const query = useQuery<DuelPassQueryResult>({
    queryKey: ["duelPass", profileId],
    queryFn: () => fetchDuelPass(profileId as string, dashboardData),
    enabled: enabled && !!dashboardData, // Ждем загрузки dashboard
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 10 * 60 * 1000, // 10 минут
    retry: 1,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

    return {
      ...query,
      duelPassData: query.data?.duelPassData ?? (enabled ? { ...DEFAULT_DUEL_PASS_DATA } : null),
      seasonData: query.data?.seasonData ?? null,
    };
};

