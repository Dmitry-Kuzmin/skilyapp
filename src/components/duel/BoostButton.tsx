import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, Lightbulb, FastForward } from 'lucide-react';

interface BoostButtonProps {
  type: 'fifty_fifty' | 'time_extend' | 'hint' | 'skip' | 'translate';
  icon: string;
  name: string;
  available: number;
  onUse: (type: string) => void;
  disabled?: boolean;
}

const boostConfig = {
  fifty_fifty: {
    icon: Zap,
    gradient: 'from-amber-400 via-yellow-400 to-amber-500',
    glowColor: 'rgba(251, 191, 36, 0.5)',
    description: '50/50: Убирает 2 неправильных варианта',
    shadow: 'shadow-amber-500/30',
  },
  time_extend: {
    icon: Clock,
    gradient: 'from-cyan-400 via-blue-400 to-cyan-500',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    description: '+30 секунд: Добавляет время',
    shadow: 'shadow-blue-500/30',
  },
  hint: {
    icon: Lightbulb,
    gradient: 'from-orange-400 via-red-400 to-orange-500',
    glowColor: 'rgba(251, 146, 60, 0.5)',
    description: 'Подсказка: Показывает подсказку к вопросу',
    shadow: 'shadow-orange-500/30',
  },
  skip: {
    icon: FastForward,
    gradient: 'from-violet-400 via-purple-400 to-violet-500',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    description: 'Пропуск: Пропускает текущий вопрос',
    shadow: 'shadow-purple-500/30',
  },
  translate: {
    icon: Lightbulb,
    gradient: 'from-emerald-400 via-green-400 to-emerald-500',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    description: 'Перевод: Переводит вопрос на русский',
    shadow: 'shadow-emerald-500/30',
  },
};

export function BoostButton({ type, icon, name, available, onUse, disabled }: BoostButtonProps) {
  const handleClick = () => {
    if (!disabled && available > 0) {
      onUse(type);
    }
  };

  const isDisabled = disabled || available === 0;
  const config = boostConfig[type as keyof typeof boostConfig] || boostConfig.fifty_fifty;
  const IconComponent = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={!isDisabled ? { scale: 1.05 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            className="relative"
          >
            {!isDisabled && (
              <motion.div
                className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} blur-md opacity-70 rounded-xl`}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [0.98, 1.02, 0.98],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
            <Button
              onClick={handleClick}
              disabled={isDisabled}
              variant="outline"
              size="sm"
              className={`relative h-11 px-4 flex items-center gap-2 border-2 transition-all duration-300 rounded-xl ${
                isDisabled 
                  ? 'opacity-40 grayscale cursor-not-allowed bg-muted/50 border-muted' 
                  : `bg-gradient-to-br ${config.gradient} text-white border-white/30 hover:border-white/60 shadow-lg ${config.shadow} hover:shadow-xl hover:${config.shadow}`
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {available > 0 && (
                <Badge 
                  variant="default" 
                  className="h-5 min-w-5 px-1.5 flex items-center justify-center bg-white/25 backdrop-blur-sm text-white border-white/40 text-xs font-bold rounded-full"
                >
                  {available}
                </Badge>
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-card/95 backdrop-blur-sm border-2 shadow-xl">
          <p className="text-sm font-medium">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
