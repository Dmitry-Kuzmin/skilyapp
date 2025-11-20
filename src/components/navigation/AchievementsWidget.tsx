import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AchievementsModalContent } from "./AchievementsModalContent";
import { useIsMobile } from "@/hooks/use-mobile";

const XP_PER_LEVEL = 225;
const ACHIEVEMENTS_CACHE_DURATION = 60000; // 60 секунд

const statsCache: Record<
  string,
  {
    data: ProfileStats;
    timestamp: number;
  }
> = {};

interface ProfileStats {
  xp: number;
  streakDays: number;
}

type ProfileRow = {
  xp: number | null;
  streak_days: number | null;
};

interface AchievementsWidgetProps {
  className?: string;
  variant?: "desktop" | "mobile";
}

export const AchievementsWidget = ({ className, variant = "desktop" }: AchievementsWidgetProps) => {
  const { profileId, isAuthenticated } = useUserContext();
  const { t } = useLanguage();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [open, setOpen] = useState(false);
  const isMobileViewport = useIsMobile();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let skeletonTimeout: NodeJS.Timeout | null = null;
    let hideSkeletonTimeout: NodeJS.Timeout | null = null;

    if (!profileId || !isAuthenticated) {
      setStats(null);
      setLoading(false);
      setShowSkeleton(false);
      return () => {
        isMounted = false;
        if (skeletonTimeout) clearTimeout(skeletonTimeout);
      };
    }

    const now = Date.now();
    const cached = statsCache[profileId];
    if (cached && now - cached.timestamp < ACHIEVEMENTS_CACHE_DURATION) {
      setStats(cached.data);
      setLoading(false);
      setShowSkeleton(false);
      hasInitializedRef.current = true;
      return () => {
        isMounted = false;
      };
    }

    if (!hasInitializedRef.current) {
      skeletonTimeout = setTimeout(() => {
        if (isMounted) {
          setShowSkeleton(true);
        }
      }, 80);
    }

    const loadStats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("xp, streak_days")
          .eq("id", profileId)
          .maybeSingle();

        if (error) {
          console.error("[AchievementsWidget] Failed to load profile stats:", error);
          if (isMounted) {
            const fallback = { xp: 0, streakDays: 0 };
            setStats(fallback);
            statsCache[profileId] = {
              data: fallback,
              timestamp: Date.now(),
            };
          }
          return;
        }

        if (!isMounted) return;
        const row = (data ?? null) as ProfileRow | null;
        if (!row) {
          const fallback = { xp: 0, streakDays: 0 };
          setStats(fallback);
          statsCache[profileId] = {
            data: fallback,
            timestamp: Date.now(),
          };
          return;
        }

        const resolvedStats = {
          xp: row.xp || 0,
          streakDays: row.streak_days || 0,
        };
        setStats(resolvedStats);
        statsCache[profileId] = {
          data: resolvedStats,
          timestamp: Date.now(),
        };
      } finally {
        if (isMounted) {
          setLoading(false);
          hasInitializedRef.current = true;
          hideSkeletonTimeout = setTimeout(() => {
            if (isMounted) {
              setShowSkeleton(false);
            }
          }, 50);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
      if (skeletonTimeout) clearTimeout(skeletonTimeout);
      if (hideSkeletonTimeout) clearTimeout(hideSkeletonTimeout);
    };
  }, [profileId, isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading || showSkeleton) {
    return (
      <Skeleton className={cn("h-7 w-20 rounded-lg bg-muted/40", className)} />
    );
  }

  const xp = stats?.xp ?? 0;
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const xpToNextLevel = xpIntoLevel === 0 ? XP_PER_LEVEL : XP_PER_LEVEL - xpIntoLevel;

  const baseClasses =
    variant === "mobile"
      ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors flex-shrink-0"
      : "hidden sm:inline-flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer flex-shrink-0";

  const trigger = (
    <div className={cn(baseClasses, className)}>
      <Sparkles className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold tabular-nums">{xp.toLocaleString()}</span>
      <span className="text-[11px] text-muted-foreground">XP</span>
    </div>
  );

  const triggerButtonClass = "inline-flex w-auto flex-shrink-0";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(triggerButtonClass, "text-left")}
          aria-label={t("profileMenu.achievements")}
        >
          {trigger}
        </button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-h-[85vh] p-0 flex flex-col",
          isMobileViewport ? "w-screen max-w-none rounded-t-[28px]" : "w-[95vw] max-w-2xl rounded-2xl"
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{t("profileMenu.achievements")}</DialogTitle>
          <DialogDescription>
            {t("profileMenu.achievementsDesc") || "Отслеживайте прогресс и открывайте награды"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <AchievementsModalContent xp={xp} level={level} xpToNextLevel={xpToNextLevel} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

