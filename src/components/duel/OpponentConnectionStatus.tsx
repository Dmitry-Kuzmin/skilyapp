import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpponentConnectionStatusProps {
  isConnected: boolean;
  timeSinceLastHeartbeat: number; // в миллисекундах
  className?: string;
}

/**
 * Компонент для отображения статуса подключения оппонента
 * Показывает визуальные индикаторы в стиле Cyberpunk:
 * - Зеленый Wi-Fi: стабильное подключение
 * - Мигающий красный Wi-Fi: нестабильное подключение (> 2 сек без heartbeat)
 * - Красный Wi-Fi Off: отключение (> 5 сек без heartbeat)
 */
export function OpponentConnectionStatus({
  isConnected,
  timeSinceLastHeartbeat,
  className,
}: OpponentConnectionStatusProps) {
  const isUnstable = timeSinceLastHeartbeat > 2000 && timeSinceLastHeartbeat <= 5000;
  const isDisconnected = timeSinceLastHeartbeat > 5000;

  return (
    <AnimatePresence>
      {(isUnstable || isDisconnected) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            "bg-zinc-900/90 backdrop-blur-sm border",
            isUnstable && "border-yellow-500/50 bg-yellow-500/10",
            isDisconnected && "border-red-500/50 bg-red-500/10",
            className
          )}
        >
          {isDisconnected ? (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                Connection Lost
              </span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Wifi className="w-4 h-4 text-yellow-500" />
              </motion.div>
              <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">
                Unstable
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

