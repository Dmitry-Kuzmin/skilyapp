import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      ? "w-full px-4 py-3 rounded-2xl border border-border/60 bg-card/70 backdrop-blur space-y-2 text-left"
      : "flex items-center gap-3 px-3 py-2 rounded-2xl border border-border/40 bg-card/70 hover:bg-card transition-colors shadow-sm";

  return (
    <button
      type="button"
      onClick={() => navigate("/achievements")}
      className={cn(baseClasses, className)}
    >
      <div className={cn("flex items-center gap-3", variant === "mobile" && "w-full")}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("profileMenu.achievements")}</span>
            <span>Lvl {level}</span>
          </div>
          <div className="text-base font-semibold tabular-nums leading-tight">
            {xp.toLocaleString()} XP
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>{xpToNextLevel} XP →</span>
          </div>
        </div>
      </div>
      <div className={cn("w-full h-1.5 rounded-full bg-border/30 overflow-hidden", variant !== "mobile" && "hidden sm:block sm:w-32")}>
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
};

