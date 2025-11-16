import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Trophy, Coins, Crown, Sparkles, X, Clock, BookOpen, Calendar, Target, CheckCircle2, Zap, Gift, Star, ArrowRight, ChevronRight, Flame, Gauge, Hourglass, Shield, Sticker, Swords, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SeasonChallengesWidget } from "./SeasonChallengesWidget";
import { PaywallModal } from "./PaywallModal";
import { PremiumRewardUpsell } from "./PremiumRewardUpsell";
import { RewardUnlockAnimation } from "../cosmetics/RewardUnlockAnimation";
import { PremiumPlanSelector } from "./PremiumPlanSelector";
import { Skeleton } from "@/components/ui/skeleton";

type TimeLeft = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type RewardDefinitionDetails = {
  name?: string;
  description?: string;
  rarity?: string;
  metadata?: Record<string, any>;
  color?: string;
  icon?: string;
};

type RewardVisualConfig = {
  label: string;
  icon: LucideIcon;
  color: string;
  defaultSubtitle: string;
};

const rarityLabelsMap: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпик",
  legendary: "Легенда",
};

const rarityColorsMap: Record<string, string> = {
  common: "text-slate-500",
  rare: "text-sky-500",
  epic: "text-purple-500",
  legendary: "text-amber-500",
};

const rewardTypeVisuals: Record<string, RewardVisualConfig> = {
  coins: {
    label: "Монеты",
    icon: Coins,
    color: "#fbbf24",
    defaultSubtitle: "Моментально на баланс",
  },
  skin: {
    label: "Скин",
    icon: Sparkles,
    color: "#a855f7",
    defaultSubtitle: "Новый образ профиля",
  },
  badge: {
    label: "Бейдж",
    icon: Shield,
    color: "#0ea5e9",
    defaultSubtitle: "Коллекция достижений",
  },
  boost: {
    label: "Буст",
    icon: Zap,
    color: "#f97316",
    defaultSubtitle: "Ускорение прогресса",
  },
  sticker: {
    label: "Стикер",
    icon: Sticker,
    color: "#ec4899",
    defaultSubtitle: "Эмоция в дуэлях",
  },
};

const seasonThemes: Record<
  string,
  {
    gradient: string;
    border: string;
    chip: string;
    accent: string;
    glow: string;
    decorativePrimary: string;
    decorativeSecondary: string;
  }
> = {
  special: {
    gradient: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800",
    border: "border-cyan-500/30",
    chip: "bg-white/10 text-white/80",
    accent: "text-cyan-200",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.35)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.35),transparent_60%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_80%_100%,rgba(251,191,36,0.25),transparent_55%)]",
  },
  summer: {
    gradient: "bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500",
    border: "border-orange-200/40",
    chip: "bg-white/20 text-white",
    accent: "text-amber-200",
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.35)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.35),transparent_60%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_85%_85%,rgba(236,72,153,0.35),transparent_60%)]",
  },
  autumn: {
    gradient: "bg-gradient-to-br from-amber-900 via-orange-900 to-stone-900",
    border: "border-amber-500/30",
    chip: "bg-amber-500/10 text-amber-200",
    accent: "text-amber-300",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.35)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_10%_10%,rgba(217,119,6,0.35),transparent_60%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_90%_90%,rgba(59,7,0,0.35),transparent_60%)]",
  },
  winter: {
    gradient: "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800",
    border: "border-blue-400/30",
    chip: "bg-white/10 text-white/80",
    accent: "text-sky-200",
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.35)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_30%_0%,rgba(125,211,252,0.35),transparent_60%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.25),transparent_60%)]",
  },
  spring: {
    gradient: "bg-gradient-to-br from-emerald-700 via-lime-700 to-teal-700",
    border: "border-emerald-400/30",
    chip: "bg-white/10 text-white/80",
    accent: "text-emerald-200",
    glow: "shadow-[0_0_40px_rgba(52,211,153,0.35)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.35),transparent_60%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_85%_90%,rgba(190,242,100,0.35),transparent_60%)]",
  },
};

const withAlpha = (hex?: string, alphaHex: string = "33") => {
  if (!hex || !hex.startsWith("#")) {
    return hex;
  }
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  return `${normalized}${alphaHex}`;
};

const formatTechnicalName = (value?: string) => {
  if (!value) return "Награда";
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

const formatSeasonDate = (date: Date | null) => {
  if (!date) return "—";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
};

const calculateTimeLeft = (endDate?: string | null): TimeLeft | null => {
  if (!endDate) return null;
  const difference = new Date(endDate).getTime() - Date.now();
  const total = Math.max(difference, 0);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { total, days, hours, minutes, seconds };
};

const CountdownTicker = memo(({ endDate }: { endDate?: string | null }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(endDate));

  useEffect(() => {
    if (!endDate) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(calculateTimeLeft(endDate));
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) {
    return <span className="text-white/70 text-sm">Даты уточняются</span>;
  }

  const units = [
    { label: "дни", value: String(Math.max(timeLeft.days, 0)).padStart(2, "0") },
    { label: "часы", value: String(Math.max(timeLeft.hours, 0)).padStart(2, "0") },
    { label: "мин", value: String(Math.max(timeLeft.minutes, 0)).padStart(2, "0") },
    { label: "сек", value: String(Math.max(timeLeft.seconds, 0)).padStart(2, "0") },
  ];

  const isUrgent = timeLeft.total < 1000 * 60 * 60 * 72;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center justify-center rounded-2xl bg-white/10 px-3 py-2 min-w-[64px]"
          >
            <motion.span
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold tabular-nums"
            >
              {unit.value}
            </motion.span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/70">{unit.label}</span>
          </div>
        ))}
      </div>
      {isUrgent && (
        <div className="mt-2 flex items-center gap-1 text-xs text-rose-100">
          <Flame className="w-4 h-4" />
          <span>Сезон скоро завершится — не откладывай награды!</span>
        </div>
      )}
    </>
  );
});
CountdownTicker.displayName = "CountdownTicker";

