import React from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { LumiCharacter, LumiMood } from './LumiCharacter';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSafeArea } from '@/hooks/useSafeArea';

export interface LumiToastProps {
  id: string;
  title: string;
  description?: string;
  mood?: LumiMood;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const variantStyles = {
  default: {
    bg: 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30',
    border: 'border-yellow-200/50 dark:border-yellow-800/50',
    text: 'text-foreground',
    title: 'text-foreground',
  },
  success: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
    border: 'border-green-200/50 dark:border-green-800/50',
    text: 'text-green-900 dark:text-green-100',
    title: 'text-green-700 dark:text-green-300',
  },
  error: {
    bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30',
    border: 'border-red-200/50 dark:border-red-800/50',
    text: 'text-red-900 dark:text-red-100',
    title: 'text-red-700 dark:text-red-300',
  },
  warning: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30',
    border: 'border-yellow-200/50 dark:border-yellow-800/50',
    text: 'text-yellow-900 dark:text-yellow-100',
    title: 'text-yellow-700 dark:text-yellow-300',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
    border: 'border-blue-200/50 dark:border-blue-800/50',
    text: 'text-blue-900 dark:text-blue-100',
    title: 'text-blue-700 dark:text-blue-300',
  },
};

export function LumiToast({
  id,
  title,
  description,
  mood = 'idle',
  variant = 'default',
  duration = 5000,
  onClose,
  action,
}: LumiToastProps) {
  const safeArea = useSafeArea();
  const styles = variantStyles[variant];
  
  // Определяем mood на основе variant если не указан
  const finalMood: LumiMood = mood || (
    variant === 'success' ? 'happy' :
    variant === 'error' ? 'thinking' :
    variant === 'warning' ? 'encouraging' :
    'idle'
  );

  // Вычисляем отступ сверху с учетом safe area для Telegram
  const topOffset = safeArea.platform === 'telegram' 
    ? safeArea.top + safeArea.contentTop + 16
    : 16;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "fixed z-[100] max-w-sm w-full mx-4 pointer-events-auto",
        "shadow-2xl rounded-2xl overflow-hidden",
        styles.bg,
        styles.border,
        "border-2"
      )}
      style={{
        top: `${topOffset}px`,
        right: `${safeArea.right + 16}px`,
      }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      
      <div className="relative z-10 p-4">
        <div className="flex items-start gap-3">
          {/* Lumi Character */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="flex-shrink-0"
          >
            <LumiCharacter size="sm" mood={finalMood} animate />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className={cn("font-bold text-sm leading-tight", styles.title)}>
              {title}
            </h4>
            {description && (
              <p className={cn("text-xs leading-relaxed", styles.text)}>
                {description}
              </p>
            )}
            
            {/* Action button */}
            {action && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={cn(
                    "h-7 text-xs font-semibold",
                    variant === 'error' && "border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30",
                    variant === 'success' && "border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30",
                    variant === 'warning' && "border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
                    variant === 'info' && "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  )}
                >
                  {action.label}
                </Button>
              </div>
            )}
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              "h-6 w-6 flex-shrink-0 rounded-full opacity-70 hover:opacity-100 transition-opacity",
              styles.text
            )}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          className={cn(
            "h-1 bg-gradient-to-r",
            variant === 'success' && "from-green-400 to-emerald-400",
            variant === 'error' && "from-red-400 to-rose-400",
            variant === 'warning' && "from-yellow-400 to-amber-400",
            variant === 'info' && "from-blue-400 to-cyan-400",
            variant === 'default' && "from-yellow-400 to-orange-400"
          )}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

