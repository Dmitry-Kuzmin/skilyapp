import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, Lightbulb, FastForward } from 'lucide-react';

interface BoostButtonProps {
  type: 'fifty_fifty' | 'time_extend' | 'hint' | 'skip';
  icon: string;
  name: string;
  available: number;
  onUse: (type: string) => void;
  disabled?: boolean;
}

const boostConfig = {
  fifty_fifty: {
    icon: Zap,
    gradient: 'from-yellow-400 via-orange-400 to-yellow-500',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    description: '50/50: Убирает 2 неправильных варианта',
  },
  time_extend: {
    icon: Clock,
    gradient: 'from-blue-400 via-cyan-400 to-blue-500',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    description: '+30 секунд: Добавляет время',
  },
  hint: {
    icon: Lightbulb,
    gradient: 'from-orange-400 via-amber-400 to-orange-500',
    glowColor: 'rgba(251, 146, 60, 0.4)',
    description: 'Подсказка: Показывает подсказку к вопросу',
  },
  skip: {
    icon: FastForward,
    gradient: 'from-purple-400 via-pink-400 to-purple-500',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    description: 'Пропуск: Пропускает текущий вопрос',
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
            whileHover={!isDisabled ? { scale: 1.1, rotate: 5 } : {}}
            whileTap={!isDisabled ? { scale: 0.9, rotate: -5 } : {}}
            className="relative"
          >
            {!isDisabled && (
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${config.gradient} blur-xl opacity-50 rounded-lg`}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
            <Button
              onClick={handleClick}
              disabled={isDisabled}
              variant="outline"
              size="lg"
              className={`relative h-20 w-20 flex-col gap-2 border-2 transition-all duration-300 ${
                isDisabled 
                  ? 'opacity-30 grayscale cursor-not-allowed' 
                  : `bg-gradient-to-br ${config.gradient} text-white border-white/20 hover:border-white/50 shadow-lg`
              }`}
            >
              <IconComponent className="w-8 h-8" />
              <span className="text-xs font-bold">{name}</span>
              {available > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-white text-primary font-bold shadow-lg border-2 border-primary"
                >
                  {available}
                </Badge>
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-card border-2">
          <p className="text-sm font-medium">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
