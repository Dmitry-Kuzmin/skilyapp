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
    <AchievementsHeader
      xp={xp}
      level={level}
      unlockedCount={stats.unlockedCount}
      totalCount={stats.totalCount}
      completionPercent={stats.completionPercent}
    />
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onClose}
      title={title}
      description={description}
      className="max-w-5xl"
      contentClassName="p-0" // Контент сам управляет отступами
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


