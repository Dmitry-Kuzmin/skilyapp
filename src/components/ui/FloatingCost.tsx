import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingCostProps {
  cost: number;
  x: number; // Позиция X относительно viewport
  y: number; // Позиция Y относительно viewport
  onComplete: () => void;
}

export function FloatingCost({ cost, x, y, onComplete }: FloatingCostProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 0 }}
        animate={{ 
          opacity: [0, 1, 1, 0], 
          scale: [0.5, 1, 1, 0.8],
          y: -60,
          x: 0
        }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1],
          times: [0, 0.2, 0.7, 1]
        }}
        onAnimationComplete={onComplete}
        className={cn(
          "fixed pointer-events-none z-50",
          "flex items-center gap-1",
          "font-mono font-bold text-sm",
          "text-red-500 dark:text-red-400",
          "drop-shadow-lg"
        )}
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        <span>-{cost}</span>
        <Coins className="w-3 h-3 text-yellow-500" />
      </motion.div>
    </AnimatePresence>
  );
}






