export function DuelPassSeasonModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profileId } = useUserContext();
  const { isPremium: isPremiumFromHook } = usePremium();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [rewardFilter, setRewardFilter] = useState<'all' | 'available'>('all');
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [seasonProgress, setSeasonProgress] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<Set<number>>(new Set());
  const [claimedFreeRewards, setClaimedFreeRewards] = useState<Set<number>>(new Set());
  const [claimedPremiumRewards, setClaimedPremiumRewards] = useState<Set<number>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [premiumRewardPreview, setPremiumRewardPreview] = useState<{level: number; premium_reward: any} | null>(null);
  const [unlockedReward, setUnlockedReward] = useState<any | null>(null);
  const [showPremiumSelector, setShowPremiumSelector] = useState(false);
  const [hasPremiumForever, setHasPremiumForever] = useState(false);
  const [hasPremiumPass, setHasPremiumPass] = useState(false);
  const [rewardDetails, setRewardDetails] = useState<Record<string, RewardDefinitionDetails>>({});
  
  // Итоговый Premium статус: либо из хука, либо Premium Forever, либо Premium Pass для сезона
  // ВАЖНО: Premium Forever дает доступ ко всем Premium наградам автоматически
  const isPremium = isPremiumFromHook || hasPremiumForever || hasPremiumPass;

  // Логирование для отладки Premium статуса
  useEffect(() => {
    if (open && profileId) {
      console.log('[DuelPassSeasonModal] Premium статус:', {
        isPremiumFromHook,
        hasPremiumForever,
        hasPremiumPass,
        isPremium,
        profileId
      });
    }
  }, [open, profileId, isPremiumFromHook, hasPremiumForever, hasPremiumPass, isPremium]);

  useEffect(() => {
    if (open && profileId) {
      loadSeasonData();
      
      // Проверяем, видел ли пользователь онбординг
      const hasSeenOnboarding = localStorage.getItem('duel-pass-onboarding-seen');
      if (!hasSeenOnboarding) {
        // Показываем онбординг после загрузки данных
        setTimeout(() => {
          setShowOnboarding(true);
        }, 500);
      }
    }
  }, [open, profileId]);

  // Автообновление данных каждые 30 секунд когда модалка открыта (тихое обновление без показа loading)
  useEffect(() => {
    if (open && profileId && activeSeason) {
      const interval = setInterval(() => {
        loadSeasonData(true); // true = тихое обновление
      }, 30000); // Увеличено до 30 секунд
      return () => clearInterval(interval);
    }
  }, [open, profileId, activeSeason]);

  useEffect(() => {
    if (!rewards.length) return;
    
    let isMounted = true;
    const loadRewardDefinitions = async () => {
      const typeMap: Record<string, Set<string>> = {
        skin: new Set<string>(),
        badge: new Set<string>(),
        sticker: new Set<string>(),
        boost: new Set<string>(),
      };

      rewards.forEach((reward) => {
        [reward.free_reward, reward.premium_reward].forEach((item) => {
          if (item?.id && typeof item.id === "string" && item.type && typeMap[item.type]) {
            typeMap[item.type].add(item.id);
          }
        });
      });

      const nextDetails: Record<string, RewardDefinitionDetails> = {};
      const parseMetadata = (metadata: any) => {
        if (!metadata) return undefined;
        if (typeof metadata === "object") return metadata;
        try {
          return JSON.parse(metadata);
        } catch (error) {
          console.warn("[DuelPassSeasonModal] Не удалось распарсить metadata награды", metadata, error);
          return undefined;
        }
      };

      const tasks: Promise<void>[] = [];

      if (typeMap.skin.size) {
        tasks.push(
          supabase
            .from("skin_definitions")
            .select("id, name_ru, description_ru, rarity, metadata")
            .in("id", Array.from(typeMap.skin))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Skin definitions error", error);
                return;
              }
              data?.forEach((item) => {
                const metadata = parseMetadata(item.metadata);
                nextDetails[`skin:${item.id}`] = {
                  name: item.name_ru,
                  description: item.description_ru,
                  rarity: item.rarity,
                  metadata,
                  color: metadata?.color,
                };
              });
            })
        );
      }

      if (typeMap.badge.size) {
        tasks.push(
          supabase
            .from("badge_definitions")
            .select("id, name_ru, description_ru, rarity, metadata")
            .in("id", Array.from(typeMap.badge))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Badge definitions error", error);
                return;
              }
              data?.forEach((item) => {
                const metadata = parseMetadata(item.metadata);
                nextDetails[`badge:${item.id}`] = {
                  name: item.name_ru,
                  description: item.description_ru,
                  rarity: item.rarity,
                  metadata,
                  color: metadata?.color,
                  icon: metadata?.icon,
                };
              });
            })
        );
      }

      if (typeMap.sticker.size) {
        tasks.push(
          supabase
            .from("sticker_definitions")
            .select("id, name_ru, description_ru, rarity, metadata")
            .in("id", Array.from(typeMap.sticker))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Sticker definitions error", error);
                return;
              }
              data?.forEach((item) => {
                const metadata = parseMetadata(item.metadata);
                nextDetails[`sticker:${item.id}`] = {
                  name: item.name_ru,
                  description: item.description_ru,
                  rarity: item.rarity,
                  metadata,
                  icon: metadata?.emoji,
                };
              });
            })
        );
      }

      if (typeMap.boost.size) {
        tasks.push(
          supabase
            .from("boost_definitions")
            .select("type, name_ru, description_ru, icon")
            .in("type", Array.from(typeMap.boost))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Boost definitions error", error);
                return;
              }
              data?.forEach((item) => {
                nextDetails[`boost:${item.type}`] = {
                  name: item.name_ru,
                  description: item.description_ru,
                  icon: item.icon,
                };
              });
            })
        );
      }

      if (!tasks.length) return;

      await Promise.allSettled(tasks);
      if (isMounted) {
        setRewardDetails((prev) => ({ ...prev, ...nextDetails }));
      }
    };

    loadRewardDefinitions();

    return () => {
      isMounted = false;
    };
  }, [rewards]);

  const loadSeasonData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      // Получаем активный сезон
      const { data: seasonData, error: seasonError } = await supabase
        .rpc("get_active_season");

      if (seasonError) {
        console.error("[DuelPassSeasonModal] Error loading season", seasonError);
        // Если функция не найдена (404), значит миграция не применена
        if (seasonError.code === 'PGRST116' || seasonError.message?.includes('404')) {
          console.error("[DuelPassSeasonModal] ⚠️ Миграция не применена! Примените файл APPLY_SEASON_MIGRATION_NOW.sql в Supabase SQL Editor");
        }
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      if (!seasonData || seasonData.length === 0) {
        console.warn("[DuelPassSeasonModal] No active season found");
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      const season = seasonData[0];
      setActiveSeason(season);

      const progressPromise = supabase
        .rpc("get_or_create_season_progress", {
          p_user_id: profileId,
          p_season_id: season.id,
        });
      const premiumPromise = supabase.rpc("has_premium_forever", { p_user_id: profileId });
      const rewardsPromise = supabase
        .from("duel_pass_season_rewards")
        .select("*")
        .eq("season_id", season.id)
        .order("level", { ascending: true });
      const claimedPromise = supabase
        .from("user_claimed_rewards")
        .select("level, is_premium")
        .eq("user_id", profileId)
        .eq("season", season.season_number);

      const [progressResult, premiumResult, rewardsResult, claimedResult] = await Promise.allSettled([
        progressPromise,
        premiumPromise,
        rewardsPromise,
        claimedPromise,
      ]);

      if (progressResult.status === "fulfilled") {
        const { data: progressData, error: progressError } = progressResult.value;
        if (progressError) {
          console.error("[DuelPassSeasonModal] Progress error", progressError);
        } else if (progressData && progressData.length > 0) {
          setSeasonProgress(progressData[0]);
          setHasPremiumPass(progressData[0].premium_pass_purchased || false);
        }
      } else {
        console.error("[DuelPassSeasonModal] Progress request failed", progressResult.reason);
      }

      const resolvePremiumFromProfile = async () => {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_type, subscription_status, premium_forever_purchased_at")
          .eq("id", profileId)
          .single();

        if (profileError) {
          console.error("[DuelPassSeasonModal] Profile fallback error:", profileError);
          setHasPremiumForever(false);
          return;
        }

        console.log("[DuelPassSeasonModal] Profile data for Premium Forever check:", {
          subscription_type: profileData?.subscription_type,
          subscription_status: profileData?.subscription_status,
          premium_forever_purchased_at: profileData?.premium_forever_purchased_at,
          profileId,
        });

        const isLifetime =
          !!profileData?.premium_forever_purchased_at &&
          profileData?.subscription_type === "lifetime" &&
          profileData?.subscription_status === "pro";

        console.log("[DuelPassSeasonModal] Premium Forever result (fallback):", isLifetime);
        setHasPremiumForever(isLifetime);
      };

      let premiumResolvedViaRpc = false;
      if (premiumResult.status === "fulfilled") {
        const { data: hasPremiumForeverData, error: premiumForeverError } = premiumResult.value;
        console.log("[DuelPassSeasonModal] Premium Forever check:", {
          hasPremiumForeverData,
          premiumForeverError,
          profileId,
        });

        if (!premiumForeverError && hasPremiumForeverData !== null && hasPremiumForeverData !== undefined) {
          console.log("[DuelPassSeasonModal] Premium Forever result (RPC):", hasPremiumForeverData === true);
          setHasPremiumForever(hasPremiumForeverData === true);
          premiumResolvedViaRpc = true;
        }
      } else {
        console.error("[DuelPassSeasonModal] Premium Forever RPC failed:", premiumResult.reason);
      }

      if (!premiumResolvedViaRpc) {
        await resolvePremiumFromProfile();
      }

      if (rewardsResult.status === "fulfilled") {
        const { data: rewardsData, error: rewardsError } = rewardsResult.value;
        if (rewardsError) {
          console.error("[DuelPassSeasonModal] Rewards error", rewardsError);
        } else if (rewardsData) {
          setRewards(rewardsData);
        }
      } else {
        console.error("[DuelPassSeasonModal] Rewards request failed", rewardsResult.reason);
      }

      if (claimedResult.status === "fulfilled") {
        const { data: claimedData, error: claimedError } = claimedResult.value;
        if (claimedError) {
          console.error("[DuelPassSeasonModal] Ошибка загрузки полученных наград:", claimedError);
        }

        if (claimedData) {
        console.log("[DuelPassSeasonModal] Загружено полученных наград из БД:", claimedData);
        const claimed = new Set<number>();
        const claimedFree = new Set<number>();
        const claimedPremium = new Set<number>();
        
        claimedData.forEach((item: { level: number; is_premium: boolean }) => {
          if (!item.is_premium) {
            // Бесплатная награда получена
            claimedFree.add(item.level);
            claimed.add(item.level);
            console.log(`[DuelPassSeasonModal] Бесплатная награда уровня ${item.level} помечена как полученная`);
          } else {
            // Premium награда получена
            claimedPremium.add(item.level);
            if (isPremium) {
              claimed.add(item.level);
            }
            console.log(`[DuelPassSeasonModal] Premium награда уровня ${item.level} помечена как полученная`);
          }
        });
        
        console.log("[DuelPassSeasonModal] Итоговые множества:", {
          claimedFree: Array.from(claimedFree),
          claimedPremium: Array.from(claimedPremium),
          claimed: Array.from(claimed)
        });
        
        setClaimedRewards(claimed);
        setClaimedFreeRewards(claimedFree);
        setClaimedPremiumRewards(claimedPremium);
        } else {
          console.log("[DuelPassSeasonModal] Нет полученных наград в БД");
        }
      } else {
        console.error("[DuelPassSeasonModal] Claimed rewards request failed", claimedResult.reason);
      }
    } catch (error) {
      console.error("[DuelPassSeasonModal] Load error", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleRewardClick = async (reward: any) => {
    console.log('[DuelPassSeasonModal] handleRewardClick:', {
      level: reward.level,
      hasFreeReward: !!reward.free_reward,
      hasPremiumReward: !!reward.premium_reward,
      isPremium,
      freeClaimed: claimedFreeRewards.has(reward.level),
      premiumClaimed: claimedPremiumRewards.has(reward.level)
    });
    
    // Если пользователь Premium и есть Premium награда - получаем Premium награду
    if (isPremium && reward.premium_reward && !claimedPremiumRewards.has(reward.level)) {
      // Сначала получаем бесплатную награду (если есть и еще не получена)
      if (reward.free_reward && !claimedFreeRewards.has(reward.level)) {
        await claimReward(reward.level, false);
      }
      // Затем получаем Premium награду
      await claimReward(reward.level, true);
    } else if (reward.free_reward && !claimedFreeRewards.has(reward.level)) {
      // Если есть бесплатная награда и она не получена - получаем её
      await claimReward(reward.level, false);
      
      // Если есть Premium награда и пользователь Premium, но Premium еще не получена - получаем Premium
      if (reward.premium_reward && isPremium && !claimedPremiumRewards.has(reward.level)) {
        // Небольшая задержка для показа анимации получения бесплатной награды
        setTimeout(async () => {
          await claimReward(reward.level, true);
        }, 500);
      } else if (reward.premium_reward && !isPremium) {
        // Если пользователь НЕ Premium - показываем модалку после получения бесплатной
        setTimeout(() => {
          setPremiumRewardPreview({
            level: reward.level,
            premium_reward: reward.premium_reward,
          });
        }, 500);
      }
    } else if (reward.premium_reward && !isPremium && !claimedPremiumRewards.has(reward.level)) {
      // Если есть только Premium награда и пользователь НЕ Premium - показываем модалку
      setPremiumRewardPreview({
        level: reward.level,
        premium_reward: reward.premium_reward,
      });
    } else if (isPremium && reward.premium_reward && !claimedPremiumRewards.has(reward.level)) {
      // Если пользователь Premium и Premium награда не получена - получаем её
      await claimReward(reward.level, true);
    }
  };

  const claimReward = async (level: number, isPremiumReward: boolean = false) => {
    if (!profileId || !activeSeason) return;

    try {
      const { data, error } = await supabase.functions.invoke("duel-pass-claim", {
        body: {
          user_id: profileId,
          level,
          is_premium: isPremiumReward ? isPremium : false,
          season: activeSeason.season_number,
        },
      });

      if (error) {
        // Игнорируем ошибку 409 (уже получено) - это нормально при последовательном получении
        if (error.status === 409 || error.statusCode === 409) {
          console.log(`[DuelPassSeasonModal] Reward already claimed for level ${level}, is_premium: ${isPremiumReward}`);
          return;
        }
        toast.error("Ошибка при получении награды", {
          description: error.message || "Попробуйте позже",
        });
        return;
      }

      // Показываем детали полученной награды
      if (data?.reward) {
        const reward = data.reward;
        
        // Для косметики (скины, бейджи, стикеры) показываем анимацию
        if (["skin", "badge", "sticker"].includes(reward.type) && reward.id) {
          // Загружаем определение косметики из БД
          const tableName = reward.type === "skin" ? "skin_definitions" : 
                           reward.type === "badge" ? "badge_definitions" : 
                           "sticker_definitions";
          
          const { data: definition } = await supabase
            .from(tableName)
            .select("*")
            .eq("id", reward.id)
            .single();
          
          if (definition) {
            setUnlockedReward({
              type: reward.type,
              id: reward.id,
              name_ru: definition.name_ru,
              description_ru: definition.description_ru,
              rarity: definition.rarity,
              metadata: definition.metadata,
            });
          }
        } else {
          // Для монет и бустов показываем toast
          let rewardText = "";
          
          if (reward.type === "coins" && reward.amount) {
            rewardText = `+${reward.amount} монет`;
          } else if (reward.type === "boost" && reward.id) {
            rewardText = `Буст: ${reward.id}`;
          } else {
            rewardText = "Награда получена!";
          }

          toast.success(
            isPremium ? "🎉 Премиум награда получена!" : "🎉 Награда получена!",
            {
              description: `Уровень ${level}: ${rewardText}`,
              duration: 4000,
            }
          );
        }
      } else {
        toast.success("Награда получена!");
      }

      // Обновляем локальное состояние
      if (isPremiumReward) {
        setClaimedPremiumRewards((prev) => new Set([...prev, level]));
        if (isPremium) {
          setClaimedRewards((prev) => new Set([...prev, level]));
        }
      } else {
        setClaimedFreeRewards((prev) => new Set([...prev, level]));
        setClaimedRewards((prev) => new Set([...prev, level]));
      }
      loadSeasonData(true); // Перезагружаем данные (тихое обновление)
    } catch (err: any) {
      console.error("[DuelPassSeasonModal] Claim error", err);
      toast.error("Ошибка при получении награды");
    }
  };

  // Skeleton контент для загрузки
  const SkeletonContent = () => (
    <>
      {/* Header Skeleton */}
      {isMobile ? (
        <SheetHeader className="px-4 pt-2 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </SheetHeader>
      ) : (
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </DialogHeader>
      )}

      <div className={cn("space-y-6", isMobile ? "px-4 py-4" : "px-6 py-6")}>
        {/* Progress Skeleton */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="h-6 w-16 ml-auto" />
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* SP Cards Skeleton */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-lg" />
          ))}
        </div>

        {/* Premium Pass Banner Skeleton */}
        <Skeleton className="h-24 w-full rounded-xl" />

        {/* Rewards Table Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
          
          {/* Table Header Skeleton */}
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-muted/50 border-b">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            
            {/* Table Rows Skeleton */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-2 px-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-6 w-12 rounded" />
                <Skeleton className="h-8 w-20 rounded-lg mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const seasonThemeKey = activeSeason?.theme ?? "special";
  const seasonTheme = useMemo(() => seasonThemes[seasonThemeKey] ?? seasonThemes.special, [seasonThemeKey]);
  const featuredRewards = useMemo(() => {
    const specials: { data: any; variant: 'free' | 'premium'; level: number }[] = [];
    rewards.forEach((reward) => {
      if (reward.premium_reward && reward.premium_reward.type !== "coins") {
        specials.push({ data: reward.premium_reward, variant: "premium", level: reward.level });
      }
      if (reward.free_reward && reward.free_reward.type && reward.free_reward.type !== "coins") {
        specials.push({ data: reward.free_reward, variant: "free", level: reward.level });
      }
    });
    return specials.slice(0, 3);
  }, [rewards]);

  if (!activeSeason || !seasonProgress) {
    // Показываем skeleton если еще загружается, иначе показываем ошибку
    if (loading) {
      return (
        <>
          {isMobile ? (
            <Sheet open={open} onOpenChange={onOpenChange}>
              <SheetContent 
                side="bottom" 
                className="h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0"
              >
                <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-background z-10 shrink-0">
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SkeletonContent />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={open} onOpenChange={onOpenChange}>
              <DialogContent className="w-[95vw] max-w-5xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0">
                <div className="flex-1 overflow-y-auto">
                  <SkeletonContent />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      );
    }
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duel Pass</DialogTitle>
            <DialogDescription>Система сезонов Duel Pass</DialogDescription>
          </DialogHeader>
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">Нет активного сезона</p>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="font-semibold mb-2">⚠️ Миграция не применена</p>
              <p className="text-xs mb-2">
                Для работы системы сезонов нужно применить миграцию в Supabase:
              </p>
              <ol className="text-xs list-decimal list-inside space-y-1 text-left">
                <li>Откройте SQL Editor в Supabase Dashboard</li>
                <li>Скопируйте содержимое файла <code className="bg-background px-1 rounded">APPLY_SEASON_MIGRATION_NOW.sql</code></li>
                <li>Выполните SQL запрос</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentSP = seasonProgress.season_points || 0;
  const currentLevel = seasonProgress.level || 1;
  const maxLevel = rewards.length || 30;
  const totalSPNeeded = rewards[rewards.length - 1]?.sp_required || 3000;
  const progressPercent = Math.min((currentSP / totalSPNeeded) * 100, 100);
  const seasonStartDate = activeSeason.start_date ? new Date(activeSeason.start_date) : null;
  const seasonEndDate = activeSeason.end_date ? new Date(activeSeason.end_date) : null;
  const seasonDaysRemaining = typeof activeSeason.days_remaining === "number" ? activeSeason.days_remaining : null;

  // Находим следующий уровень для расчета SP
  const nextLevelReward = rewards.find((r) => r.level === currentLevel + 1);
  const nextLevelSP = nextLevelReward?.sp_required || totalSPNeeded;
  const spToNextLevel = Math.max(0, nextLevelSP - currentSP);

  // Фильтрация наград
  const filteredRewards = rewards.filter((reward) => {
    const unlocked = currentLevel >= reward.level;
    const isClaimed = claimedRewards.has(reward.level);
    
    if (rewardFilter === 'available') {
      return unlocked && !isClaimed;
    }
    return true;
  });

  const getRewardVisualMeta = (rewardData: any) => {
    if (!rewardData) return null;

    const type = rewardData.type || "coins";
    const config = rewardTypeVisuals[type] || rewardTypeVisuals.coins;
    const key = rewardData.id ? `${type}:${rewardData.id}` : undefined;
    const definition = key ? rewardDetails[key] : undefined;
    const metadata = definition?.metadata;

    let title = definition?.name;
    if (!title) {
      if (type === "coins" && rewardData.amount) {
        title = `+${rewardData.amount} монет`;
      } else {
        title = formatTechnicalName(rewardData.id);
      }
    }

    const subtitle = definition?.description || config.defaultSubtitle;
    const tag = definition?.rarity ? rarityLabelsMap[definition.rarity] : config.label;
    const color = definition?.color || metadata?.color || config.color;
    const iconEmoji = definition?.icon || metadata?.emoji;

    return {
      title,
      subtitle,
      tag,
      color,
      iconEmoji,
      Icon: config.icon,
      rarityKey: definition?.rarity,
    };
  };

  const renderTableRewardCell = (
    rewardData: any,
    variant: 'free' | 'premium',
    options: { claimed: boolean; unlocked: boolean }
  ) => {
    if (!rewardData) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    const meta = getRewardVisualMeta(rewardData);
    if (!meta) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    const Icon = meta.Icon;

    return (
      <motion.div
        whileHover={{ scale: options.unlocked ? 1.015 : 1 }}
        className={cn(
          "rounded-xl border px-3 py-2 transition-all bg-muted/30 shadow-sm",
          variant === "premium" && "border-yellow-500/40 bg-yellow-500/5",
          options.claimed && "ring-1 ring-green-400/40",
          !options.unlocked && "opacity-60"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold"
            style={{
              background: meta.color
                ? `linear-gradient(135deg, ${withAlpha(meta.color, "33")}, ${withAlpha(meta.color, "11")})`
                : undefined,
              color: meta.color || undefined,
            }}
          >
            {meta.iconEmoji ? meta.iconEmoji : Icon ? <Icon className="w-5 h-5" /> : meta.title.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{meta.title}</p>
            <p className="text-xs text-muted-foreground truncate">{meta.subtitle}</p>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>{variant === "premium" ? "Premium" : "Free"}</span>
          <span className={cn("font-semibold", meta.rarityKey && rarityColorsMap[meta.rarityKey])}>
            {meta.tag}
          </span>
        </div>
      </motion.div>
    );
  };

  const renderHeroRewardCard = (
    reward: { data: any; variant: 'free' | 'premium'; level: number },
    index: number
  ) => {
    const meta = getRewardVisualMeta(reward.data);
    if (!meta) return null;
    const Icon = meta.Icon;

    return (
      <motion.div
        key={`${reward.variant}-${reward.level}-${index}`}
        whileHover={{ scale: 1.03 }}
        className="relative min-w-[180px] max-w-[220px] rounded-2xl border border-white/10 bg-white/5 p-3 text-white backdrop-blur"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-white/60">
          <span>{reward.variant === "premium" ? "Premium" : "Free"}</span>
          <span className="flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-white/70" />
            Ур. {reward.level}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-semibold"
            style={{
              background: meta.color
                ? `linear-gradient(135deg, ${withAlpha(meta.color, "66")}, ${withAlpha(meta.color, "22")})`
                : "rgba(255,255,255,0.1)",
            }}
          >
            {meta.iconEmoji ? meta.iconEmoji : Icon ? <Icon className="w-5 h-5" /> : meta.title.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{meta.title}</p>
            <p className="text-xs text-white/70 truncate">{meta.subtitle}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/70">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>{meta.tag}</span>
        </div>
      </motion.div>
    );
  };


  // Общий контент модалки
  const ModalContent = () => {
    // Показываем skeleton во время загрузки
    if (loading) {
      return <SkeletonContent />;
    }

    const seasonHighlights = [
      {
        icon: Gauge,
        title: "Темп сезона",
        value: `${currentLevel}/${maxLevel} уровень`,
        description:
          currentLevel < maxLevel
            ? `Еще ${spToNextLevel} SP до ${currentLevel + 1}-го уровня`
            : "Ты на вершине! Продолжай фармить SP ради славы",
      },
      {
        icon: Flame,
        title: "Коллекция Asphalt",
        value: `${claimedRewards.size}/${rewards.length} наград`,
        description: "Собери всю линию и разблокируй сезонный титул",
      },
      {
        icon: Hourglass,
        title: "Ограничение",
        value: seasonEndDate ? formatSeasonDate(seasonEndDate) : "Скоро",
        description: seasonDaysRemaining !== null
          ? `Осталось примерно ${seasonDaysRemaining} дней`
          : "Проверь даты сезона в календаре",
      },
    ];
    
    return (
    <>
      {/* Упрощенный Header */}
      {isMobile ? (
        <SheetHeader className="px-4 pt-2 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold">Duel Pass</SheetTitle>
              <SheetDescription className="text-xs mt-0.5 flex items-center gap-2">
                <span>{activeSeason.name_ru}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activeSeason.days_remaining} дней
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
      ) : (
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold">Duel Pass</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 flex items-center gap-2">
                <span>{activeSeason.name_ru}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activeSeason.days_remaining} дней
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      )}

      <div className={cn("space-y-6", isMobile ? "px-4 py-4" : "px-6 py-6")}>
        {/* Сезонный hero блок */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "relative overflow-hidden rounded-3xl border px-5 py-6 text-white",
            seasonTheme.gradient,
            seasonTheme.border,
            seasonTheme.glow
          )}
        >
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativePrimary)} />
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativeSecondary)} />
          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.3em]", seasonTheme.chip)}>
                  СЕЗОН №{activeSeason.season_number}
                </span>
                <span className={cn("text-xs uppercase tracking-[0.4em]", seasonTheme.accent)}>
                  {activeSeason.theme === "special" ? "Операция Асфальт" : activeSeason.name_en}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Calendar className="w-4 h-4" />
                <span>{formatSeasonDate(seasonStartDate)} — {formatSeasonDate(seasonEndDate)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">{activeSeason.name_ru}</h2>
              <p className="text-sm text-white/80 max-w-3xl">
                {activeSeason.description_ru || "Собирай монеты, бусты и эксклюзивные косметики, пока сезон открыт."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">До финала сезона</p>
                <CountdownTicker endDate={activeSeason.end_date} />
              </div>
              <div className="flex flex-col gap-2 text-sm text-white/85">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-4 h-4" />
                  <span>{activeSeason.days_remaining} дней до закрытия</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Осталось {Math.max(maxLevel - currentLevel, 0)} уровней до полного пропуска</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">Ключевые награды</p>
              <div className="flex flex-wrap gap-3">
                {featuredRewards.length
                  ? featuredRewards.map((reward, index) => renderHeroRewardCard(reward, index))
                  : (
                    <div className="text-sm text-white/80">
                      Эксклюзивные награды появятся после обновления сезона
                    </div>
                  )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Прогресс по уровням */}
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{currentLevel}</span>
                <span className="text-sm text-muted-foreground">/ {maxLevel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentLevel < maxLevel && spToNextLevel > 0 
                  ? `${spToNextLevel} SP до уровня ${currentLevel + 1}` 
                  : currentLevel >= maxLevel 
                  ? 'Максимальный уровень достигнут' 
                  : 'Загрузка...'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{currentSP}</p>
              <p className="text-xs text-muted-foreground">Season Points</p>
            </div>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg transition-all duration-500"
              style={{ left: `calc(${Math.min(progressPercent, 100)}% - 6px)` }}
            />
            {rewards.slice(0, 10).map((r) => {
              const position = (r.sp_required / totalSPNeeded) * 100;
              const isReached = currentSP >= r.sp_required;
              return (
                <div
                  key={r.level}
                  className={cn(
                    "absolute top-0 w-px h-3 transition-opacity",
                    isReached ? "bg-white/50" : "bg-muted-foreground/20"
                  )}
                  style={{ left: `${Math.min(position, 100)}%` }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Всего {totalSPNeeded} SP</span>
            <span>След. уровень через {spToNextLevel} SP</span>
          </div>
        </div>

        {/* Хайлайты сезона */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {seasonHighlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={`${item.title}-${index}`}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-border/50 bg-muted/20 p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">{item.title}</p>
                    <p className="text-sm font-semibold truncate">{item.value}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
        
        {/* Компактные карточки SP - горизонтальный layout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/50 hover:border-blue-500/50 transition-colors">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">+25</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/50 hover:border-purple-500/50 transition-colors">
            <Trophy className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold">+30</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/50 hover:border-green-500/50 transition-colors">
            <Calendar className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold">+15</span>
          </div>
          {isPremium ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-semibold">+20%</span>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenChange(false);
                setShowPaywall(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-yellow-500/30 hover:bg-yellow-500/10 transition-colors"
            >
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-semibold">+20%</span>
            </button>
          )}
        </motion.div>

        {/* Улучшенный баннер Premium Duel Pass */}
        {!hasPremiumPass && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => !hasPremiumForever && setShowPremiumSelector(true)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 transition-all duration-300",
              "bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20",
              "border-purple-500/30 hover:border-purple-500/50",
              !hasPremiumForever && "cursor-pointer hover:shadow-2xl hover:shadow-purple-500/20",
              "backdrop-blur-sm"
            )}
          >
            {/* Анимированный фон */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.3),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(236,72,153,0.3),transparent_50%)]" />
            
            {/* Декоративные элементы */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-2xl" />
            
            <div className="relative p-4 md:p-6">
              {/* Заголовок и цена */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative">
                      <Crown className="w-6 h-6 md:w-7 md:h-7 text-yellow-400 drop-shadow-lg" />
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="absolute inset-0"
                      >
                        <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-300 absolute -top-1 -right-1" />
                      </motion.div>
                    </div>
                    <h4 className="font-bold text-lg md:text-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                      Premium Duel Pass
                    </h4>
                    {hasPremiumForever && (
                      <Badge className="bg-green-500/90 text-white text-xs px-2 py-0.5 shadow-lg">
                        Бесплатно
                      </Badge>
                    )}
                  </div>
                  
                  {/* Описание */}
                  <p className="text-sm md:text-base text-foreground/90 mb-3 font-medium">
                    {hasPremiumForever 
                      ? 'У тебя Premium Forever - Duel Pass уже открыт!'
                      : 'Что такое Duel Pass?'}
                  </p>
                  
                  {!hasPremiumForever && (
                    <p className="text-xs md:text-sm text-muted-foreground mb-4 leading-relaxed">
                      Сезонная система наград, которая открывает эксклюзивные призы за прохождение дуэлей и выполнение заданий. Premium версия удваивает все награды!
                    </p>
                  )}
                </div>
                
                {/* Кнопка покупки */}
                {!hasPremiumForever && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0"
                  >
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPremiumSelector(true);
                      }}
                      size="lg"
                      className="w-full md:w-auto bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 px-6 py-6 md:py-3"
                    >
                      <Sparkles className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                      <span className="text-base md:text-sm">Купить за 7.99€</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                )}
              </div>
              
              {/* Выгоды Premium Duel Pass */}
              {!hasPremiumForever && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-purple-500/20">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">2x награды</p>
                      <p className="text-[10px] text-muted-foreground">Удвоенные монеты и XP</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
                      <Star className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Эксклюзивы</p>
                      <p className="text-[10px] text-muted-foreground">Уникальные косметики</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Быстрый старт</p>
                      <p className="text-[10px] text-muted-foreground">+5 уровней сразу</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Все сезоны</p>
                      <p className="text-[10px] text-muted-foreground">Доступ ко всем наградам</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Индикатор Premium Forever */}
        {/* Показываем ТОЛЬКО если действительно есть Premium Forever (без проверки hasPremiumPass) */}
        {hasPremiumForever && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-600">Premium Forever активен</p>
              <p className="text-xs text-muted-foreground">Duel Pass автоматически открыт для всех сезонов</p>
            </div>
          </div>
        )}

        {/* Современная таблица наград */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                Награды по уровням
              </h4>
              {seasonDaysRemaining !== null && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  До конца {seasonDaysRemaining}д
                </Badge>
              )}
            </div>
            {/* Фильтры */}
            <div className="flex gap-2">
              <button
                onClick={() => setRewardFilter('all')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  rewardFilter === 'all'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Все
              </button>
              <button
                onClick={() => setRewardFilter('available')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  rewardFilter === 'available'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Доступные
              </button>
            </div>
          </div>
          
          {/* Улучшенная таблица */}
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Уровень</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span>Бесплатно</span>
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span>Premium</span>
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">SP</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRewards.map((reward) => {
                    const unlocked = currentLevel >= reward.level;
                    const isCurrent = currentLevel === reward.level;
                    
                    // Проверяем наличие наград
                    const hasFreeReward = !!reward.free_reward; // Есть ли бесплатная награда вообще
                    const hasFreeCoins = reward.free_reward?.type === 'coins' && reward.free_reward?.amount;
                    const hasPremiumCoins = reward.premium_reward?.type === 'coins' && reward.premium_reward?.amount;
                    const hasPremiumOther = reward.premium_reward && reward.premium_reward.type !== 'coins';
                    
                    // Проверяем, какие награды получены
                    const freeClaimed = claimedFreeRewards.has(reward.level);
                    const premiumClaimed = claimedPremiumRewards.has(reward.level);
                    
                    // Правильная логика: allClaimed только если уровень разблокирован И все доступные награды получены
                    let allClaimed = false;
                    if (unlocked) {
                      // Проверяем бесплатную награду
                      // Если есть бесплатная награда - она должна быть получена
                      // Если нет бесплатной награды - не учитываем её (считаем "полученной" условно)
                      const freeRewardClaimed = hasFreeReward ? freeClaimed : true;
                      
                      // Проверяем Premium награду
                      let premiumRewardClaimed = true; // По умолчанию true (если нет Premium награды)
                      if (reward.premium_reward) {
                        if (isPremium) {
                          // Если пользователь Premium - Premium награда должна быть получена
                          premiumRewardClaimed = premiumClaimed;
                        } else {
                          // Если пользователь НЕ Premium - Premium награда недоступна
                          // НО! Если у уровня ТОЛЬКО Premium награда (нет бесплатной), то уровень НЕ может быть "получен"
                          // для не-Premium пользователя, пока он не станет Premium
                          // Если есть бесплатная награда - Premium не учитываем (она недоступна)
                          premiumRewardClaimed = hasFreeReward ? true : false; // Если нет бесплатной - Premium обязательна
                        }
                      }
                      
                      // КРИТИЧНО: Если у уровня ТОЛЬКО Premium награда (нет бесплатной) и пользователь НЕ Premium,
                      // то награда НЕ может быть получена (она недоступна)
                      if (!hasFreeReward && reward.premium_reward && !isPremium) {
                        allClaimed = false; // Premium награда недоступна для не-Premium пользователей
                      } else {
                        allClaimed = freeRewardClaimed && premiumRewardClaimed;
                      }
                      
                      // Логирование для отладки (только для нечетных уровней, чтобы не спамить)
                      if (reward.level % 2 === 1) {
                        console.log(`[DuelPassSeasonModal] Уровень ${reward.level}:`, {
                          unlocked,
                          hasFreeReward,
                          freeClaimed,
                          freeRewardClaimed,
                          hasPremiumReward: !!reward.premium_reward,
                          isPremium,
                          premiumClaimed,
                          premiumRewardClaimed,
                          allClaimed
                        });
                      }
                    } else {
                      // Уровень не разблокирован - не может быть "получен"
                      allClaimed = false;
                    }
                    
                    return (
                      <tr
                        key={reward.level}
                        className={cn(
                          "border-b border-border/50 transition-all cursor-pointer group",
                          isCurrent && "bg-primary/5 border-l-4 border-l-primary",
                          allClaimed 
                            ? "bg-green-500/5 hover:bg-green-500/10" 
                            : unlocked 
                            ? "hover:bg-muted/50" 
                            : "opacity-50"
                        )}
                        onClick={() => {
                          if (unlocked && !allClaimed) {
                            handleRewardClick(reward);
                          }
                        }}
                      >
                        {/* Уровень */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-all",
                              isCurrent 
                                ? "bg-primary text-primary-foreground shadow-sm" 
                                : allClaimed 
                                ? "bg-green-500/20 text-green-600" 
                                : unlocked 
                                ? "bg-muted text-foreground" 
                                : "bg-muted/50 text-muted-foreground"
                            )}>
                              {reward.level}
                            </div>
                            {isCurrent && (
                              <Badge variant="secondary" className="text-xs">
                                Текущий
                              </Badge>
                            )}
                          </div>
                        </td>
                        
                        {/* Free reward preview */}
                        <td className="px-4 py-3 align-top">
                          {renderTableRewardCell(reward.free_reward, 'free', { claimed: freeClaimed, unlocked })}
                        </td>
                        
                        {/* Premium reward preview */}
                        <td className="px-4 py-3 align-top">
                          {renderTableRewardCell(reward.premium_reward, 'premium', { claimed: premiumClaimed, unlocked })}
                        </td>
                        
                        {/* SP */}
                        <td className="px-4 py-3">
                          {!unlocked ? (
                            <Badge variant="outline" className="text-xs">
                              +{reward.sp_required - currentSP} SP
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        
                        {/* Действие */}
                        <td className="px-4 py-3 text-center">
                          {allClaimed ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <span className="text-xs font-medium text-green-600">Получено</span>
                            </div>
                          ) : unlocked ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRewardClick(reward);
                              }}
                              className={cn(
                                "h-8 px-4 text-xs font-medium",
                                // Если есть бесплатная награда и она не получена - обычная кнопка
                                // Если бесплатная получена, но есть премиум - желтая кнопка
                                // Если только премиум - желтая кнопка
                                ((hasFreeCoins && freeClaimed) || !hasFreeCoins) && reward.premium_reward && !isPremium && !premiumClaimed && "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-sm"
                              )}
                            >
                              {hasFreeReward && !freeClaimed ? (
                                // Есть бесплатная награда и она не получена
                                "Получить"
                              ) : !hasFreeReward && reward.premium_reward && !isPremium ? (
                                // Только Premium награда, но пользователь НЕ Premium - показываем что нужен Premium
                                <>
                                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                                  Premium
                                </>
                              ) : (reward.premium_reward && isPremium && !premiumClaimed) || (hasFreeReward && freeClaimed && reward.premium_reward && isPremium && !premiumClaimed) ? (
                                // Есть Premium награда, пользователь Premium, но Premium награда не получена
                                // Для Premium пользователей используем более понятный текст
                                <>
                                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                                  Забрать награду
                                </>
                              ) : (
                                // Все награды получены или нет доступных наград
                                "Забрать"
                              )}
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Заблокировано
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Season Challenges */}
        <div className="border-t pt-4">
          <SeasonChallengesWidget />
        </div>
      </div>
    </>
    );
  };

  return (
    <>
      {/* Онбординг модалка - минималистичный */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold">Добро пожаловать в Duel Pass!</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              Система сезонов с наградами за вашу активность
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Trophy className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Что такое Season Points (SP)?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  SP — это очки сезона, которые вы получаете за активность. 
                  Чем больше SP, тем выше ваш уровень и больше наград!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Sparkles className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Как получить SP?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Прохождение тестов: <strong className="text-foreground">25 SP</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Победа в дуэли: <strong className="text-foreground">30 SP</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Ежедневный вход: <strong className="text-foreground">15 SP</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Premium: <strong className="text-foreground">+20% к SP</strong></span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Crown className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Premium награды</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  С Premium подпиской вы получаете дополнительные награды на каждом уровне и бонус +20% к SP!
                </p>
              </div>
            </div>
            <Button 
              onClick={() => {
                localStorage.setItem('duel-pass-onboarding-seen', 'true');
                setShowOnboarding(false);
              }}
              className="w-full"
            >
              Понятно, начать!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модалка для десктопа, Sheet для мобилки */}
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent 
            side="bottom" 
            className="h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0"
          >
            {/* Handle для свайпа */}
            <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-background z-10 shrink-0">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <ModalContent />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="w-[95vw] max-w-5xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0">
            <div className="flex-1 overflow-y-auto">
              <ModalContent />
            </div>
          </DialogContent>
        </Dialog>
      )}

    <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    
    {/* Premium Reward Upsell Modal */}
    {premiumRewardPreview && (
      <PremiumRewardUpsell
        open={!!premiumRewardPreview}
        onOpenChange={(open) => {
          if (!open) setPremiumRewardPreview(null);
        }}
        reward={premiumRewardPreview}
        onGetPremium={() => {
          setShowPaywall(true);
          setPremiumRewardPreview(null);
        }}
      />
    )}
    
    {/* Reward Unlock Animation */}
    {unlockedReward && (
      <RewardUnlockAnimation
        open={!!unlockedReward}
        onOpenChange={(open) => {
          if (!open) setUnlockedReward(null);
        }}
        reward={unlockedReward}
      />
    )}

    {/* Premium Plan Selector */}
    <PremiumPlanSelector
      open={showPremiumSelector}
      onOpenChange={(open) => {
        setShowPremiumSelector(open);
        if (!open) {
          // Перезагружаем данные после закрытия селектора
          loadSeasonData(true);
        }
      }}
      triggerSource="duel_pass"
    />
    </>
  );
}

