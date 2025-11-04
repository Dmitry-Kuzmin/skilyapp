import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, Lightbulb, FastForward, Languages, ChevronDown, Sparkles, Timer, HelpCircle, SkipForward, Globe } from 'lucide-react';
import { useState } from 'react';

interface BoostButtonProps {
  type: 'fifty_fifty' | 'time_extend' | 'hint' | 'skip' | 'translate';
  icon?: React.ReactNode;
  name: string;
  available: number;
  onUse: (type: string, language?: 'ru' | 'en') => void;
  disabled?: boolean;
}

const boostConfig = {
  fifty_fifty: {
    icon: Sparkles,
    gradient: 'from-yellow-400 via-orange-400 to-yellow-500',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    description: '50/50: Убирает 2 неправильных варианта',
  },
  time_extend: {
    icon: Timer,
    gradient: 'from-blue-400 via-cyan-400 to-blue-500',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    description: '+30 секунд: Добавляет время',
  },
  hint: {
    icon: HelpCircle,
    gradient: 'from-orange-400 via-amber-400 to-orange-500',
    glowColor: 'rgba(251, 146, 60, 0.4)',
    description: 'Подсказка: Показывает подсказку к вопросу',
  },
  skip: {
    icon: SkipForward,
    gradient: 'from-purple-400 via-pink-400 to-purple-500',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    description: 'Пропуск: Пропускает текущий вопрос',
  },
  translate: {
    icon: Globe,
    gradient: 'from-green-400 via-emerald-400 to-green-500',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    description: 'Перевод: Переводит вопрос на русский или английский',
  },
};

export function BoostButton({ type, icon, name, available, onUse, disabled }: BoostButtonProps) {
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);

  const handleClick = () => {
    if (!disabled && available > 0) {
      if (type === 'translate') {
        // Переключаем состояние развернутой кнопки
        setIsLanguageExpanded(!isLanguageExpanded);
      } else {
        onUse(type);
      }
    }
  };

  const handleLanguageSelect = (language: 'ru' | 'en') => {
    setIsLanguageExpanded(false);
    onUse(type, language);
  };

  const isDisabled = disabled || available === 0;
  const config = boostConfig[type as keyof typeof boostConfig] || boostConfig.fifty_fifty;
  const IconComponent = config.icon;

  // Для translate бустера показываем развернутую версию с выбором языка
  if (type === 'translate' && isLanguageExpanded && !isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ width: 'auto' }}
              animate={{ width: 'auto' }}
              className="relative flex items-center gap-1"
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
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative flex items-center gap-1"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => handleLanguageSelect('ru')}
                    variant="outline"
                    size="sm"
                    className={`relative h-9 px-3 flex items-center gap-1.5 border transition-all duration-300 bg-gradient-to-br from-red-500 to-red-600 text-white border-white/20 hover:border-white/50 shadow-md hover:shadow-lg`}
                  >
                    <span className="text-sm">🇷🇺</span>
                    <span className="text-xs font-bold">RU</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => handleLanguageSelect('en')}
                    variant="outline"
                    size="sm"
                    className={`relative h-9 px-3 flex items-center gap-1.5 border transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-white/20 hover:border-white/50 shadow-md hover:shadow-lg`}
                  >
                    <span className="text-sm">🇬🇧</span>
                    <span className="text-xs font-bold">EN</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => setIsLanguageExpanded(false)}
                    variant="outline"
                    size="sm"
                    className="relative h-9 w-9 p-0 flex items-center justify-center border transition-all duration-300 bg-muted/50 hover:bg-muted border-border"
                  >
                    <ChevronDown className="h-4 w-4 rotate-180" />
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent className="bg-card border-2">
            <p className="text-sm font-medium">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const buttonContent = (
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
        size="sm"
        className={`relative h-9 px-2.5 flex items-center gap-1.5 border transition-all duration-300 rounded-lg ${
          isDisabled 
            ? 'opacity-30 grayscale cursor-not-allowed' 
            : `bg-gradient-to-br ${config.gradient} text-white border-white/20 hover:border-white/50 shadow-md hover:shadow-lg hover:scale-105 active:scale-95`
        }`}
      >
        {icon ? (
          <span className="text-base flex items-center">{icon}</span>
        ) : (
          <IconComponent className="w-4 h-4" />
        )}
        <span className="text-xs font-bold">{name}</span>
        {type === 'translate' && !isDisabled && (
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isLanguageExpanded ? 'rotate-180' : ''}`} />
        )}
        {available > 0 && (
          <Badge 
            variant="default" 
            className="h-4 px-1.5 flex items-center justify-center bg-white/20 text-white border-white/30 text-[10px] font-bold ml-0.5 min-w-[18px]"
          >
            {available}
          </Badge>
        )}
      </Button>
    </motion.div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent className="bg-card border-2">
          <p className="text-sm font-medium">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
