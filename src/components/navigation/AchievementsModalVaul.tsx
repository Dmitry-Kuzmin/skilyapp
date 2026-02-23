import { useState, useCallback } from "react";
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { AchievementsModalContent } from './AchievementsModalContent';
import { AchievementsHeader } from "./AchievementsHeader";

interface AchievementsModalVaulProps {
  open: boolean;
  onClose: () => void;
  xp: number;
  level: number;
  xpToNextLevel: number;
  title: string;
  description?: string;
}

interface Stats {
  unlockedCount: number;
  totalCount: number;
  completionPercent: number;
}

/**
 * 🏆 GOLD STANDARD - Achievements Modal
 * Использует ResponsiveModal для автоматического переключения UI:
 * - Mobile: Vaul Drawer (bottom sheet)
 * - Desktop: Centered Dialog
 */
export function AchievementsModalVaul({
  open,
  onClose,
  xp,
  level,
  xpToNextLevel,
  title,
  description
}: AchievementsModalVaulProps) {
  const [stats, setStats] = useState<Stats>({
    unlockedCount: 0,
    totalCount: 0,
    completionPercent: 0
  });

  const handleStatsUpdate = useCallback((newStats: Stats) => {
    setStats(newStats);
  }, []);

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-8 pt-6 pb-4 border-b border-white/10 relative">
      <div className="flex flex-col gap-1 pr-12">
        <h2 className="text-xl font-bold text-foreground leading-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
        )}
      </div>

      <div className="flex shrink-0">
        <AchievementsHeader
          xp={xp}
          level={level}
          unlockedCount={stats.unlockedCount}
          totalCount={stats.totalCount}
          completionPercent={stats.completionPercent}
          isCompact={true}
        />
      </div>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onClose}
      className="max-w-5xl"
      contentClassName="p-0"
      headerContent={header}
    >
      <div className="p-4 sm:p-6">
        <AchievementsModalContent
          xp={xp}
          level={level}
          xpToNextLevel={xpToNextLevel}
          hideHeader={true}
          onStatsUpdate={handleStatsUpdate}
        />
      </div>
    </ResponsiveModal>
  );
}


