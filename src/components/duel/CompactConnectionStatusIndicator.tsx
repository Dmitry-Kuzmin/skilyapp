/**
 * 🎯 Compact Connection Status Indicator
 * 
 * Компактный индикатор статуса подключения оппонента с таймером авто-победы.
 * Показывается рядом с аватаром оппонента в углу экрана.
 * 
 * Статусы:
 * - Online: Зеленая точка (пульсирует)
 * - Unstable (7-15s): Желтая/оранжевая точка
 * - Offline (>15s): Красная точка + обратный отсчет
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRACE_PERIOD_MS, UNSTABLE_THRESHOLD_MS, AUTO_WIN_TIMEOUT_MS } from '@/features/duel/shared';

interface CompactConnectionStatusIndicatorProps {
  /** Время последнего heartbeat оппонента */
  lastSeen: Date | null;
  /** Статус подключения из БД */
  isConnected: boolean;
  /** Класс для позиционирования */
  className?: string;
}

type ConnectionQuality = 'good' | 'fair' | 'poor' | 'offline';

/**
 * Определяет качество соединения на основе времени последнего heartbeat
 */
function getConnectionQuality(lastSeen: Date | null, isConnected: boolean): ConnectionQuality {
  if (!lastSeen || isConnected) {
    return 'good';
  }

  const timeSinceLastSeen = Date.now() - lastSeen.getTime();

  if (timeSinceLastSeen < GRACE_PERIOD_MS) {
    return 'good'; // В пределах grace period - считаем онлайн
  }

  if (timeSinceLastSeen < UNSTABLE_THRESHOLD_MS) {
    return 'fair'; // 7-15 секунд - нестабильно
  }

  if (timeSinceLastSeen < AUTO_WIN_TIMEOUT_MS) {
    return 'poor'; // 15-60 секунд - офлайн, но еще не авто-победа
  }

  return 'offline'; // >60 секунд - точно офлайн
}

/**
 * Вычисляет оставшееся время до авто-победы в секундах
 */
function getAutoWinTimeRemaining(lastSeen: Date | null): number | null {
  if (!lastSeen) return null;

  const timeSinceLastSeen = Date.now() - lastSeen.getTime();
  const remaining = AUTO_WIN_TIMEOUT_MS - timeSinceLastSeen;

  if (remaining <= 0) return 0;
  if (timeSinceLastSeen < GRACE_PERIOD_MS) return null; // Еще в grace period

  return Math.ceil(remaining / 1000);
}

const qualityConfig = {
  good: {
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    pulse: true,
    showTimer: false,
  },
  fair: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    pulse: true,
    showTimer: false,
  },
  poor: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    pulse: false,
    showTimer: true,
  },
  offline: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    pulse: false,
    showTimer: true,
  },
};

export function CompactConnectionStatusIndicator({
  lastSeen,
  isConnected,
  className,
}: CompactConnectionStatusIndicatorProps) {
  const quality = getConnectionQuality(lastSeen, isConnected);
  const timeRemaining = getAutoWinTimeRemaining(lastSeen);
  const config = qualityConfig[quality];

  // Не показываем индикатор если соединение хорошее
  if (quality === 'good') {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn(
        "absolute -bottom-0.5 -right-0.5 z-20 flex items-center gap-1.5",
        "bg-background/95 backdrop-blur-sm rounded-full px-1.5 py-0.5",
        "border border-zinc-800 shadow-lg",
        className
      )}
    >
      {/* Точка статуса */}
      <motion.div
        className={cn(
          "w-2 h-2 rounded-full border",
          config.bgColor,
          config.borderColor,
          config.color
        )}
        animate={config.pulse ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1]
        } : {}}
        transition={config.pulse ? {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      >
        <div className="w-full h-full rounded-full bg-current" />
      </motion.div>

      {/* Таймер (только для poor/offline) */}
      <AnimatePresence>
        {config.showTimer && timeRemaining !== null && timeRemaining > 0 && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-0.5 overflow-hidden"
          >
            <AlertCircle className="w-2.5 h-2.5 text-current" />
            <span className={cn(
              "text-[10px] font-semibold tabular-nums whitespace-nowrap",
              quality === 'offline' ? 'text-red-500' : 'text-orange-500'
            )}>
              {timeRemaining}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

