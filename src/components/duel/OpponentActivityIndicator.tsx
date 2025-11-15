import { motion } from 'framer-motion';
import { Wifi, WifiOff, Brain, Zap, RefreshCw, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityStatus = 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline';

interface OpponentActivityIndicatorProps {
  status: ActivityStatus;
  className?: string;
  showTooltip?: boolean;
}

const statusConfig = {
  online: {
    icon: Circle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/40',
    pulse: true,
    tooltip: 'Соперник онлайн'
  },
  thinking: {
    icon: Brain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    pulse: true,
    tooltip: 'Соперник думает...'
  },
  answering: {
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/40',
    pulse: false,
    tooltip: 'Соперник отвечает!'
  },
  reconnecting: {
    icon: RefreshCw,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    pulse: false,
    tooltip: 'Соперник переподключается...'
  },
  offline: {
    icon: WifiOff,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    pulse: false,
    tooltip: 'Соперник офлайн'
  }
};

export function OpponentActivityIndicator({ 
  status, 
  className,
  showTooltip = true 
}: OpponentActivityIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn(
        "relative flex items-center justify-center",
        className
      )}
      title={showTooltip ? config.tooltip : undefined}
    >
      <motion.div
        className={cn(
          "w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center border-2 shadow-sm",
          config.bgColor,
          config.borderColor,
          config.color
        )}
        animate={config.pulse ? {
          scale: [1, 1.1, 1],
          opacity: [1, 0.8, 1]
        } : {}}
        transition={config.pulse ? {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      >
        {status === 'reconnecting' ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </motion.div>
        ) : (
          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
        )}
      </motion.div>
      
      {/* Pulse ring для онлайн статуса */}
      {status === 'online' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-green-500/40"
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.8, 0, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
    </motion.div>
  );
}

