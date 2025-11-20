import { useEffect, useState } from "react";
import { Trophy, Sparkles } from "lucide-react";
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

        if (isMounted) {
          setStats({
            xp: data?.xp || 0,
            streakDays: data?.streak_days || 0,
          });
        }
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
    return variant === "mobile" ? (
      <Skeleton className={cn("h-12 w-full rounded-xl", className)} />
    ) : (
      <Skeleton className={cn("h-10 w-40 rounded-xl", className)} />
    );
  }

  const xp = stats?.xp ?? 0;
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const progress = (xpIntoLevel / XP_PER_LEVEL) * 100;
  const xpToNextLevel = xpIntoLevel === 0 ? XP_PER_LEVEL : XP_PER_LEVEL - xpIntoLevel;

  const baseClasses =
    variant === "mobile"
      ? "w-full px-4 py-3 rounded-2xl border border-border/50 bg-card/70 backdrop-blur flex items-center gap-3"
      : "flex items-center gap-3 px-3 py-2 rounded-2xl border border-border/40 bg-card/70 hover:bg-card transition-colors shadow-sm";

  const trigger = (
    <div className={cn(baseClasses, className)}>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow">
        <Trophy className="w-4 h-4 text-white" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-xs text-muted-foreground">{t("profileMenu.achievements")}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tabular-nums">{xp.toLocaleString()} XP</span>
          <span className="text-xs text-muted-foreground">Lvl {level}</span>
        </div>
      </div>
      <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-primary" />
        <span>{xpToNextLevel} XP →</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="w-full text-left">
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
          <AchievementsModalContent xp={xp} level={level} xpToNextLevel={xpToNextLevel} onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

