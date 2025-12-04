import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';
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

export function AchievementsModalVaul({ 
  open, 
  onClose, 
  xp, 
  level, 
  xpToNextLevel,
  title,
  description 
}: AchievementsModalVaulProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Общий контент для desktop и mobile
  const modalContent = (
    <>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40 shrink-0 sm:px-6 sm:pt-6 sm:pb-4">
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground sm:text-sm mt-1">
            {description}
          </p>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 scrollbar-none overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <AchievementsModalContent xp={xp} level={level} xpToNextLevel={xpToNextLevel} />
      </div>
    </>
  );

  // Mobile - Vaul Drawer
  if (isMobile) {
    return (
      <Drawer.Root 
        open={open} 
        onOpenChange={onClose}
        shouldScaleBackground
        dismissible={true}
        modal={true}
        fadeFromIndex={0}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
            className="bg-background flex flex-col rounded-t-[24px] border-t border-border/50 shadow-2xl z-50 focus:outline-none fixed bottom-0 left-0 right-0 max-h-[90vh]"
          >
            {/* Drawer Handle */}
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-800 mt-4" aria-hidden="true" />
            
            {/* Content Wrapper */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {modalContent}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop - Framer Motion Modal
  return (
    <AnimatePresence mode="wait">
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 30, stiffness: 400, duration: 0.25 }}
            className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-background rounded-[24px] border border-border/50 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {modalContent}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

