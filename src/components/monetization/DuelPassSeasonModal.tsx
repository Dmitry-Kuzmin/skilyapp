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
import { Trophy, Coins, Crown, Sparkles, X, Clock, BookOpen, Calendar, Target, CheckCircle2, Check, Zap, Gift, Star, ArrowRight, ChevronRight, ChevronDown, Flame, Gauge, Hourglass, Shield, Sticker, Swords, Award, BarChart3, Users, Rocket, Lock, LockOpen, TrendingUp, Info, type LucideIcon } from "lucide-react";
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
import { UserAvatar } from "@/components/UserAvatar";

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

const CountdownTicker = memo(({ endDate, labels, compact }: { endDate?: string | null; labels: CountdownLabels; compact?: boolean }) => {
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

  if (compact) {
    return (
      <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
        {timeLeft.days > 0 ? `${timeLeft.days}${labels.units.days.charAt(0)} ` : ''}
        {String(Math.max(timeLeft.hours, 0)).padStart(2, '0')}:
        {String(Math.max(timeLeft.minutes, 0)).padStart(2, '0')}:
        {String(Math.max(timeLeft.seconds, 0)).padStart(2, '0')}
      </span>
    );
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
  const [currentView, setCurrentView] = useState<'main' | 'hall_of_fame' | 'onboarding'>('main');

  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [top3Leaders, setTop3Leaders] = useState<any[]>([]);
  const [userLeaderboardPos, setUserLeaderboardPos] = useState<{ position: number; total: number } | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setCurrentView('main'); setShowFullLeaderboard(false); }, 300);
    }
  }, [open]);

  // Загрузка ТОП-3 лидерборда при открытии модалки
  useEffect(() => {
    if (!open || !profileId) return;
    let cancelled = false;
    const loadTop3 = async () => {
      setLeaderboardLoading(true);
      try {
        const [topRes, posRes] = await Promise.allSettled([
          supabaseClient.functions.invoke("duel-pass-leaderboard", {
            body: { type: "top", limit: 3, page: 1, page_size: 3, filter_type: "global" },
          }),
          supabaseClient.functions.invoke("duel-pass-leaderboard", {
            body: { type: "user_position", user_id: profileId, neighbors_count: 0, filter_type: "global" },
          }),
        ]);
        if (cancelled) return;
        if (topRes.status === 'fulfilled' && topRes.value.data?.leaderboard) {
          setTop3Leaders(topRes.value.data.leaderboard.slice(0, 3));
        }
        if (posRes.status === 'fulfilled' && posRes.value.data?.position) {
          setUserLeaderboardPos({ position: posRes.value.data.position, total: posRes.value.data.total_players });
        }
      } catch (err) {
        console.warn("[DuelPassSeasonModal] Leaderboard top3 load error:", err);
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    };
    loadTop3();

    // Onboarding check
    const hasSeenOnboarding = localStorage.getItem('duel_pass_onboarding_v1');
    if (!hasSeenOnboarding) {
      setCurrentView('onboarding');
    }

    return () => { cancelled = true; };
  }, [open, profileId]);

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

  const { claimedFreeRewards, claimedPremiumRewards } = useMemo(() => {
    const base = buildClaimedSets(seasonData?.claimedRecords ?? []);
    return {
      claimedFreeRewards: new Set([...base.claimedFreeRewards, ...localClaimedFree]),
      claimedPremiumRewards: new Set([...base.claimedPremiumRewards, ...localClaimedPremium]),
    };
  }, [seasonData?.claimedRecords, localClaimedFree, localClaimedPremium]);

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
      showRanking: language === "ru" ? "Полный рейтинг" : language === "es" ? "Ver ranking completo" : "View full ranking",
      hideRanking: language === "ru" ? "Скрыть рейтинг" : language === "es" ? "Ocultar ranking" : "Hide ranking",
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

  // Countdown for V2 compact header (CountdownTicker handles V1 hero block separately)
  const seasonEndDateStr = activeSeason?.end_date ?? null;
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(seasonEndDateStr));
  useEffect(() => {
    if (!seasonEndDateStr) { setTimeLeft(null); return; }
    setTimeLeft(calculateTimeLeft(seasonEndDateStr));
    const t = setInterval(() => setTimeLeft(calculateTimeLeft(seasonEndDateStr)), 1000);
    return () => clearInterval(t);
  }, [seasonEndDateStr]);

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
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
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

  const OnboardingView = () => {
    const features = [
      {
        icon: Trophy,
        title: language === 'ru' ? 'Твой сезонный путь' : language === 'es' ? 'Tu viaje de temporada' : 'Your Seasonal Journey',
        description: language === 'ru' ? 'Выполняй задания и собирай награды.' : language === 'es' ? 'Completa tareas y recoge recompensas.' : 'Complete tasks and collect rewards.',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
      },
      {
        icon: Zap,
        title: language === 'ru' ? 'Играй и прогрессируй' : language === 'es' ? 'Juega y progresa' : 'Play & Progress',
        description: language === 'ru' ? 'За каждую дуэль ты получаешь SP.' : language === 'es' ? 'Por cada duelo recibes SP.' : 'For every duel you receive SP.',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10'
      },
      {
        icon: Crown,
        title: 'Elite Pass',
        description: language === 'ru' ? 'В 2 раза больше опыта и эксклюзив.' : language === 'es' ? 'Doble experiencia y recompensas.' : 'Double XP and exclusive rewards.',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10'
      },
      {
        icon: Swords,
        title: language === 'ru' ? 'Зал Славы' : language === 'es' ? 'Salón de la Fama' : 'Hall of Fame',
        description: language === 'ru' ? 'Топ-3 игроков заберут монеты.' : language === 'es' ? 'El Top-3 se llevará monedas.' : 'Top 3 players take coins.',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10'
      }
    ];

    const handleNext = () => {
      localStorage.setItem('duel_pass_onboarding_v1', 'true');
      setCurrentView('main');
    };

    return (
      <div className="flex flex-col min-h-[480px] px-6 py-8 relative overflow-hidden bg-slate-950">
        {/* Festival Ambient */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 text-center mb-8 mt-2">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-4 shadow-xl">
            <Trophy className="w-8 h-8 text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight leading-none uppercase">
            Duel Pass
          </h2>
          <p className="text-slate-400 text-sm mt-3 max-w-[280px] mx-auto font-medium">
            {language === 'ru' ? 'Новый сезон начался! Участвуй в гонке за призами.' : language === 'es' ? '¡Nueva temporada iniciada! Participa en la carrera por premios.' : 'New season started! Join the race for prizes.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-auto relative z-10 flex-1">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", f.bg)}>
                <f.icon className={cn("w-5 h-5", f.color)} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white leading-tight mb-0.5">{f.title}</h3>
                <p className="text-[11px] text-slate-400 leading-tight">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 relative z-10 w-full flex justify-center pb-2">
          <Button
            size="lg"
            onClick={handleNext}
            className="w-full max-w-[280px] h-12 rounded-2xl font-black text-base uppercase tracking-wider shadow-xl shadow-primary/20 transition-transform active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {language === 'ru' ? 'Начать путь' : language === 'es' ? 'Empezar viaje' : 'Start Journey'}
          </Button>
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

    if (currentView === 'onboarding') {
      return OnboardingView();
    }



    return (
      <>
        {/* ── 1. Premium Hero Section (Clean & Iconic) ────────────────── */}
        <div className={cn(
          "relative overflow-hidden pt-14 pb-16 px-6 sm:px-10",
          seasonTheme.gradient,
          "rounded-b-[4rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        )}>
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),transparent_70%)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-10">
            {/* Minimal Season Identity */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full opacity-50" />
                <div className="w-24 h-24 rounded-[2.5rem] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-center relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Trophy className="w-12 h-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase leading-none drop-shadow-lg">
                    {activeSeasonName}
                  </h1>
                  <button 
                    onClick={() => setCurrentView('onboarding')}
                    className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors border border-white/10"
                    title="О Duel Pass"
                  >
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-3 py-1 px-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mx-auto w-fit">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.1em]">
                    {dp("hero.countdownLabel") || "Temporada finaliza en"}
                  </span>
                  <CountdownTicker endDate={activeSeason.end_date} labels={countdownLabels} compact />
                </div>
              </div>
            </motion.div>

            {/* Clean Progress Gauge (Duolingo Style) */}
            <div className="w-full max-w-md bg-white/10 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl space-y-4">
              <div className="flex justify-between items-center px-1">
                <div className="text-left">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">Nivel actual</p>
                  <p className="text-4xl font-black text-white leading-none tracking-tighter">Lv {currentLevel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">Tu progreso</p>
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="text-xl font-black text-white tabular-nums tracking-tighter">{currentSP.toLocaleString()}</span>
                    <span className="text-xs font-bold text-white/20 uppercase tracking-tighter">/ {totalSPNeeded.toLocaleString()} SP</span>
                  </div>
                </div>
              </div>
              
              <div className="relative h-6 bg-black/40 rounded-full border border-white/10 p-1 overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                  className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_20px_rgba(255,255,255,0.2)]", seasonTheme.progressGradient)}
                />
              </div>

              {currentLevel < maxLevel && spToNextLevel > 0 && (
                <div className="flex items-center justify-center gap-2 text-white/40">
                  <Rocket className="w-3 h-3" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">
                    {dp("progress.toNext", { sp: spToNextLevel, level: currentLevel + 1 })}
                  </p>
                </div>
              )}
            </div>

            {/* Premium Podium (Clean Bento Style) */}
            <div className="w-full relative">
              {leaderboardLoading ? (
                <div className="flex items-end justify-center gap-4 py-10">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="w-24 h-32 rounded-[2rem] bg-white/5" />)}
                </div>
              ) : top3Leaders.length >= 3 ? (
                <div className="space-y-10 pt-4">
                  <div className="flex items-end justify-center gap-3 sm:gap-6 relative">
                    {/* Visual Pedestal Shadow */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-8 bg-black/40 blur-3xl opacity-50" />
                    
                    {/* 2nd Place */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex-1 max-w-[105px] flex flex-col items-center gap-3 p-4 rounded-[2.2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl group hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="relative">
                        <UserAvatar profileId={top3Leaders[1]?.user_id} size="lg" avatarClassName="rounded-full ring-2 ring-white/10 shadow-2xl" />
                        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-slate-200 text-slate-900 flex items-center justify-center font-black text-xs shadow-lg border-2 border-white/20">2</div>
                      </div>
                      <div className="text-center w-full min-w-0">
                        <p className="text-[11px] font-black text-white/90 truncate uppercase leading-none mb-1">{top3Leaders[1]?.profile?.first_name || "???"}</p>
                        <p className="text-[10px] font-bold text-white/30 tabular-nums">{(top3Leaders[1]?.season_points || 0).toLocaleString()} SP</p>
                      </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: -16 }}
                      transition={{ delay: 0.3, type: "spring", damping: 15 }}
                      className="flex-1 max-w-[135px] flex flex-col items-center gap-4 p-6 rounded-[2.8rem] bg-white/10 backdrop-blur-3xl border-2 border-white/20 shadow-[0_30px_70px_rgba(0,0,0,0.5)] z-10 relative group"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] fill-yellow-400/20" />
                        </motion.div>
                      </div>
                      <div className="relative">
                        <UserAvatar profileId={top3Leaders[0]?.user_id} size="xl" avatarClassName="rounded-full ring-4 ring-yellow-400/30 shadow-2xl transition-transform group-hover:scale-105" />
                        <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 flex items-center justify-center font-black text-sm shadow-2xl border-4 border-black/10">1</div>
                      </div>
                      <div className="text-center w-full min-w-0">
                        <p className="text-[13px] font-black text-yellow-400 truncate uppercase leading-none mb-1 tracking-tighter">{top3Leaders[0]?.profile?.first_name || "???"}</p>
                        <p className="text-[11px] font-black text-yellow-500/60 tabular-nums italic">{(top3Leaders[0]?.season_points || 0).toLocaleString()} SP</p>
                      </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex-1 max-w-[105px] flex flex-col items-center gap-3 p-4 rounded-[2.2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl group hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="relative">
                        <UserAvatar profileId={top3Leaders[2]?.user_id} size="lg" avatarClassName="rounded-full ring-2 ring-white/10 shadow-2xl" />
                        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-orange-600 text-orange-50 flex items-center justify-center font-black text-xs shadow-lg border-2 border-white/20">3</div>
                      </div>
                      <div className="text-center w-full min-w-0">
                        <p className="text-[11px] font-black text-white/90 truncate uppercase leading-none mb-1">{top3Leaders[2]?.profile?.first_name || "???"}</p>
                        <p className="text-[10px] font-bold text-white/30 tabular-nums">{(top3Leaders[2]?.season_points || 0).toLocaleString()} SP</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* User Stats & Action (Clean Center Alignment) */}
                  <div className="flex flex-col items-center gap-6">
                    {userLeaderboardPos && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-6 px-10 py-4 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 shadow-2xl"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Clasificación</span>
                          <span className="text-2xl font-black text-white tracking-tighter italic">#{userLeaderboardPos.position}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Total jugadores</span>
                          <span className="text-lg font-bold text-white/60 tabular-nums">{userLeaderboardPos.total.toLocaleString()}</span>
                        </div>
                      </motion.div>
                    )}

                    <button
                      onClick={() => setCurrentView('hall_of_fame')}
                      className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 active:scale-95"
                    >
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">
                        {dp("hallOfFame.title") === "duelPass.hallOfFame.title" ? "Salón de la Fama" : dp("hallOfFame.title")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── 2. Sequential Interaction (Clean Transition) ─────────── */}
        <div className={cn("py-6", isMobile ? "px-4" : "px-8")}>
          <button
            onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
            className="w-full group flex flex-col items-center gap-2 py-4 rounded-[2.5rem] bg-muted/30 hover:bg-muted/50 border border-border/40 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs font-black text-muted-foreground group-hover:text-foreground uppercase tracking-tight transition-colors">
                {showFullLeaderboard ? (uiText.hideRanking || 'Ocultar clasificación completa') : (uiText.showRanking || 'Ver clasificación completa')}
              </span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground/40 transition-transform duration-500", showFullLeaderboard && "rotate-180")} />
            </div>
          </button>

          {showFullLeaderboard && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 border-t border-border/20"
            >
              <DuelPassLeaderboardView
                embedded
                onOpenHallOfFame={() => setCurrentView('hall_of_fame')}
              />
            </motion.div>
          )}
        </div>

        {/* ── 3. Reward Track ──────────────────────────────────────── */}
        <div className="flex flex-col gap-6 px-4 sm:px-6 pb-4 overflow-hidden">





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

                {/* Responsive Reward Track */}
                <div className="space-y-1">
                  {/* Header row */}
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <div className="w-10 shrink-0 text-center">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                        {dp("table.columns.level") || "LV"}
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
                          {dp("table.columns.free") || "Gratis"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
                          {dp("table.columns.premium") || "Premium"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {filteredRewards.map((reward) => {
                    const unlocked = currentLevel >= reward.level;
                    const isCurrent = currentLevel === reward.level;
                    const hasFreeReward = !!reward.free_reward;
                    const freeClaimed = claimedFreeRewards.has(reward.level);
                    const premiumClaimed = claimedPremiumRewards.has(reward.level);

                    let allClaimed = false;
                    if (unlocked) {
                      const freeRewardClaimed = hasFreeReward ? freeClaimed : true;
                      let premiumRewardClaimed = true;
                      if (reward.premium_reward) {
                        if (isPremium) {
                          premiumRewardClaimed = premiumClaimed;
                        } else {
                          premiumRewardClaimed = hasFreeReward ? true : false;
                        }
                      }
                      if (!hasFreeReward && reward.premium_reward && !isPremium) {
                        allClaimed = false;
                      } else {
                        allClaimed = freeRewardClaimed && premiumRewardClaimed;
                      }
                    }

                    return (
                      <div
                        key={reward.level}
                        className={cn(
                          "relative flex items-stretch gap-2 group transition-all duration-300",
                          isCurrent && "z-10",
                          !unlocked && "opacity-40 grayscale-[0.5]"
                        )}
                      >
                        {/* Level badge + connector */}
                        <div className="w-10 shrink-0 flex flex-col items-center py-1.5">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all shadow-sm relative z-10 shrink-0",
                            isCurrent
                              ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg"
                              : allClaimed
                                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                : "bg-muted/50 text-muted-foreground/60 border border-border/40"
                          )}>
                            {isCurrent && !allClaimed ? (
                              <Zap className="w-4 h-4" />
                            ) : allClaimed ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : reward.level}
                          </div>
                          {reward.level < rewards.length && (
                            <div className="w-0.5 flex-1 mt-1 bg-border/20 rounded-full" />
                          )}
                        </div>

                        {/* Reward cards — always 2-col grid, no overflow */}
                        <div className="flex-1 grid grid-cols-2 gap-2 min-w-0 py-1.5">
                          {/* Free reward */}
                          <div className={cn(
                            "rounded-2xl border p-2 transition-all overflow-hidden",
                            freeClaimed
                              ? "bg-green-500/5 border-green-500/20"
                              : isCurrent
                                ? "bg-background border-primary/30 shadow-md"
                                : "bg-background/40 border-border/40"
                          )}>
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
                          </div>

                          {/* Premium reward */}
                          <div className={cn(
                            "rounded-2xl border p-2 transition-all relative overflow-hidden",
                            premiumClaimed
                              ? "bg-green-500/5 border-green-500/20"
                              : isPremium
                                ? isCurrent ? "bg-amber-500/5 border-amber-500/30 shadow-md" : "bg-amber-500/5 border-amber-500/10"
                                : "bg-black/20 border-white/5"
                          )}>
                            {isPremium && <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />}
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>

          {/* Elite Pass CTA (Floating / Sticky Bottom) */}
          {!hasPremiumPass && (
            <div className="sticky bottom-4 z-30 w-full mt-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !hasPremiumForever && setShowPaywall(true)}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 shadow-2xl backdrop-blur-xl",
                  "bg-gradient-to-r from-amber-500/90 via-amber-600/90 to-amber-700/90",
                  "border-amber-400/50 hover:border-amber-300",
                  !hasPremiumForever && "cursor-pointer"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                  <Crown className="w-5 h-5 text-amber-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white drop-shadow-md">Elite Pass</span>
                    <span className="text-[9px] font-black text-amber-950 bg-amber-300/90 px-1.5 py-0.5 rounded-full uppercase tracking-wider">{uiText.elitePassXp}</span>
                  </div>
                  <p className="text-[11px] text-white/80 leading-snug truncate drop-shadow-sm">{uiText.elitePassDescription}</p>
                </div>
                {!hasPremiumForever && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setShowPaywall(true); }}
                    className="bg-white text-amber-950 hover:bg-amber-100 font-bold rounded-xl shrink-0 text-xs h-8 shadow-lg"
                  >
                    {uiText.activate}
                  </Button>
                )}
              </motion.div>
            </div>
          )}

          {/* Daily Quests — same as main page widget */}
          <div className="border-t pt-4 border-white/5">
            <DailyQuestWidget />
          </div>
        </div>
      </>
    );
  };


  const showUpcoming = !activeSeason || !seasonProgress;

  // ИСПРАВЛЕНИЕ МЕРЦАНИЯ: вызываем ModalContent() как функцию, а не <ModalContent />.
  // Если использовать JSX-компонент (<ModalContent />), React видит новый тип компонента
  // при каждом ре-рендере (функция пересоздаётся) → unmount + remount → мелькание.
  // Вызов как функция инлайнит JSX в дерево без компонентного граничника.
  const modalContent = useMemo(() => {
    return (
      <AnimatePresence mode="wait">
        {currentView === 'hall_of_fame' && (
          <HallOfFameView key="hall_of_fame" onBack={() => setCurrentView('main')} />
        )}
        {(currentView === 'main' || currentView === 'onboarding') && (
          <motion.div
            key="main_content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 w-full"
          >
            {loading ? SkeletonContent() : (showUpcoming ? upcomingSeasonContent : ModalContent())}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }, [showUpcoming, loading, upcomingSeasonContent, currentView, showFullLeaderboard]);

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
