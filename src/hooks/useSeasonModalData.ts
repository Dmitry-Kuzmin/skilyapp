import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const supabaseAny = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveSeason = {
  id: number;
  season_number: number;
  name_ru: string | null;
  name_es: string | null;
  name_en: string | null;
  description_ru: string | null;
  description_es: string | null;
  description_en: string | null;
  theme: string;
  start_date: string;
  end_date: string;
  days_remaining: number | null;
  is_active: boolean;
};

export type SeasonProgress = {
  id: string | null;
  user_id: string;
  season_id: number;
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

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchSeasonModalData(profileId: string): Promise<SeasonModalData | null> {
  const { data: seasons, error: seasonError } = await supabase.rpc("get_active_season");
  if (seasonError || !seasons?.length) return null;

  const season = seasons[0] as ActiveSeason;

  const [progressResult, rewardsResult, claimedResult, premiumResult] = await Promise.allSettled([
    supabase.rpc("get_or_create_season_progress", {
      p_user_id: profileId,
      p_season_id: season.id,
    }),
    supabase
      .from("duel_pass_season_rewards")
      .select("*")
      .eq("season_id", season.id)
      .order("level", { ascending: true }),
    supabase
      .from("user_claimed_rewards")
      .select("level, is_premium")
      .eq("user_id", profileId)
      .eq("season", season.season_number),
    supabaseAny.rpc("has_premium_forever", { p_user_id: profileId }),
  ]);

  const progressData =
    progressResult.status === "fulfilled" && !progressResult.value.error
      ? progressResult.value.data?.[0] ?? null
      : null;

  if (!progressData) return null;

  const rewards: SeasonReward[] =
    rewardsResult.status === "fulfilled" && !rewardsResult.value.error
      ? (rewardsResult.value.data ?? [])
      : [];

  const claimedRecords: ClaimedRewardRecord[] =
    claimedResult.status === "fulfilled" && !claimedResult.value.error
      ? (claimedResult.value.data ?? [])
      : [];

  let hasPremiumForever = false;
  if (premiumResult.status === "fulfilled" && !premiumResult.value.error && premiumResult.value.data != null) {
    hasPremiumForever = premiumResult.value.data === true;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_type, subscription_status, premium_forever_purchased_at")
      .eq("id", profileId)
      .single();
    hasPremiumForever = !!(
      profile?.premium_forever_purchased_at &&
      profile.subscription_type === "lifetime" &&
      profile.subscription_status === "pro"
    );
  }

  return {
    activeSeason: season,
    seasonProgress: progressData as SeasonProgress,
    rewards,
    claimedRecords,
    hasPremiumForever,
    hasPremiumPass: progressData.premium_pass_purchased ?? false,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const SEASON_MODAL_QUERY_KEY = (profileId: string | null | undefined) =>
  ["season-modal", profileId] as const;

export function useSeasonModalData(profileId: string | null | undefined, enabled: boolean) {
  return useQuery<SeasonModalData | null>({
    queryKey: SEASON_MODAL_QUERY_KEY(profileId),
    queryFn: () => fetchSeasonModalData(profileId!),
    enabled: Boolean(profileId) && enabled,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
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

// Re-export for convenience in the modal
export { useQueryClient };
