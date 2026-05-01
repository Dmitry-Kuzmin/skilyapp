import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardData } from "./useDashboardData";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveSeason = {
  id: number;
  season_number: number;
  name_ru: string | null;
  name_es: string | null;
  name_en: string | null;
  description_ru?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  theme: string;
  start_date?: string;
  end_date?: string;
  days_remaining: number | null;
  is_active?: boolean;
};

export type SeasonProgress = {
  id: string | null;
  user_id?: string;
  season_id?: number;
  season_points: number;
  level: number;
  premium_pass_purchased: boolean;
};

export type SeasonRewardItem = {
  type: string;
  amount?: number;
  id?: string;
};

export type SeasonReward = {
  id: string;
  season_id: number;
  level: number;
  sp_required: number;
  free_reward: SeasonRewardItem | null;
  premium_reward: SeasonRewardItem | null;
};

export type ClaimedRewardRecord = { level: number; is_premium: boolean };

export type SeasonModalData = {
  activeSeason: ActiveSeason;
  seasonProgress: SeasonProgress;
  rewards: SeasonReward[];
  claimedRecords: ClaimedRewardRecord[];
  hasPremiumForever: boolean;
  hasPremiumPass: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Reads exclusively from the dashboardData React Query cache.
// get_dashboard_super_v2 already fetches everything needed — zero extra queries.

export function useSeasonModalData(
  _profileId: string | null | undefined,
  _enabled: boolean
): { data: SeasonModalData | null; isLoading: boolean } {
  const { data: dashboardData, loading } = useDashboardData();

  const data = useMemo((): SeasonModalData | null => {
    const season = dashboardData?.active_season;
    const progress = dashboardData?.season_progress;

    if (!season) return null;

    const activeSeason: ActiveSeason = {
      id: season.id,
      season_number: season.season_number,
      name_ru: season.name_ru ?? null,
      name_es: (season as any).name_es ?? null,
      name_en: (season as any).name_en ?? null,
      theme: season.theme ?? "special",
      start_date: (season as any).start_date,
      end_date: (season as any).end_date,
      days_remaining: season.days_remaining ?? null,
    };

    const seasonProgress: SeasonProgress = progress
      ? {
          id: progress.id ?? null,
          season_points: progress.season_points ?? 0,
          level: progress.level ?? 0,
          premium_pass_purchased: (progress as any).premium_pass_purchased ?? false,
        }
      : {
          id: null,
          season_points: 0,
          level: 0,
          premium_pass_purchased: false,
        };

    const rewards: SeasonReward[] = (dashboardData?.season_rewards ?? []) as SeasonReward[];
    const claimedRecords: ClaimedRewardRecord[] = dashboardData?.claimed_season_records ?? [];
    const hasPremiumForever = dashboardData?.has_premium_forever ?? false;
    const hasPremiumPass = seasonProgress.premium_pass_purchased;

    return { activeSeason, seasonProgress, rewards, claimedRecords, hasPremiumForever, hasPremiumPass };
  }, [dashboardData]);

  return { data, isLoading: loading };
}

// ─── Derived sets helper ───────────────────────────────────────────────────────

export type ClaimedSets = {
  claimedFreeRewards: Set<number>;
  claimedPremiumRewards: Set<number>;
};

export function buildClaimedSets(records: ClaimedRewardRecord[]): ClaimedSets {
  const claimedFreeRewards = new Set<number>();
  const claimedPremiumRewards = new Set<number>();
  for (const r of records) {
    if (r.is_premium) {
      claimedPremiumRewards.add(r.level);
    } else {
      claimedFreeRewards.add(r.level);
    }
  }
  return { claimedFreeRewards, claimedPremiumRewards };
}

export const SEASON_MODAL_QUERY_KEY = (profileId: string | null | undefined) =>
  ["dashboard-data", profileId] as const;

// Re-export for convenience in the modal
export { useQueryClient };
