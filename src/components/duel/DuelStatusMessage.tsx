import { motion } from "@/components/optimized/Motion";
import { UserX, LogOut, Trophy, AlertTriangle, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DuelStatus } from '@/features/duel/shared';

interface DuelStatusMessageProps {
  status: DuelStatus;
  opponentName?: string;
  className?: string;
}

const statusConfig = {
  not_started: {
    icon: UserX,
    title: 'Соперник не присоединился',
    description: 'Ставка возвращена',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-muted-foreground/20',
    iconColor: 'text-muted-foreground'
  },
  player_left: {
    icon: LogOut,
    title: 'Вы покинули дуэль',
    description: 'Это засчитано как поражение',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-500'
  },
  opponent_left: {
    icon: Trophy,
    title: 'Соперник покинул дуэль',
    description: 'Победа засчитана',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-500'
  },
  technical_draw: {
    icon: AlertTriangle,
    title: 'Техническая проблема',
    description: 'Дуэль не засчитана, награды сохранены',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-500'
  },
  under_review: {
    icon: Clock,
    title: 'Система проверяет дуэль',
    description: 'Выплата будет начислена после проверки (до 24 часов)',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500'
  },
  abandoned: {
    icon: Shield,
    title: 'Дуэль прервана',
    description: 'Ставки возвращены',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-500'
  }
};

export function DuelStatusMessage({ 
  status, 
  opponentName,
  className 
}: DuelStatusMessageProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 p-4 shadow-lg",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      
      <div className="relative z-10 flex items-start gap-3">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            config.bgColor,
            config.borderColor,
            "border"
          )}
        >
          <Icon className={cn("w-5 h-5", config.iconColor)} />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-bold text-sm mb-1", config.color)}>
            {opponentName && (status === 'opponent_left' || status === 'not_started')
              ? config.title.replace('Соперник', opponentName)
              : config.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

