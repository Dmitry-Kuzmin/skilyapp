import React, { memo, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useSeasonModalData,
  buildClaimedSets,
  SEASON_MODAL_QUERY_KEY,
  useQueryClient,
  type ActiveSeason,
  type SeasonProgress,
  type SeasonReward,
} from "@/hooks/useSeasonModalData";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { usePremium } from "@/hooks/usePremium";
import { useIsMobile } from "@/hooks/use-mobile";
import { Trophy, Coins, Crown, Sparkles, X, Clock, BookOpen, Calendar, Target, CheckCircle2, Check, Zap, Gift, Star, ArrowRight, ChevronRight, Flame, Gauge, Hourglass, Shield, Sticker, Swords, Award, BarChart3, Users, Rocket, Lock, LockOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DailyQuestWidget } from "@/components/duel/pass/DailyQuestWidget";
import { PaywallModal } from "./PaywallModal";
import { PremiumRewardUpsell } from "./PremiumRewardUpsell";
import { RewardUnlockAnimation } from "../cosmetics/RewardUnlockAnimation";
import { Skeleton } from "@/components/ui/skeleton";
import { useModalRoute } from "@/hooks/useModalRoute";
import { DuelPassLeaderboardView } from "@/components/leaderboard/DuelPassLeaderboardModal";
import { HallOfFameView } from "@/components/HallOfFameModal";
import { DUEL_PASS_NEW_LAYOUT } from "@/lib/feature-flags";

const supabaseClient = supabase as any;

// Season-end leaderboard prize amounts (TODO: move to duel_pass_seasons table columns)
const SEASON_PRIZE_2ND = 500;
const SEASON_PRIZE_3RD = 250;

const localeMap: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  ru: "ru-RU",
};

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

const rarityLabelKeys: Record<string, string> = {
  common: "duelPass.rarity.common",
  rare: "duelPass.rarity.rare",
  epic: "duelPass.rarity.epic",
  legendary: "duelPass.rarity.legendary",
};

const rarityColorsMap: Record<string, string> = {
  common: "text-slate-500",
  rare: "text-sky-500",
  epic: "text-blue-500",
  legendary: "text-amber-500",
};

const rewardTypeVisuals: Record<
  string,
  RewardVisualConfig & { labelKey: string; subtitleKey: string }
> = {
  coins: {
    label: "",
    labelKey: "duelPass.rewardTypes.coins.label",
    icon: Coins,
    color: "#fbbf24",
    defaultSubtitle: "",
    subtitleKey: "duelPass.rewardTypes.coins.subtitle",
  },
  skin: {
    label: "",
    labelKey: "duelPass.rewardTypes.skin.label",
    icon: Sparkles,
    color: "#a855f7",
    defaultSubtitle: "",
    subtitleKey: "duelPass.rewardTypes.skin.subtitle",
  },
  badge: {
    label: "",
    labelKey: "duelPass.rewardTypes.badge.label",
    icon: Shield,
    color: "#0ea5e9",
    defaultSubtitle: "",
    subtitleKey: "duelPass.rewardTypes.badge.subtitle",
  },
  boost: {
    label: "",
    labelKey: "duelPass.rewardTypes.boost.label",
    icon: Zap,
    color: "#f97316",
    defaultSubtitle: "",
    subtitleKey: "duelPass.rewardTypes.boost.subtitle",
  },
  sticker: {
    label: "",
    labelKey: "duelPass.rewardTypes.sticker.label",
    icon: Sticker,
    color: "#ec4899",
    defaultSubtitle: "",
    subtitleKey: "duelPass.rewardTypes.sticker.subtitle",
  },
  trophy: {
    label: "",
    labelKey: "duelPass.rewardTypes.trophy.label",
    icon: Trophy,
    color: "#fcd34d",
    defaultSubtitle: "",
    subtitleKey: "duelPass.rewardTypes.trophy.subtitle",
  },
};

const resolveRewardType = (rewardData: any): string => {
  if (!rewardData) return "coins";
  const directType =
    rewardData.type ||
    rewardData.reward_type ||
    rewardData.rewardType ||
    rewardData.category;
  if (directType && rewardTypeVisuals[directType]) {
    return directType;
  }

  const identifier = (rewardData.id || rewardData.slug || rewardData.name || "")
    .toString()
    .toLowerCase();

  if (identifier.includes("trophy")) return "trophy";
  if (identifier.includes("badge")) return "badge";
  if (identifier.includes("skin")) return "skin";
  if (identifier.includes("sticker")) return "sticker";
  if (identifier.includes("boost")) return "boost";

  return "coins";
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
    // Дополнительные токены для UI-элементов
    progressGradient: string;   // градиент прогресс-бара
    progressGlow: string;       // box-shadow неона на прогресс-баре
    particleClass: string;      // css-класс частиц фона
  }
> = {
  // Сезон 1 & 4 — Асфальт / Ночной Город (неоново-синий)
  special: {
    gradient: "bg-gradient-to-br from-[#0f0518] via-slate-900 to-[#020024]",
    border: "border-fuchsia-500/30",
    chip: "bg-white/10 text-white/80",
    accent: "text-fuchsia-300",
    glow: "shadow-[0_0_50px_rgba(188,19,254,0.30)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_20%_0%,rgba(188,19,254,0.30),transparent_55%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_80%_100%,rgba(204,255,0,0.15),transparent_55%)]",
    progressGradient: "from-fuchsia-600 via-purple-500 to-pink-500",
    progressGlow: "0 0 12px rgba(188,19,254,0.70), 0 0 4px rgba(188,19,254,0.90)",
    particleClass: "season-particle-grid",
  },
  // Сезон 3 — Скорость (оранжево-красный, карбон)
  summer: {
    gradient: "bg-gradient-to-br from-neutral-900 via-stone-900 to-[#1a0000]",
    border: "border-orange-500/40",
    chip: "bg-white/10 text-orange-200",
    accent: "text-orange-300",
    glow: "shadow-[0_0_50px_rgba(255,69,0,0.30)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_15%_15%,rgba(255,69,0,0.25),transparent_55%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_85%_85%,rgba(220,38,38,0.20),transparent_55%)]",
    progressGradient: "from-yellow-400 via-orange-500 to-red-600",
    progressGlow: "0 0 12px rgba(255,100,0,0.70), 0 0 4px rgba(255,69,0,0.90)",
    particleClass: "season-particle-sparks",
  },
  // Autumn — запасная осенняя
  autumn: {
    gradient: "bg-gradient-to-br from-amber-900 via-orange-900 to-stone-900",
    border: "border-amber-500/30",
    chip: "bg-amber-500/10 text-amber-200",
    accent: "text-amber-300",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.35)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_10%_10%,rgba(217,119,6,0.35),transparent_60%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_90%_90%,rgba(59,7,0,0.35),transparent_60%)]",
    progressGradient: "from-amber-400 via-orange-500 to-red-700",
    progressGlow: "0 0 12px rgba(245,158,11,0.60), 0 0 4px rgba(245,158,11,0.80)",
    particleClass: "season-particle-dust",
  },
  // Сезон 2 — Буря (электрический синий)
  winter: {
    gradient: "bg-gradient-to-b from-slate-900 via-[#020b2e] to-[#020024]",
    border: "border-cyan-400/40",
    chip: "bg-cyan-500/10 text-cyan-200",
    accent: "text-cyan-300",
    glow: "shadow-[0_0_50px_rgba(0,240,255,0.25)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_30%_0%,rgba(0,240,255,0.20),transparent_55%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.20),transparent_55%)]",
    progressGradient: "from-sky-500 via-cyan-400 to-blue-500",
    progressGlow: "0 0 12px rgba(0,240,255,0.70), 0 0 4px rgba(0,240,255,0.90)",
    particleClass: "season-particle-rain",
  },
  // Spring
  spring: {
    gradient: "bg-gradient-to-br from-emerald-700 via-lime-700 to-teal-700",
    border: "border-emerald-400/30",
    chip: "bg-white/10 text-white/80",
    accent: "text-emerald-200",
    glow: "shadow-[0_0_40px_rgba(52,211,153,0.35)]",
    decorativePrimary: "bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.35),transparent_60%)]",
    decorativeSecondary: "bg-[radial-gradient(circle_at_85%_90%,rgba(190,242,100,0.35),transparent_60%)]",
    progressGradient: "from-emerald-400 via-lime-400 to-teal-400",
    progressGlow: "0 0 12px rgba(52,211,153,0.60), 0 0 4px rgba(52,211,153,0.80)",
    particleClass: "season-particle-dust",
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

const formatTechnicalName = (value?: string, fallback: string = "") => {
  if (!value) return fallback;
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

const getLocalizedDbField = (
  record: Record<string, any> | null | undefined,
  field: string,
  language: Language,
  fallback: string = ""
) => {
  if (!record) return fallback;

  const candidates = language === "ru"
    ? [record[`${field}_ru`], record[`${field}_en`], record[`${field}_es`]]
    : language === "es"
      ? [record[`${field}_es`], record[`${field}_en`], record[`${field}_ru`]]
      : [record[`${field}_en`], record[`${field}_es`], record[`${field}_ru`]];

  const match = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof match === "string" ? match : fallback;
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

interface CountdownLabels {
  dateTbc: string;
  units: { days: string; hours: string; minutes: string; seconds: string };
  urgent: string;
}

const CountdownTicker = memo(({ endDate, labels }: { endDate?: string | null; labels: CountdownLabels }) => {
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
    return <span className="text-white/70 text-sm">{labels.dateTbc}</span>;
  }

  const units = [
    { label: labels.units.days, value: String(Math.max(timeLeft.days, 0)).padStart(2, "0") },
    { label: labels.units.hours, value: String(Math.max(timeLeft.hours, 0)).padStart(2, "0") },
    { label: labels.units.minutes, value: String(Math.max(timeLeft.minutes, 0)).padStart(2, "0") },
    { label: labels.units.seconds, value: String(Math.max(timeLeft.seconds, 0)).padStart(2, "0") },
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
          <span>{labels.urgent}</span>
        </div>
      )}
    </>
  );
});
CountdownTicker.displayName = "CountdownTicker";

