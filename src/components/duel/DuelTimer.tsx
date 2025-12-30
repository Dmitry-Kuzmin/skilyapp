import { motion } from "@/components/optimized/Motion";
import { Clock } from 'lucide-react';
import { memo } from 'react';

interface DuelTimerProps {
  timeLeft: number;
  formatTime: (ms: number) => string;
}

export const DuelTimer = memo(({ timeLeft, formatTime }: DuelTimerProps) => {
  const isLowTime = timeLeft < 10000;

  return (
    <motion.div
      className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full bg-muted/80 backdrop-blur-sm border shrink-0 ${
        isLowTime ? 'border-destructive' : 'border-border'
      }`}
      animate={{
        scale: isLowTime ? [1, 1.05, 1] : 1,
        boxShadow: isLowTime
          ? ['0 0 0px rgba(239, 68, 68, 0)', '0 0 8px rgba(239, 68, 68, 0.5)', '0 0 0px rgba(239, 68, 68, 0)']
          : '0 0 0px rgba(0, 0, 0, 0)'
      }}
      transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
    >
      <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
      <span className={`font-mono font-bold text-xs md:text-sm ${isLowTime ? 'text-destructive' : ''}`}>
        {formatTime(timeLeft)}
      </span>
    </motion.div>
  );
});

DuelTimer.displayName = 'DuelTimer';


