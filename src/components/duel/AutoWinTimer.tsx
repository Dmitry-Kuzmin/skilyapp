import { motion } from "@/components/optimized/Motion";
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface AutoWinTimerProps {
  timeRemaining: number; // в секундах
  onComplete: () => void;
  className?: string;
}

/**
 * Компонент таймера авто-победы в стиле Cyberpunk
 * Показывает круговой прогресс-бар и текст "OPPONENT SIGNAL LOST. AUTO-WIN SEQUENCE: Xs"
 */
export function AutoWinTimer({
  timeRemaining,
  onComplete,
  className,
}: AutoWinTimerProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Прогресс от 100% до 0%
    const totalTime = 60; // 60 секунд общий таймер
    const newProgress = (timeRemaining / totalTime) * 100;
    setProgress(Math.max(0, Math.min(100, newProgress)));

    if (timeRemaining <= 0) {
      onComplete();
    }
  }, [timeRemaining, onComplete]);

  const circumference = 2 * Math.PI * 40; // радиус 40
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Круговой прогресс-бар */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          {/* Фоновый круг */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-zinc-800"
          />
          {/* Прогресс */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className="text-red-500"
            initial={{ strokeDasharray: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </svg>
        
        {/* Центральный текст */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">
              {Math.ceil(timeRemaining)}
            </div>
            <div className="text-[8px] text-zinc-400 uppercase tracking-wider">
              sec
            </div>
          </div>
        </div>
      </div>

      {/* Текст статуса */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
            Signal Lost
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider text-center">
          Auto-Win Sequence
        </span>
      </div>
    </div>
  );
}

