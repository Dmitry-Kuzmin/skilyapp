import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AchievementsModalContent } from "./AchievementsModalContent";

const XP_PER_LEVEL = 225;

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      if (!profileId || !isAuthenticated) {
        if (isMounted) {
          setStats(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("xp, streak_days")
          .eq("id", profileId)
          .maybeSingle();

        if (error) {
          console.error("[AchievementsWidget] Failed to load profile stats:", error);
          if (isMounted) {
            setStats({ xp: 0, streakDays: 0 });
          }
          return;
        }

        if (!isMounted) return;
        const row = (data ?? null) as ProfileRow | null;
        if (!row) {
          setStats({ xp: 0, streakDays: 0 });
          return;
        }

        setStats({
          xp: row.xp || 0,
          streakDays: row.streak_days || 0,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [profileId, isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] p-0 flex flex-col">
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

