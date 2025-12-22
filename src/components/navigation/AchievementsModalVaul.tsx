import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { AchievementsModalContent } from './AchievementsModalContent';

interface AchievementsModalVaulProps {
  open: boolean;
  onClose: () => void;
  xp: number;
  level: number;
  xpToNextLevel: number;
  title: string;
  description?: string;
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
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onClose}
      title={title}
      description={description}
      className="max-w-2xl"
      contentClassName="p-0" // Контент сам управляет отступами
    >
      <div className="p-4 sm:p-6">
        <AchievementsModalContent
          xp={xp}
          level={level}
          xpToNextLevel={xpToNextLevel}
        />
      </div>
    </ResponsiveModal>
  );
}