export function DuelPassSeasonModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profileId } = useUserContext();
  const { t, language } = useLanguage();
  const { isPremium: isPremiumFromHook } = usePremium();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<'main' | 'hall_of_fame'>('main');
  const [activeTab, setActiveTab] = useState<'pass' | 'leaders'>('pass');

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setCurrentView('main'); setActiveTab('pass'); }, 300);
    }
  }, [open]);

  const dateLocale = localeMap[language] || "en-US";
  const dp = React.useCallback(
    (path: string, params?: Record<string, string | number>) => t(`duelPass.${path}`, params),
    [t]
  );
  const walletText = React.useCallback(
    (path: string, params?: Record<string, string | number>) => t(`wallet.${path}`, params),
    [t]
  );
  const [rewardFilter, setRewardFilter] = useState<'all' | 'available'>('all');
  const [claimingRewards, setClaimingRewards] = useState<Set<string>>(new Set());
  const [showPaywall, setShowPaywall] = useState(false);
  const [premiumRewardPreview, setPremiumRewardPreview] = useState<{ level: number; premium_reward: any } | null>(null);
  const [cosmeticQueue, setCosmeticQueue] = useState<any[]>([]);
  const [activeCosmeticReward, setActiveCosmeticReward] = useState<any | null>(null);
  const [isApplyingAppearance, setIsApplyingAppearance] = useState(false);
  const [rewardDetails, setRewardDetails] = useState<Record<string, RewardDefinitionDetails>>({});

  const queryClient = useQueryClient();

  // ─── Season data via React Query (single source of truth) ──────────────────
  const { data: seasonData, isLoading: loading } = useSeasonModalData(profileId, open);

  const activeSeason: ActiveSeason | null = seasonData?.activeSeason ?? null;
  const seasonProgress: SeasonProgress | null = seasonData?.seasonProgress ?? null;
  const rewards: SeasonReward[] = seasonData?.rewards ?? [];
  const hasPremiumForever = seasonData?.hasPremiumForever ?? false;
  const hasPremiumPass = seasonData?.hasPremiumPass ?? false;

  const { claimedFreeRewards, claimedPremiumRewards } = useMemo(
    () => buildClaimedSets(seasonData?.claimedRecords ?? []),
    [seasonData?.claimedRecords]
  );

  useEffect(() => {
    if (!activeCosmeticReward && cosmeticQueue.length > 0) {
      setActiveCosmeticReward(cosmeticQueue[0]);
      setCosmeticQueue((prev) => prev.slice(1));
    }
  }, [cosmeticQueue, activeCosmeticReward]);

  const formatSeasonDate = React.useCallback((date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString(dateLocale, { day: "2-digit", month: "long" });
  }, [dateLocale]);

  const getRarityLabel = React.useCallback(
    (rarity?: string) => {
      if (!rarity) return undefined;
      const key = rarityLabelKeys[rarity];
      return key ? t(key) : undefined;
    },
    [t]
  );

  const countdownLabels = useMemo(
    () => ({
      dateTbc: dp("countdown.dateTbc"),
      urgent: dp("countdown.urgent"),
      units: {
        days: dp("countdown.units.days"),
        hours: dp("countdown.units.hours"),
        minutes: dp("countdown.units.minutes"),
        seconds: dp("countdown.units.seconds"),
      },
    }),
    [dp]
  );

  const premiumBannerTexts = useMemo(
    () => ({
      title: dp("premiumBanner.title"),
      freeBadge: dp("premiumBanner.freeBadge"),
      descriptionForever: dp("premiumBanner.descriptionForever"),
      descriptionQuestion: dp("premiumBanner.descriptionQuestion"),
      descriptionText: dp("premiumBanner.descriptionText"),
      buyCta: dp("premiumBanner.buyCta"),
      benefits: {
        double: {
          title: dp("premiumBanner.benefits.double.title"),
          description: dp("premiumBanner.benefits.double.description"),
        },
        exclusive: {
          title: dp("premiumBanner.benefits.exclusive.title"),
          description: dp("premiumBanner.benefits.exclusive.description"),
        },
        fastStart: {
          title: dp("premiumBanner.benefits.fastStart.title"),
          description: dp("premiumBanner.benefits.fastStart.description"),
        },
        allSeasons: {
          title: dp("premiumBanner.benefits.allSeasons.title"),
          description: dp("premiumBanner.benefits.allSeasons.description"),
        },
      },
    }),
    [dp]
  );

  const uiText = useMemo(
    () => ({
      leaderboardShort: language === "ru" ? "Лидеры" : language === "es" ? "Líderes" : "Leaders",
      leaderboardTitle: language === "ru" ? "Таблица лидеров" : language === "es" ? "Clasificación" : "Leaderboard",
      leaderboardSeason: language === "ru" ? "Таблица лидеров сезона" : language === "es" ? "Clasificación de la temporada" : "Season leaderboard",
      leaderboardTooltip: language === "ru" ? "Посмотреть рейтинг участников сезона" : language === "es" ? "Ver la clasificación de la temporada" : "View the season ranking",
      elitePassXp: language === "ru" ? "x2 Опыт" : language === "es" ? "x2 experiencia" : "2x XP",
      elitePassDescription: language === "ru"
        ? "Премиум-награды, секретные образы профиля и удвоенный прогресс."
        : language === "es"
          ? "Recompensas premium, perfiles secretos y progreso duplicado."
          : "Premium rewards, secret profile looks and doubled progress.",
      activate: language === "ru" ? "Активировать" : language === "es" ? "Activar" : "Activate",
      mobileFree: language === "ru" ? "Бесп." : language === "es" ? "Gratis" : "Free",
      placeLabel: (rank: number) => language === "ru" ? `${rank} место` : language === "es" ? `${rank} puesto` : `${rank} place`,
      featured: {
        premiumAccess: language === "ru" ? "Premium доступ" : language === "es" ? "Acceso premium" : "Premium access",
        mainReward: language === "ru" ? "Главная награда" : language === "es" ? "Recompensa principal" : "Main reward",
        rewardForPlace: (rank: number) => language === "ru" ? `Награда за ${rank} место` : language === "es" ? `Recompensa por el puesto ${rank}` : `Reward for ${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} place`,
      },
    }),
    [language]
  );

  const activeSeasonName = useMemo(
    () => getLocalizedDbField(activeSeason, "name", language, dp("title")),
    [activeSeason, language, dp]
  );
  const activeSeasonDescription = useMemo(
    () => getLocalizedDbField(activeSeason, "description", language, dp("hero.defaultDescription")),
    [activeSeason, language, dp]
  );

  // Итоговый Premium статус: либо из хука, либо Premium Forever, либо Premium Pass для сезона
  // ВАЖНО: Premium Forever дает доступ ко всем Premium наградам автоматически
  const isPremium = isPremiumFromHook || hasPremiumForever || hasPremiumPass;

  // --- Derived data & Memos (must be before early return) ---
  const seasonThemeKey = activeSeason?.theme ?? "special";
  const seasonTheme = useMemo(() => seasonThemes[seasonThemeKey] ?? seasonThemes.special, [seasonThemeKey]);
  const currentSP = seasonProgress?.season_points || 0;
  const currentLevel = seasonProgress?.level || 1;
  const maxLevel = rewards.length || 30;

  const featuredRewards = useMemo(() => {
    return [
      {
        id: 'premium_access',
        variant: 'premium' as const,
        level: 1,
        isVirtual: true,
        type: 'premium_pass',
        title: uiText.featured.premiumAccess,
        subtitle: uiText.featured.mainReward,
        rarity: 'epic',
        color: '#f59e0b',
        rank: 1
      },
      {
        id: 'coins_500',
        variant: 'free' as const,
        level: 30,
        isVirtual: true,
        type: 'coins',
        title: language === "ru" ? `${SEASON_PRIZE_2ND} монет` : language === "es" ? `${SEASON_PRIZE_2ND} monedas` : `${SEASON_PRIZE_2ND} coins`,
        subtitle: uiText.featured.rewardForPlace(2),
        amount: SEASON_PRIZE_2ND,
        rarity: 'rare',
        color: '#fbbf24',
        rank: 2
      },
      {
        id: 'coins_250',
        variant: 'free' as const,
        level: 25,
        isVirtual: true,
        type: 'coins',
        title: language === "ru" ? `${SEASON_PRIZE_3RD} монет` : language === "es" ? `${SEASON_PRIZE_3RD} monedas` : `${SEASON_PRIZE_3RD} coins`,
        subtitle: uiText.featured.rewardForPlace(3),
        amount: 250,
        rarity: 'rare',
        color: '#fbbf24',
        rank: 3
      }
    ];
  }, [language, uiText]);

  // Логирование для отладки Premium статуса - ОТКЛЮЧЕНО для продакшена
  // useEffect(() => {
  //   if (open && profileId) {
  //     console.log('[DuelPassSeasonModal] Premium статус:', {
  //       isPremiumFromHook,
  //       hasPremiumForever,
  //       hasPremiumPass,
  //       isPremium,
  //       profileId
  //     });
  //   }
  // }, [open, profileId, isPremiumFromHook, hasPremiumForever, hasPremiumPass, isPremium]);



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
            .select("id, name_ru, name_es, name_en, description_ru, description_es, description_en, rarity, metadata")
            .in("id", Array.from(typeMap.skin))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Skin definitions error", error);
                return;
              }
              data?.forEach((item) => {
                const metadata = parseMetadata(item.metadata);
                nextDetails[`skin:${item.id}`] = {
                  name: getLocalizedDbField(item, "name", language),
                  description: getLocalizedDbField(item, "description", language),
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
            .select("id, name_ru, name_es, name_en, description_ru, description_es, description_en, rarity, metadata")
            .in("id", Array.from(typeMap.badge))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Badge definitions error", error);
                return;
              }
              data?.forEach((item) => {
                const metadata = parseMetadata(item.metadata);
                nextDetails[`badge:${item.id}`] = {
                  name: getLocalizedDbField(item, "name", language),
                  description: getLocalizedDbField(item, "description", language),
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
            .select("id, name_ru, name_es, name_en, description_ru, description_es, description_en, rarity, metadata")
            .in("id", Array.from(typeMap.sticker))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Sticker definitions error", error);
                return;
              }
              data?.forEach((item) => {
                const metadata = parseMetadata(item.metadata);
                nextDetails[`sticker:${item.id}`] = {
                  name: getLocalizedDbField(item, "name", language),
                  description: getLocalizedDbField(item, "description", language),
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
            .select("type, name_ru, name_es, name_en, description_ru, description_es, description_en, icon")
            .in("type", Array.from(typeMap.boost))
            .then(({ data, error }) => {
              if (error) {
                console.error("[DuelPassSeasonModal] Boost definitions error", error);
                return;
              }
              data?.forEach((item) => {
                nextDetails[`boost:${item.type}`] = {
                  name: getLocalizedDbField(item, "name", language),
                  description: getLocalizedDbField(item, "description", language),
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
  }, [rewards, language]);

  const invalidateSeasonData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SEASON_MODAL_QUERY_KEY(profileId) });
  }, [queryClient, profileId]);

  const queueCosmeticReward = useCallback(
    async (rewardPayload: any) => {
      if (!rewardPayload || !rewardPayload.id) return;
      const type = resolveRewardType(rewardPayload);
      if (!["skin", "badge", "sticker"].includes(type)) return;

      const key = `${type}:${rewardPayload.id}`;
      let definition = rewardDetails[key];

      if (!definition) {
        const tableName =
          type === "skin"
            ? "skin_definitions"
            : type === "badge"
              ? "badge_definitions"
              : "sticker_definitions";
        const { data, error } = await supabase
          .from(tableName)
          .select("name_ru, name_es, name_en, description_ru, description_es, description_en, rarity, metadata")
          .eq("id", rewardPayload.id)
          .single();

        if (error) {
          console.warn("[DuelPassSeasonModal] Не удалось загрузить описание косметики:", error);
        }

        if (data) {
          const parsedMetadata =
            typeof data.metadata === "string"
              ? (() => {
                try {
                  return JSON.parse(data.metadata);
                } catch {
                  return undefined;
                }
              })()
              : data.metadata;

          definition = {
            name: getLocalizedDbField(data, "name", language),
            description: getLocalizedDbField(data, "description", language),
            rarity: data.rarity,
            metadata: parsedMetadata,
          };
        }
      }

      if (!definition) return;

      setCosmeticQueue((prev) => [
        ...prev,
        {
          type,
          id: rewardPayload.id,
          name_ru: definition.name || getLocalizedDbField(rewardPayload, "name", language, dp("fallbackRewardName")),
          description_ru:
            definition.description || getLocalizedDbField(rewardPayload, "description", language, ""),
          rarity: definition.rarity || "common",
          metadata: definition.metadata || rewardPayload.metadata,
        },
      ]);
    },
    [rewardDetails, language, dp]
  );

  const makeRewardToast = useCallback(
    (rewardPayload: any, premiumReward: boolean, level: number) => {
      if (!rewardPayload) return;

      let rewardText = "";

      if (rewardPayload.type === "coins" && rewardPayload.amount) {
        rewardText = `+${rewardPayload.amount} ${dp("rewardTypes.coins.label")}`;
      } else if (rewardPayload.type === "boost" && rewardPayload.id) {
        rewardText = `${dp("rewardTypes.boost.label")}: ${formatTechnicalName(
          rewardPayload.id,
          dp("rewardTypes.boost.label")
        )}`;
      } else if (rewardPayload.type === "skin") {
        rewardText = dp("rewardTypes.skin.label");
      } else if (rewardPayload.type === "badge") {
        rewardText = dp("rewardTypes.badge.label");
      } else if (rewardPayload.type === "sticker") {
        rewardText = dp("rewardTypes.sticker.label");
      } else if (rewardPayload.type === "trophy") {
        rewardText = dp("rewardTypes.trophy.label");
      } else {
        rewardText = dp("toasts.genericReward");
      }

      toast.success(premiumReward ? dp("toasts.premiumReward") : dp("toasts.rewardClaimed"), {
        description: dp("toasts.rewardDescription", { level, reward: rewardText }),
        duration: 4000,
      });
    },
    [dp]
  );

  const handleQuickApplyAppearance = useCallback(
    async (rewardData: any) => {
      if (!profileId) {
        toast.error("Профиль не найден");
        return;
      }

      try {
        setIsApplyingAppearance(true);

        if (rewardData.type === "skin") {
          const { error } = await supabase.rpc("activate_skin", {
            p_user_id: profileId,
            p_skin_id: rewardData.id,
          });
          if (error) throw error;

          await queryClient.invalidateQueries({ queryKey: ['user-skins', profileId] });
          toast.success("Новый образ активирован");
        } else if (rewardData.type === "badge") {
          const { data, error } = await supabase.rpc("toggle_badge_display", {
            p_user_id: profileId,
            p_badge_id: rewardData.id,
            p_display: true,
          });

          if (error) throw error;
          if (data && data.success === false) {
            throw new Error(data.message || "Не удалось обновить бейдж");
          }
          toast.success("Бейдж добавлен в профиль");
        }

      } catch (error: any) {
        console.error("[DuelPassSeasonModal] Quick apply error:", error);
        toast.error("Не удалось применить косметику", {
          description: error?.message,
        });
      } finally {
        setIsApplyingAppearance(false);
      }
    },
    [profileId]
  );

  const handleRewardClick = async (reward: any) => {
    const level = reward.level;
    const hasFreeReward = !!reward.free_reward;
    const hasPremiumReward = !!reward.premium_reward;
    const freeClaimed = claimedFreeRewards.has(level);
    const premiumClaimed = claimedPremiumRewards.has(level);

    // Если пользователь не Premium и доступна только премиальная награда — показываем апселл
    if (hasPremiumReward && !isPremium && (!hasFreeReward || freeClaimed)) {
      setPremiumRewardPreview({
        level: reward.level,
        premium_reward: reward.premium_reward,
      });
      return;
    }

    // Premium пользователь: получаем премиум (и автоматически free на сервере)
    if (isPremium && hasPremiumReward && !premiumClaimed) {
      await claimReward(level, true, {
        lockFreePath: hasFreeReward && !freeClaimed,
      });
      return;
    }

    // Любой пользователь: если осталась бесплатная награда — получаем её
    if (hasFreeReward && !freeClaimed) {
      await claimReward(level, false);
      return;
    }

    // Не-Premium: если премиум награда ещё не получена, показываем апселл
    if (hasPremiumReward && !isPremium && !premiumClaimed) {
      setPremiumRewardPreview({
        level: reward.level,
        premium_reward: reward.premium_reward,
      });
    }
  };

  const claimingRef = React.useRef<Set<string>>(new Set());

  const claimReward = async (
    level: number,
    isPremiumReward: boolean = false,
    options?: { lockFreePath?: boolean }
  ) => {
    if (!profileId || !activeSeason) return;

    const claimKey = `${level}-${isPremiumReward ? "premium" : "free"}`;
    const extraKeys = options?.lockFreePath ? [`${level}-free`] : [];
    const keysToTrack = [claimKey, ...extraKeys];

    // Проверка через Ref для мгновенной блокировки (защита от дабл-клика)
    if (keysToTrack.some((key) => claimingRef.current.has(key))) {
      console.log("[DuelPassSeasonModal] Reward already processing (ref check):", keysToTrack);
      return;
    }

    // Блокируем сразу в Ref
    keysToTrack.forEach(key => claimingRef.current.add(key));
    // И обновляем стейт для UI
    setClaimingRewards((prev) => new Set([...prev, ...keysToTrack]));

    try {
      const { data, error } = await supabaseClient.functions.invoke("duel-pass-claim", {
        body: {
          user_id: profileId,
          level,
          is_premium: isPremiumReward,
          season: activeSeason.season_number,
        },
      });

      if (error) {
        if (error.status === 409 || error.statusCode === 409) {
          // Already claimed — refresh from server
          invalidateSeasonData();
          return;
        }
        toast.error(dp("toasts.rewardError"), {
          description: error.message || dp("toasts.rewardErrorDescription"),
        });
        return;
      }

      const claimedList =
        Array.isArray(data?.claimedRewards) && data.claimedRewards.length
          ? data.claimedRewards
          : data?.reward
            ? [{ reward: data.reward, is_premium: isPremiumReward }]
            : [];

      for (const entry of claimedList) {
        if (!entry?.reward) continue;

        if (entry.is_premium) {
          setClaimedPremiumRewards((prev) => new Set([...prev, level]));
          if (isPremium) {
            setClaimedRewards((prev) => new Set([...prev, level]));
          }
        } else {
          setClaimedFreeRewards((prev) => new Set([...prev, level]));
          setClaimedRewards((prev) => new Set([...prev, level]));
        }

        makeRewardToast(entry.reward, entry.is_premium, level);
        await queueCosmeticReward(entry.reward);
      }

      invalidateSeasonData();
    } catch (err: any) {
      console.error("[DuelPassSeasonModal] Claim error", err);
      toast.error(dp("toasts.rewardError"));
    } finally {
      // Очищаем Ref и стейт
      keysToTrack.forEach(key => claimingRef.current.delete(key));
      setClaimingRewards((prev) => {
        const next = new Set(prev);
        keysToTrack.forEach((key) => next.delete(key));
        return next;
      });
    }
  };

  // Skeleton контент для загрузки
  const SkeletonContent = () => (
    <>
      <div className={cn("border-b", isMobile ? "px-4 pt-2 pb-4" : "px-6 pt-6 pb-4")}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      <div className={cn("space-y-6", isMobile ? "px-3 py-4" : "px-6 py-6")}>
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



  const renderModalShell = (
    content: React.ReactNode,
    title?: string,
    description?: string,
    options?: { showHandle?: boolean; contentClassName?: string; loading?: boolean }
  ) => (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title={title || dp("title")}
      showTitleBar={false}
      className={cn(
        "max-h-[85vh] p-0 flex flex-col",
        isMobile ? "w-screen max-w-none" : "w-[95vw] max-w-5xl"
      )}
      showHandle={options?.showHandle}
      contentClassName={options?.contentClassName}
      modalRouteKey="duel-pass-season"
      loading={options?.loading ?? loading}
      skeletonVariant="default"
    >
      <div className="flex-1 overflow-y-auto">
        {description && (
          <div className="px-6 pt-4 pb-2 border-b border-border/40">
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}
        {content}
      </div>
    </UnifiedModal>
  );

  // Контент для состояния, когда сезон не найден или не загружен
  const upcomingSeasonContent = (
    <div className="relative flex flex-col items-center justify-center py-16 px-6 min-h-[500px] overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 1, bounce: 0.5 }}
        className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto"
      >
        {/* Main Visual */}
        <div className="relative mb-8 group cursor-default">
          <div className="absolute inset-0 bg-blue-500/30 blur-[60px] rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-700" />
          <div className="relative text-7xl mb-2 grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">
            🚀
          </div>

          {/* Orbiting particles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 border border-blue-500/30 rounded-full"
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{
                rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear", reverse: i % 2 === 0 },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: i }
              }}
              style={{ width: `${100 + i * 40}%`, height: `${100 + i * 40}%`, left: `-${i * 20}%`, top: `-${i * 20}%` }}
            >
              <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
            </motion.div>
          ))}
        </div>

        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-300 dark:via-white dark:to-blue-300 animate-gradient-x">
            {dp("upcomingSeason.title")}
          </span>
        </h2>

        <p className="text-base text-muted-foreground/80 leading-relaxed max-w-xs mb-8">
          {dp("upcomingSeason.descriptionLine1")}
          <br className="hidden sm:block" />
          {dp("upcomingSeason.descriptionLine2")}
        </p>

        {/* Mystery Rewards Teaser */}
        <div className="flex items-center gap-3 mb-10 px-6 py-4 rounded-2xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 backdrop-blur-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative group/item">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-background/80 to-background/40 dark:from-white/10 dark:to-white/5 flex items-center justify-center border border-border dark:border-white/10 overflow-hidden">
                <span className="text-lg opacity-30 select-none">?</span>
                <div className="absolute inset-0 bg-muted/40 dark:bg-white/10 backdrop-blur-[2px]" />
              </div>
              {i === 2 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              )}
            </div>
          ))}
          <div className="h-8 w-px bg-border dark:bg-white/10 mx-1" />
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{dp("upcomingSeason.rewards")}</p>
            <p className="text-xs font-semibold text-foreground/90">{dp("upcomingSeason.secret")}</p>
          </div>
        </div>

        <Button
          size="lg"
          className="rounded-xl bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-primary/90 dark:hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-300 font-bold px-12 shadow-xl shadow-primary/20 dark:shadow-white/10"
          onClick={() => onOpenChange(false)}
        >
          {dp("upcomingSeason.button")}
        </Button>
      </motion.div>
    </div>
  );


  const totalSPNeeded = rewards[rewards.length - 1]?.sp_required || 3000;
  const progressPercent = Math.min((currentSP / totalSPNeeded) * 100, 100);
  const seasonStartDate = activeSeason?.start_date ? new Date(activeSeason.start_date) : null;
  const seasonEndDate = activeSeason?.end_date ? new Date(activeSeason.end_date) : null;
  const seasonDaysRemaining = typeof activeSeason?.days_remaining === "number" ? activeSeason.days_remaining : null;

  // Находим следующий уровень для расчета SP
  const nextLevelReward = rewards.find((r) => r.level === currentLevel + 1);
  const nextLevelSP = nextLevelReward?.sp_required || totalSPNeeded;
  const spToNextLevel = Math.max(0, nextLevelSP - currentSP);

  // Оптимизированный фильтр доступных наград
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      if (rewardFilter === 'available') {
        const rLevel = Number(r.level);
        const unlocked = Number(currentLevel) >= rLevel;
        if (!unlocked) return false;

        const isFreeClaimed = claimedFreeRewards.has(rLevel);
        const isPremiumClaimed = claimedPremiumRewards.has(rLevel);

        // ВАЖНО: Награда доступна СЕЙЧАС только если активирован Elite Pass (isPremium) или это бесплатная награда
        const canClaimFree = !!r.free_reward && !isFreeClaimed;
        const canClaimPremium = !!r.premium_reward && !isPremiumClaimed && isPremium;

        return canClaimFree || canClaimPremium;
      }
      return true;
    });
  }, [rewards, currentLevel, rewardFilter, claimedFreeRewards, claimedPremiumRewards, isPremium]);
  const getRewardVisualMeta = (rewardData: any) => {
    if (!rewardData) return null;

    const type = resolveRewardType(rewardData);
    const config = rewardTypeVisuals[type] || rewardTypeVisuals.coins;
    const key = rewardData.id ? `${type}:${rewardData.id}` : undefined;
    const definition = key ? rewardDetails[key] : undefined;
    const metadata = definition?.metadata;

    let title = definition?.name;
    const amountVal = rewardData.amount ?? rewardData.value ?? rewardData.reward_value ?? rewardData.coins;

    // Более агрессивная замена слова "Награда" на количество
    const isGenericTitle = !title ||
      title.toLowerCase() === "награда" ||
      title.toLowerCase() === "reward" ||
      title.toLowerCase() === "generic_reward";

    if (isGenericTitle) {
      if (type === "coins" && amountVal) {
        title = `+${amountVal} ${dp("rewardTypes.coins.label")}`;
      } else if (!title) {
        title = formatTechnicalName(rewardData.id, t("duelPass.fallbackRewardName"));
      }
    }

    const subtitle = definition?.description || (config.subtitleKey ? t(config.subtitleKey) : config.defaultSubtitle);
    const tag = definition?.rarity ? getRarityLabel(definition.rarity) : t(config.labelKey);
    const color = definition?.color || metadata?.color || config.color;
    const iconEmojiRaw = definition?.icon || metadata?.emoji;
    const iconEmoji =
      iconEmojiRaw && !/[a-zA-Z]/.test(iconEmojiRaw) && iconEmojiRaw.length <= 4
        ? iconEmojiRaw
        : undefined;

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
    options: { claimed: boolean; unlocked: boolean; level: number; onClick?: () => void }
  ) => {
    const isPremiumCell = variant === 'premium';
    const canClaim = options.unlocked && !options.claimed && (!isPremiumCell || isPremium);
    const showLock = !options.unlocked || (isPremiumCell && !isPremium && !options.claimed);
    const isClaiming = isPremiumCell
      ? claimingRewards.has(`${options.level}-premium`)
      : claimingRewards.has(`${options.level}-free`);

    // Заблокированная Premium ячейка — показываем сундук вместо слова "Награда"
    if (!rewardData && isPremiumCell) {
      return (
        <div className="rounded-xl border border-dashed border-yellow-500/20 bg-yellow-500/5 px-1 py-1 sm:px-1.5 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 opacity-50 min-h-[44px] sm:min-h-[48px]">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-yellow-500/10">
            🔒
          </div>
          <p className="text-[10px] text-yellow-600/70 font-medium leading-tight">Elite</p>
        </div>
      );
    }

    if (!rewardData) {
      return <div className="flex items-center justify-center h-[44px] sm:h-[48px]"><span className="text-[10px] text-muted-foreground">—</span></div>;
    }

    const meta = getRewardVisualMeta(rewardData);
    if (!meta) {
      return <div className="flex items-center justify-center h-[44px] sm:h-[48px]"><span className="text-[10px] text-muted-foreground">—</span></div>;
    }

    const Icon = meta.Icon;
    const isEpicOrLegendary = meta.rarityKey === 'epic' || meta.rarityKey === 'legendary';
    const rarityGlow = meta.rarityKey === 'legendary'
      ? '0 0 10px rgba(251,191,36,0.50)'
      : meta.rarityKey === 'epic'
        ? '0 0 10px rgba(168,85,247,0.55)'
        : undefined;

    return (
      <motion.div
        whileHover={{ scale: canClaim ? 1.02 : 1, y: canClaim ? -2 : 0 }}
        whileTap={{ scale: canClaim ? 0.98 : 1 }}
        onClick={(e) => {
          e.stopPropagation();
          if (options.onClick) options.onClick();
        }}
        className={cn(
          "relative rounded-xl border px-2 py-2 transition-all min-h-[44px] sm:min-h-[52px] group overflow-hidden cursor-default shadow-sm",
          isPremiumCell ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-900/90 dark:text-yellow-50" : "border-border bg-muted/40 text-foreground",
          canClaim && "border-primary/60 bg-primary/10 shadow-[0_6px_16px_rgba(var(--primary-rgb,59,130,246),0.25)] cursor-pointer ring-1 ring-primary/20",
          canClaim && isPremiumCell && "border-yellow-400/70 bg-yellow-400/15 shadow-[0_6px_20px_rgba(251,191,36,0.30)] ring-1 ring-yellow-400/30",
          options.claimed && "opacity-60 border-green-500/30 bg-green-500/5 shadow-none",
          !options.unlocked && "opacity-45 grayscale-[0.5] shadow-none",
          isEpicOrLegendary && options.unlocked && !options.claimed && (isPremiumCell ? "border-yellow-500/80 bg-yellow-500/20" : "border-primary/60 bg-primary/15")
        )}
        style={canClaim && isEpicOrLegendary && rarityGlow ? { boxShadow: `0 8px 25px ${rarityGlow.split('rgba(')[1].split(')')[0].replace('0.55', '0.25').replace('0.50', '0.25')}, ${rarityGlow}` } : undefined}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-[14px] sm:text-lg flex-shrink-0 transition-all duration-300 shadow-sm",
              canClaim && "group-hover:scale-110 group-hover:rotate-3 shadow-md"
            )}
            style={{
              background: meta.color
                ? `linear-gradient(135deg, ${withAlpha(meta.color, options.claimed ? "33" : "77")}, ${withAlpha(meta.color, "1A")})`
                : 'rgba(255,255,255,0.07)',
              color: options.claimed ? '#94a3b8' : (meta.color || undefined),
              boxShadow: !options.claimed && meta.color ? `0 4px 10px ${withAlpha(meta.color, '33')}` : undefined,
            }}
          >
            {options.claimed ? (
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            ) : showLock ? (
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50" />
            ) : meta.iconEmoji ? (
              <span className="drop-shadow-sm">{meta.iconEmoji}</span>
            ) : Icon ? (
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" />
            ) : (
              meta.title.charAt(0)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className={cn(
                "text-[10px] sm:text-[11px] font-bold truncate leading-tight tracking-tight",
                options.claimed ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"
              )}>
                {meta.title}
              </p>
              {options.claimed && (
                <span className="text-[8px] font-black text-green-500/90 uppercase tracking-tighter shrink-0">{dp("table.status.claimed")}</span>
              )}
            </div>

            {canClaim ? (
              <div className="mt-1">
                <div className={cn(
                  "h-5 sm:h-6 flex items-center justify-center rounded-md px-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                  isPremiumCell
                    ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-[0_4px_10px_rgba(234,179,8,0.5)]"
                    : "bg-gradient-to-r from-primary to-blue-600 text-primary-foreground shadow-[0_4px_10px_rgba(59,130,246,0.4)]"
                )}>
                  {dp("table.buttons.claim")}
                </div>
              </div>
            ) : meta.subtitle && !isMobile && (
              <p className="text-[9px] text-muted-foreground/80 truncate leading-tight mt-1 tracking-tight">{meta.subtitle}</p>
            )}

            {!canClaim && !options.claimed && showLock && isPremiumCell && !isPremium && (
              <div className="mt-1 flex items-center gap-1">
                <Crown className="w-2.5 h-2.5 text-yellow-500" />
                <span className="text-[8px] font-bold text-yellow-600/70 uppercase tracking-wider">Elite Pass</span>
              </div>
            )}
          </div>
        </div>

        {/* Интерактивные эффекты для доступных наград */}
        {canClaim && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none -skew-x-25 translate-x-[-150%]"
              style={{ transform: 'translateX(300%)' }}
            />
            <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-bl-full pointer-events-none transform translate-x-4 -translate-y-4 blur-sm" />
          </>
        )}
      </motion.div>
    );
  };

  const renderHeroRewardCard = (reward: any, index: number) => {
    let meta: any;

    if (reward.isVirtual) {
      const type = reward.type;
      const config = rewardTypeVisuals[type] || rewardTypeVisuals.coins;
      meta = {
        title: reward.title,
        subtitle: reward.subtitle,
        tag: reward.rarity === 'epic' ? getRarityLabel('epic') : getRarityLabel('legendary'),
        color: reward.color || config.color,
        Icon: config.icon,
        rarityKey: reward.rarity,
      };
    } else {
      meta = getRewardVisualMeta(reward.data);
    }

    if (!meta) return null;
    const Icon = meta.Icon;

    const rarityGlowColor = meta.rarityKey === 'legendary'
      ? 'rgba(251,191,36,0.55)'
      : meta.rarityKey === 'epic'
        ? 'rgba(168,85,247,0.55)'
        : meta.rarityKey === 'rare'
          ? 'rgba(14,165,233,0.40)'
          : undefined;

    return (
      <div
        key={`${reward.variant || 'default'}-${reward.level || '0'}-${index}`}
        className="relative min-w-[210px] flex-1 rounded-3xl border bg-white/5 p-5 text-white backdrop-blur-sm shrink-0 shadow-sm"
        style={{
          borderColor: rarityGlowColor ? withAlpha(rarityGlowColor, '30') : 'rgba(255,255,255,0.12)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none rounded-3xl" />
        {/* Ambient glow bg */}
        {rarityGlowColor && (
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{ background: `radial-gradient(circle at 50% 10%, ${rarityGlowColor}, transparent 80%)` }}
          />
        )}
        <div className="relative z-10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50 font-bold">
            <span className={cn(
              reward.variant === 'premium' ? 'text-yellow-400' : 'text-cyan-400'
            )}>
              {reward.rank ? uiText.placeLabel(reward.rank) : (reward.variant === "premium" ? "Premium" : uiText.mobileFree)}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: meta.color
                  ? `linear-gradient(135deg, ${withAlpha(meta.color, '55')}, ${withAlpha(meta.color, '15')})`
                  : 'rgba(255,255,255,0.10)',
                color: meta.color || 'white'
              }}
            >
              {meta.iconEmoji ? meta.iconEmoji : Icon ? <Icon className="w-6 h-6" /> : meta.title.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{meta.title}</p>
              <p className="text-[11px] text-white/60 truncate mt-0.5">{meta.subtitle}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black">
            <Sparkles className={cn(
              'w-3 h-3',
              meta.rarityKey === 'legendary' ? 'text-yellow-400' :
                meta.rarityKey === 'epic' ? 'text-purple-400' :
                  meta.rarityKey === 'rare' ? 'text-sky-400' : 'text-amber-300'
            )} />
            <span className={cn(
              meta.rarityKey === 'legendary' ? 'text-yellow-300' :
                meta.rarityKey === 'epic' ? 'text-purple-300' :
                  meta.rarityKey === 'rare' ? 'text-sky-300' : 'text-amber-200'
            )}>
              {meta.tag}
            </span>
          </div>
        </div>
      </div>
    );
  };


  // Общий контент модалки
  const ModalContent = () => {
    // Показываем skeleton во время загрузки
    if (loading) {
      return <SkeletonContent />;
    }



    return (
      <>
        {/* Упрощенный Header */}
        <div className={cn("relative text-left", isMobile ? "px-4 pt-2 pb-4" : "px-6 pt-6 pb-4")}>
          {/* Плавное затемнение снизу для плавного перехода */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{dp("title")}</h2>
              <p className="text-xs mt-0.5 flex items-center gap-2 text-muted-foreground">
                <span>{activeSeasonName}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {dp("hero.daysLeft", { count: activeSeason.days_remaining ?? 0 })}
                </span>
              </p>
            </div>
            <div className="flex items-center rounded-xl border border-border overflow-hidden shrink-0">
              <button
                onClick={() => setActiveTab('pass')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all",
                  activeTab === 'pass'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Trophy className="w-3 h-3" />
                Pass
              </button>
              <button
                onClick={() => setActiveTab('leaders')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all",
                  activeTab === 'leaders'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <BarChart3 className="w-3 h-3" />
                {uiText.leaderboardShort}
              </button>
            </div>
          </div>
        </div>

        {/* Сезонный hero блок */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "relative overflow-hidden rounded-3xl border mx-1 mb-2 px-6 py-8 text-white shadow-xl",
            seasonTheme.gradient || "bg-slate-950",
            seasonTheme.border
          )}
        >
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.15),transparent_75%)] opacity-50 blur-[60px]" />

          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativePrimary)} />
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativeSecondary)} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
              <div className="space-y-0.5">
                <h2 className="text-3xl font-black tracking-tighter leading-tight drop-shadow-sm">{activeSeasonName}</h2>
                <p className="subtitle-font text-[11px] text-white/70 max-w-2xl line-clamp-1 italic opacity-90">
                  {activeSeasonDescription}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 self-start backdrop-blur-md">
                <Calendar className="w-3 h-3" />
                <span>
                  {formatSeasonDate(seasonStartDate)} — {formatSeasonDate(seasonEndDate)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {dp("hero.countdownLabel")}
                </p>
                <CountdownTicker endDate={activeSeason.end_date} labels={countdownLabels} />
              </div>
              <div className="flex items-center gap-2 text-sm text-white/85">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-4 h-4" />
                  <span>{dp("hero.daysLeft", { count: activeSeason.days_remaining ?? 0 })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>{dp("hero.levelsRemaining", { count: Math.max(maxLevel - currentLevel, 0) })}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/50 mb-3 font-bold">{dp("hero.featuredTitle")}</p>
              <div className="flex overflow-x-auto gap-4 pb-2 flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {featuredRewards.map((reward, index) => renderHeroRewardCard(reward, index))}
              </div>
            </div>
          </div>
        </motion.div>

        {activeTab === 'leaders' ? (
          <DuelPassLeaderboardView
            embedded
            onOpenHallOfFame={() => setCurrentView('hall_of_fame')}
          />
        ) : (
        <div className="flex flex-col gap-6 px-4 sm:px-0 pb-4">
          {/* Прогресс по уровням */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {dp("progress.currentLevelLabel")}
                </span>
                <span className="text-3xl font-black text-foreground">Lv {currentLevel}</span>
                <span className="text-sm text-muted-foreground">
                  / {maxLevel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{dp("progress.seasonPointsLabel")}</span>
                <span className="text-lg font-semibold text-foreground">{currentSP}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentLevel < maxLevel && spToNextLevel > 0
                ? dp("progress.toNext", { sp: spToNextLevel, level: currentLevel + 1 })
                : currentLevel >= maxLevel
                  ? dp("progress.max")
                  : dp("progress.loading")}
            </p>
            {/* Прогресс-бар — спидометр спорткара */}
            <div className="relative h-5 bg-muted/40 rounded-full overflow-hidden border border-white/5">
              {/* Заполненная часть */}
              <motion.div
                className={cn("absolute inset-y-0 left-0 bg-gradient-to-r rounded-full", seasonTheme.progressGradient)}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                style={{ boxShadow: seasonTheme.progressGlow }}
              />
              {/* Shine-эффект — бегущий блик */}
              <motion.div
                className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full pointer-events-none"
                animate={{ left: ['-10%', '110%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              />
              {/* Бегунок */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-white/60 shadow-lg transition-all duration-500"
                style={{
                  left: `calc(${Math.min(progressPercent, 100)}% - 8px)`,
                  boxShadow: `0 0 8px rgba(255,255,255,0.80)`
                }}
              />
              {/* Деления по уровням */}
              {rewards.slice(0, 10).map((r) => {
                const position = (r.sp_required / totalSPNeeded) * 100;
                const isReached = currentSP >= r.sp_required;
                return (
                  <div
                    key={r.level}
                    className={cn(
                      "absolute top-0 w-px h-5 transition-opacity",
                      isReached ? "bg-white/30" : "bg-white/10"
                    )}
                    style={{ left: `${Math.min(position, 100)}%` }}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>{dp("progress.summary", { total: totalSPNeeded })}</span>
              <span>{dp("progress.nextLevel", { sp: spToNextLevel })}</span>
            </div>
          </div >


          {/* Ультра-лаконичный Premium баннер */}
          {!hasPremiumPass && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => !hasPremiumForever && setShowPaywall(true)}
              className={cn(
                "group relative overflow-hidden rounded-2xl transition-all duration-300",
                "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent backdrop-blur-sm",
                "border border-amber-500/20 hover:border-amber-500/40 shadow-sm",
                !hasPremiumForever && "cursor-pointer"
              )}
            >
              <div className="relative p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                    <Crown className="w-6 h-6 text-amber-950" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-base font-bold text-foreground tracking-tight">Elite Pass</h4>
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 text-[10px] px-1.5 py-0 h-4 rounded border-none font-bold">{uiText.elitePassXp}</Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-snug">
                      {uiText.elitePassDescription}
                    </p>
                  </div>
                </div>

                {!hasPremiumForever && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPaywall(true);
                    }}
                    className="w-full sm:w-auto bg-amber-500 text-amber-950 hover:bg-amber-400 font-bold rounded-xl shadow-md shadow-amber-500/20"
                  >
                    {uiText.activate}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Индикатор Premium Forever */}
          {/* Показываем ТОЛЬКО если действительно есть Premium Forever (без проверки hasPremiumPass) */}
          {
            hasPremiumForever && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-600">{dp("premiumForever.title")}</p>
                  <p className="text-xs text-muted-foreground">{dp("premiumForever.description")}</p>
                </div>
              </div>
            )
          }

          {/* Современная таблица наград */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  {dp("table.title")}
                </h4>
                {seasonDaysRemaining !== null && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {dp("table.remaining", { days: seasonDaysRemaining })}
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
                  {dp("filters.all")}
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
                  {dp("filters.available")}
                </button>
              </div>
            </div>

            {/* Улучшенная таблица */}
            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-full">
                  <colgroup>
                    <col className="w-12 sm:w-16" />
                    <col style={{ width: '45%', minWidth: isMobile ? '70px' : '100px' }} />
                    <col style={{ width: '45%', minWidth: isMobile ? '70px' : '100px' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-center px-1 py-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/20">
                        {isMobile ? "LVL" : dp("table.columns.level")}
                      </th>
                      <th className="text-left px-2 py-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-l border-border/50">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3 h-3 text-yellow-500" />
                          <span>{isMobile ? uiText.mobileFree : dp("table.columns.free")}</span>
                        </div>
                      </th>
                      <th className="text-left px-2 py-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-l border-border/50">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-3 h-3 text-yellow-600" />
                          <span>PREM</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRewards.map((reward) => {
                      const unlocked = currentLevel >= reward.level;
                      const isCurrent = currentLevel === reward.level;

                      const hasFreeReward = !!reward.free_reward;

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

                        // Логирование для отладки - ОТКЛЮЧЕНО для продакшена (было в цикле для каждого уровня)
                        // if (reward.level % 2 === 1) {
                        //   console.log(`[DuelPassSeasonModal] Уровень ${reward.level}:`, {
                        //     unlocked,
                        //     hasFreeReward,
                        //     freeClaimed,
                        //     freeRewardClaimed,
                        //     hasPremiumReward: !!reward.premium_reward,
                        //     isPremium,
                        //     premiumClaimed,
                        //     premiumRewardClaimed,
                        //     allClaimed
                        //   });
                        // }
                      } else {
                        // Уровень не разблокирован - не может быть "получен"
                        allClaimed = false;
                      }

                      return (
                        <tr
                          key={reward.level}
                          className={cn(
                            "border-b border-border/50 transition-all cursor-pointer group",
                            isCurrent && "border-l-4 border-l-primary scale-[1.005] origin-left",
                            isCurrent && "bg-primary/8 shadow-[inset_0_0_20px_rgba(var(--primary-rgb,59,130,246),0.08)]",
                            allClaimed
                              ? "bg-green-500/5 hover:bg-green-500/10"
                              : unlocked
                                ? "hover:bg-muted/40"
                                : "opacity-45"
                          )}
                          onClick={() => {
                            if (unlocked && !allClaimed) {
                              handleRewardClick(reward);
                            }
                          }}
                        >
                          {/* Уровень */}
                          <td className="px-1 py-2 text-center bg-muted/10 border-r border-border/50">
                            <div className={cn(
                              "flex flex-col items-center justify-center min-h-[44px]",
                              isCurrent && "font-bold"
                            )}>
                              <div className={cn(
                                "flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black transition-all shadow-sm",
                                isCurrent
                                  ? "bg-primary text-white scale-110 shadow-primary/30"
                                  : allClaimed
                                    ? "bg-green-500/20 text-green-600"
                                    : unlocked
                                      ? "bg-muted text-foreground"
                                      : "bg-muted/50 text-muted-foreground"
                              )}>
                                {reward.level}
                              </div>
                              <div className="mt-1 flex flex-col items-center">
                                <span className="text-[8px] font-bold text-muted-foreground/60 whitespace-nowrap">
                                  {reward.sp_required} SP
                                </span>
                                {isCurrent && !allClaimed && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Free reward preview */}
                          <td className="px-1.5 py-2 align-middle">
                            {renderTableRewardCell(reward.free_reward, 'free', {
                              claimed: freeClaimed,
                              unlocked,
                              level: reward.level,
                              onClick: () => {
                                if (unlocked && !freeClaimed) {
                                  claimReward(reward.level, false);
                                }
                              }
                            })}
                          </td>

                          {/* Premium reward preview */}
                          <td className="px-1.5 py-2 align-middle">
                            {renderTableRewardCell(reward.premium_reward, 'premium', {
                              claimed: premiumClaimed,
                              unlocked,
                              level: reward.level,
                              onClick: () => {
                                if (!isPremium) {
                                  setPremiumRewardPreview({
                                    level: reward.level,
                                    premium_reward: reward.premium_reward,
                                  });
                                } else if (unlocked && !premiumClaimed) {
                                  claimReward(reward.level, true);
                                }
                              }
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Daily Quests — same as main page widget */}
          <div className="border-t pt-4 border-white/5">
            <DailyQuestWidget />
          </div>
        </div>
        )}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // V2 LAYOUT — single scroll page: compact header + leaderboard + horizontal rewards track
  // Toggle: DUEL_PASS_NEW_LAYOUT in feature-flags.ts
  // ─────────────────────────────────────────────────────────────

  const trackRef = useRef<HTMLDivElement>(null);

  // Auto-scroll rewards track to current level on open
  useEffect(() => {
    if (!DUEL_PASS_NEW_LAYOUT || !trackRef.current || !currentLevel) return;
    const CELL_W = 80;
    const scrollTo = Math.max(0, (currentLevel - 3) * CELL_W);
    trackRef.current.scrollLeft = scrollTo;
  }, [currentLevel, open]);

  const ModalContentV2 = () => {
    if (loading) return <SkeletonContent />;
    if (!activeSeason || !seasonProgress) return <>{upcomingSeasonContent}</>;

    const totalSPNeeded = rewards[rewards.length - 1]?.sp_required || 3000;

    return (
      <>
        {/* ── Compact header ───────────────────────────────────────── */}
        <div className={cn("flex items-center gap-3 border-b border-border/40", isMobile ? "px-4 py-3" : "px-6 py-3")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold truncate">{activeSeasonName}</span>
              {timeLeft && (
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                  {timeLeft.days > 0 ? `${timeLeft.days}д ` : ''}
                  {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className="font-semibold text-foreground">Lv {currentLevel}</span>
              <span className="opacity-40">·</span>
              <span>{currentSP.toLocaleString()} / {totalSPNeeded.toLocaleString()} SP</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('hall_of_fame')}
            className="gap-1.5 text-xs shrink-0 h-8 px-2.5"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="hidden sm:inline">{dp("hallOfFame.title") || "Зал"}</span>
          </Button>
        </div>

        {/* ── Leaderboard (embedded — top-3 + list) ─────────────────── */}
        <DuelPassLeaderboardView
          embedded
          onOpenHallOfFame={() => setCurrentView('hall_of_fame')}
        />

        {/* ── Horizontal rewards track ──────────────────────────────── */}
        <div className={cn("space-y-3 pb-4", isMobile ? "px-4" : "px-6")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h3 className="text-sm font-bold">{dp("table.title") || "Трек наград"}</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              Lv {currentLevel} / {rewards.length}
            </span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
            <div className="flex">
              {/* Fixed left labels column */}
              <div className="w-11 shrink-0 border-r border-border/40 flex flex-col">
                <div className="h-9 border-b border-border/40 flex items-center justify-center">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Ур.</span>
                </div>
                <div className="h-[72px] flex items-center justify-center border-b border-border/40">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider rotate-[-90deg] whitespace-nowrap">Free</span>
                </div>
                <div className="h-[72px] flex items-center justify-center bg-amber-500/5">
                  <Crown className="w-3 h-3 text-amber-500" />
                </div>
              </div>

              {/* Scrollable cells */}
              <div ref={trackRef} className="flex-1 overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
                <div className="flex" style={{ minWidth: `${rewards.length * 80}px` }}>
                  {rewards.map((reward) => {
                    const isCurrent = reward.level === currentLevel;
                    const isPast = reward.level < currentLevel;
                    const isFreeClaimed = claimedFreeRewards.has(reward.level);
                    const isPremClaimed = claimedPremiumRewards.has(reward.level);
                    const canClaimFree = (isPast || isCurrent) && !isFreeClaimed;
                    const canClaimPrem = (isPast || isCurrent) && !isPremClaimed && hasPremiumPass;
                    const freeMeta = getRewardVisualMeta(reward.free_reward);
                    const premMeta = getRewardVisualMeta(reward.premium_reward);
                    const FreeIcon = freeMeta?.Icon;
                    const PremIcon = premMeta?.Icon;

                    return (
                      <div
                        key={reward.level}
                        className={cn(
                          "w-20 shrink-0 border-r border-border/30 last:border-r-0",
                          isCurrent && "bg-primary/5 ring-1 ring-inset ring-primary/30"
                        )}
                      >
                        {/* Level number */}
                        <div className={cn(
                          "h-9 flex items-center justify-center border-b border-border/40 relative",
                          isCurrent ? "bg-primary/10" : ""
                        )}>
                          <span className={cn(
                            "text-xs font-black tabular-nums",
                            isCurrent ? "text-primary" : isPast ? "text-muted-foreground/60" : "text-muted-foreground/40"
                          )}>
                            {reward.level}
                          </span>
                          {isCurrent && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </div>

                        {/* Free reward cell */}
                        <div
                          onClick={() => canClaimFree && !claimingRewards.has(`${reward.level}-free`)
                            ? claimReward(reward.level, 'free', reward.free_reward)
                            : undefined
                          }
                          className={cn(
                            "h-[72px] flex flex-col items-center justify-center gap-0.5 border-b border-border/30 relative transition-colors",
                            canClaimFree && "cursor-pointer hover:bg-primary/10",
                            isFreeClaimed && "bg-green-500/5",
                            !isPast && !isCurrent && "opacity-40"
                          )}
                        >
                          {isFreeClaimed ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : freeMeta?.iconEmoji ? (
                            <span className="text-xl leading-none">{freeMeta.iconEmoji}</span>
                          ) : FreeIcon ? (
                            <FreeIcon className={cn("w-5 h-5", freeMeta?.color ? `text-${freeMeta.color}-500` : "text-primary")} />
                          ) : (
                            <span className="text-lg">🎁</span>
                          )}
                          {!isFreeClaimed && freeMeta?.title && (
                            <span className="text-[8px] text-muted-foreground text-center leading-tight px-0.5 line-clamp-2 max-w-full">
                              {freeMeta.title}
                            </span>
                          )}
                          {canClaimFree && !isFreeClaimed && (
                            <span className="text-[7px] font-black text-primary uppercase tracking-wider">Claim</span>
                          )}
                        </div>

                        {/* Premium reward cell */}
                        <div
                          onClick={() => canClaimPrem && !claimingRewards.has(`${reward.level}-premium`)
                            ? claimReward(reward.level, 'premium', reward.premium_reward)
                            : undefined
                          }
                          className={cn(
                            "h-[72px] flex flex-col items-center justify-center gap-0.5 bg-amber-500/5 relative transition-colors",
                            canClaimPrem && "cursor-pointer hover:bg-amber-500/10",
                            isPremClaimed && "bg-green-500/5",
                            !hasPremiumPass && "opacity-40",
                            !isPast && !isCurrent && "opacity-40"
                          )}
                        >
                          {!hasPremiumPass ? (
                            <Lock className="w-3.5 h-3.5 text-amber-500/50" />
                          ) : isPremClaimed ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : premMeta?.iconEmoji ? (
                            <span className="text-xl leading-none">{premMeta.iconEmoji}</span>
                          ) : PremIcon ? (
                            <PremIcon className="w-5 h-5 text-amber-500" />
                          ) : (
                            <span className="text-lg">🔒</span>
                          )}
                          {hasPremiumPass && !isPremClaimed && premMeta?.title && (
                            <span className="text-[8px] text-muted-foreground text-center leading-tight px-0.5 line-clamp-2 max-w-full">
                              {premMeta.title}
                            </span>
                          )}
                          {canClaimPrem && !isPremClaimed && (
                            <span className="text-[7px] font-black text-amber-500 uppercase tracking-wider">Claim</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Elite Pass CTA */}
          {!hasPremiumPass && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => !hasPremiumForever && setShowPaywall(true)}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200",
                "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent",
                "border-amber-500/20 hover:border-amber-500/40",
                !hasPremiumForever && "cursor-pointer"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <Crown className="w-5 h-5 text-amber-950" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Elite Pass</span>
                  <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{uiText.elitePassXp}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug truncate">{uiText.elitePassDescription}</p>
              </div>
              {!hasPremiumForever && (
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setShowPaywall(true); }}
                  className="bg-amber-500 text-amber-950 hover:bg-amber-400 font-bold rounded-xl shrink-0 text-xs h-8"
                >
                  {uiText.activate}
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </>
    );
  };

  const showUpcoming = !activeSeason || !seasonProgress;

  // ИСПРАВЛЕНИЕ МЕРЦАНИЯ: Модалка больше не прыгает при переключении стейтов + Плавные анимации
  const modalContent = useMemo(() => {
    return (
      <AnimatePresence mode="wait">
        {currentView === 'hall_of_fame' && (
          <HallOfFameView key="hall_of_fame" onBack={() => setCurrentView('main')} />
        )}
        {currentView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 w-full"
          >
            {loading ? <SkeletonContent /> : (showUpcoming ? upcomingSeasonContent : (
              DUEL_PASS_NEW_LAYOUT ? <ModalContentV2 /> : <ModalContent />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }, [showUpcoming, loading, upcomingSeasonContent, currentView, activeTab]);

  return (
    <>
      {renderModalShell(modalContent, undefined, showUpcoming ? dp("migration.description") : undefined, {
        showHandle: true,
        contentClassName: showUpcoming ? "px-4 sm:px-6 py-4" : "px-0",
        loading: false,
      })}
      <PaywallModal 
        open={showPaywall} 
        onOpenChange={(open) => {
          setShowPaywall(open);
          if (!open) {
            invalidateSeasonData();
          }
        }} 
      />
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
      {activeCosmeticReward && (
        <RewardUnlockAnimation
          open={!!activeCosmeticReward}
          onOpenChange={(open) => {
            if (!open) {
              setActiveCosmeticReward(null);
            }
          }}
          reward={activeCosmeticReward}
          onQuickApply={
            ["skin", "badge"].includes(activeCosmeticReward.type)
              ? () => handleQuickApplyAppearance(activeCosmeticReward)
              : undefined
          }
          isApplying={isApplyingAppearance}
        />
      )}
    </>
  );
}
