import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AchievementsModalVaul } from "./AchievementsModalVaul";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfileData } from "@/hooks/useProfileData";

const XP_PER_LEVEL = 225;

interface AchievementsWidgetProps {
  className?: string;
  variant?: "desktop" | "mobile";
}

/**
 * ОПТИМИЗИРОВАННЫЙ AchievementsWidget
 * БЫЛО: Собственный запрос к profiles (дублировался 5+ раз)
 * СТАЛО: Использует useProfileData (единый кэш для всего приложения)
 */
export const AchievementsWidget = ({ className, variant = "desktop" }: AchievementsWidgetProps) => {
  const { isAuthenticated } = useUserContext();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const isMobileViewport = useIsMobile();
  
  // ОПТИМИЗАЦИЯ: Используем общий кэш профиля вместо собственного запроса
  const { xp, streakDays, loading } = useProfileData();

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <Skeleton className={cn("h-7 w-20 rounded-lg bg-muted/40", className)} />
    );
  }

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
    <>
      <button
        type="button"
        className={cn(triggerButtonClass, "text-left")}
        aria-label={t("profileMenu.achievements")}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>
      
      <AchievementsModalVaul
        open={open}
        onClose={() => setOpen(false)}
        xp={xp}
        level={level}
        xpToNextLevel={xpToNextLevel}
        title={t("profileMenu.achievements")}
        description={t("profileMenu.achievementsDesc") || "Отслеживайте прогресс и открывайте награды"}
      />
    </>
  );
};

