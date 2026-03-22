import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Download, Zap, Shield, Wand2, Lock, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { FloatingCost } from '@/components/ui/FloatingCost';

interface MarketItemProps {
  boost: {
    id: string;
    type: string;
    name_ru: string;
    description_ru: string;
    icon: string;
    cost_coins: number;
    is_premium: boolean;
  };
  inventoryCount: number;
  coins: number;
  onPurchase: () => void;
  onInspect?: () => void;
  category?: 'utility' | 'exploit' | 'defense';
  isPurchasing?: boolean; // Флаг загрузки покупки
  onPurchaseComplete?: () => void; // Callback после завершения покупки
}

// Определяем категорию по типу буста
const getBoostCategory = (type: string): 'utility' | 'exploit' | 'defense' => {
  // Атака (exploit)
  if (['screen_injector', 'input_lag', 'spam_attack', 'cryptolocker', 'ice_screen', 'sun_glare', 'rain_storm', 'bug_splat', 'fog_screen'].includes(type)) {
    return 'exploit';
  }
  // Защита (defense)
  if (['firewall', 'adas', 'shield'].includes(type)) {
    return 'defense';
  }
  // Утилиты (utility) - по умолчанию
  return 'utility';
};

// Иконки для категорий
const categoryIcons = {
  exploit: Zap,
  defense: Shield,
  utility: Wand2,
};

// ОПТИМИЗАЦИЯ: React.memo для предотвращения лишних ререндеров
export const MarketItem = memo(function MarketItem({ boost, inventoryCount, coins, onPurchase, onInspect, category, isPurchasing = false, onPurchaseComplete }: MarketItemProps) {
  const { t } = useLanguage();
  const canAfford = coins >= boost.cost_coins;
  const boostCategory = category || getBoostCategory(boost.type);
  const CategoryIcon = categoryIcons[boostCategory];

  // Состояния для анимаций
  const [buttonState, setButtonState] = useState<'idle' | 'processing' | 'acquired'>('idle');
  const [progress, setProgress] = useState(0);
  const [showFloatingCost, setShowFloatingCost] = useState(false);
  const [floatingCostPos, setFloatingCostPos] = useState({ x: 0, y: 0 });
  const [isGlitching, setIsGlitching] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previousPurchasingRef = useRef(isPurchasing);

  // Определяем, является ли товар расходником (consumable)
  // Все бусты (50/50, атаки, защита, утилиты) - расходники, их можно покупать многократно
  // Премиум и другие перманентные предметы - не расходники
  const isConsumable = !boost.is_premium; // Пока все не-премиум бусты считаем расходниками

  // Логика блокировки кнопки: Блокируем если это не расходник и он уже куплен, ИЛИ идет покупка
  const isButtonDisabled = (!isConsumable && inventoryCount > 0) || isPurchasing;

  // Цветовые схемы для категорий
  const theme = boostCategory === 'exploit'
    ? {
      border: 'border-red-500/30',
      bg: 'bg-red-500/5',
      icon: 'text-red-500',
      glow: 'shadow-red-500/20',
      hoverBorder: 'group-hover:border-red-500/50',
      hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]',
      powerBar: 'bg-red-500',
      text: 'group-hover:text-red-400',
    }
    : boostCategory === 'defense'
      ? {
        border: 'border-cyan-500/30',
        bg: 'bg-cyan-500/5',
        icon: 'text-cyan-400',
        glow: 'shadow-cyan-500/20',
        hoverBorder: 'group-hover:border-cyan-500/50',
        hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)]',
        powerBar: 'bg-cyan-500',
        text: 'group-hover:text-cyan-400',
      }
      : {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/5',
        icon: 'text-emerald-400',
        glow: 'shadow-emerald-500/20',
        hoverBorder: 'group-hover:border-emerald-500/50',
        hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)]',
        powerBar: 'bg-emerald-500',
        text: 'group-hover:text-emerald-400',
      };

  const getTranslatedValue = (field: 'name' | 'description', fallback: string) => {
    const key = `boostShop.boostNames.${boost.type}.${field}`;
    const value = t(key);
    return value === key ? fallback : value;
  };

  const displayName = getTranslatedValue('name', boost.name_ru);
  const displayDescription = getTranslatedValue('description', boost.description_ru);

  // Определяем "уровень" из inventoryCount (для визуализации)
  const level = inventoryCount > 0 ? Math.min(inventoryCount, 99) : 1;

  // Обработка изменения состояния покупки
  useEffect(() => {
    // Когда покупка начинается
    if (isPurchasing && !previousPurchasingRef.current) {
      setButtonState('processing');
      setProgress(0);

      // Получаем позицию кнопки для floating cost
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setFloatingCostPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
        setShowFloatingCost(true);
      }

      // Анимация прогресс-бара (600ms)
      const startTime = Date.now();
      const duration = 600;
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);

        if (newProgress >= 100) {
          clearInterval(interval);
        }
      }, 16); // ~60fps

      return () => clearInterval(interval);
    }

    // Когда покупка завершается
    if (!isPurchasing && previousPurchasingRef.current) {
      setButtonState('acquired');
      setIsGlitching(true);

      // Сбрасываем состояние через 1.5 секунды
      setTimeout(() => {
        setButtonState('idle');
        setIsGlitching(false);
        setProgress(0);
        if (onPurchaseComplete) {
          onPurchaseComplete();
        }
      }, 1500);
    }

    previousPurchasingRef.current = isPurchasing;
  }, [isPurchasing, onPurchaseComplete]);

  // Обработчик клика на кнопку
  const handlePurchaseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isPurchasing && canAfford) {
      onPurchase();
    }
  };


  return (
    <motion.div
      ref={cardRef}
      layoutId={`boost-card-${boost.id}`}
      onClick={() => {
        if (onInspect) {
          console.log('[MarketItem] Opening inspect sheet for:', boost.type);
          // Haptic feedback для тактильного ощущения
          try {
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
          } catch (e) {
            // Ignore haptic errors
          }
          onInspect();
        }
      }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      animate={isGlitching ? {
        x: [0, -2, 2, -2, 2, 0],
        scale: [1, 1.01, 0.99, 1.01, 0.99, 1]
      } : {}}
      transition={isGlitching ? {
        duration: 0.3,
        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        ease: 'easeInOut'
      } : {
        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      }}
      className={cn(
        "group relative flex items-center gap-2.5 sm:gap-4", // Всегда в ряд, на мобилках чуть плотнее
        "p-2 sm:p-3 rounded-xl overflow-hidden",           // Уменьшен padding
        "bg-white dark:bg-zinc-900 border transition-all duration-300",
        "border-zinc-200 dark:border-zinc-800",
        theme.border,
        theme.hoverBorder,
        theme.hoverGlow,
        "hover:bg-zinc-50 dark:hover:bg-zinc-800",
        onInspect && "cursor-pointer",
        isGlitching && "border-emerald-500 dark:border-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]"
      )}
    >
      {/* Background Grid Pattern (еле заметный) */}
      <div
        className="absolute inset-0 opacity-[0.01] dark:opacity-[0.02] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />

      {/* Scanline effect при hover */}
      <motion.div
        className={cn(
          "absolute inset-0 bg-gradient-to-r",
          boostCategory === 'exploit' && "from-red-500/0 via-red-500/5 to-red-500/0",
          boostCategory === 'defense' && "from-cyan-500/0 via-cyan-500/5 to-cyan-500/0",
          boostCategory === 'utility' && "from-emerald-500/0 via-emerald-500/5 to-emerald-500/0",
          "translate-x-[-100%] group-hover:translate-x-[100%]",
          "transition-transform duration-700 ease-in-out z-0"
        )}
      />

      {/* Tech corner (только правый верхний) */}
      <div className="absolute top-0 right-0 p-1 opacity-30 dark:opacity-20 group-hover:opacity-100 transition-opacity z-10">
        <div className={cn(
          "w-2 h-2 border-t-2 border-r-2",
          boostCategory === 'exploit' && "border-red-500 dark:border-red-500",
          boostCategory === 'defense' && "border-cyan-500 dark:border-cyan-500",
          boostCategory === 'utility' && "border-emerald-500 dark:border-emerald-500"
        )} />
      </div>

      {/* Иконка слева */}
      <div className={cn(
        "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0",
        "bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10",
        theme.iconBg || "shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_15px_rgba(0,0,0,0.3)]"
      )}>
        <span
          className={cn("text-lg sm:text-xl", theme.icon)}
          style={{
            filter: `drop-shadow(0 0 8px ${boostCategory === 'exploit' ? 'rgba(239, 68, 68, 0.6)' :
              boostCategory === 'defense' ? 'rgba(6, 182, 212, 0.6)' :
                'rgba(34, 197, 94, 0.6)'
              })`
          }}
        >
          {boost.icon}
        </span>
      </div>

      {/* Центральный контент: Название + Описание */}
      <div className="relative z-10 flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="text-zinc-900 dark:text-white font-bold text-[13px] sm:text-sm leading-none truncate">
            {displayName}
          </h3>
          {/* STOCK Badge */}
          {inventoryCount > 0 && isConsumable && (
            <div className={cn(
              "px-1 py-0 rounded border text-[8px] font-mono font-bold flex items-center shrink-0",
              "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            )}>
              <span>{inventoryCount}</span>
            </div>
          )}
          {/* Badge количества для перманентных (если нужно) */}
          {inventoryCount > 0 && !isConsumable && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 min-w-[18px] text-center border-emerald-500/50 dark:border-success/50 text-emerald-600 dark:text-success bg-emerald-500/20 dark:bg-success/10 flex-shrink-0"
            >
              {inventoryCount}
            </Badge>
          )}
        </div>
        <div className="relative">
          <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-slate-400 line-clamp-1 leading-tight">
            {displayDescription}
          </p>
        </div>
        {/* UTL/ATK/DEF bar - скрываем на маленьких экранах */}
        <div className="hidden sm:flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[9px] font-mono tracking-widest uppercase opacity-70 dark:opacity-60",
            theme.text
          )}>
            {boostCategory === 'exploit' ? 'ATK' : boostCategory === 'defense' ? 'DEF' : 'UTL'}
          </span>
          <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-white/10 overflow-hidden">
            <div className={cn(
              "h-full w-2/3 rounded-full", theme.powerBar,
              boostCategory === 'exploit' && "shadow-[0_0_10px_rgba(239,68,68,0.8)]",
              boostCategory === 'defense' && "shadow-[0_0_10px_rgba(6,182,212,0.8)]",
              boostCategory === 'utility' && "shadow-[0_0_10px_rgba(34,197,94,0.8)]"
            )}></div>
          </div>
        </div>
      </div >

      {/* Правая часть: Цена + Кнопка (фиксированный размер) */}
      <div className="relative z-10 flex items-center gap-3 shrink-0 ml-auto">
        <div className="font-mono text-amber-600 dark:text-yellow-500 font-bold flex items-center gap-1 text-[12px] sm:text-sm">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-yellow-500" />
          <span>{boost.cost_coins}</span>
        </div>

        {
          boost.is_premium ? (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
              "bg-gold/10 text-amber-600 dark:text-gold border border-gold/30",
              "text-[10px] font-bold tracking-wider"
            )}>
              <Lock className="w-3 h-3" />
              <span>LOCKED</span>
            </div>
          ) : !canAfford ? (
            <div className={cn(
              "px-2.5 py-1.5 rounded-lg",
              "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 border border-zinc-300 dark:border-white/10",
              "text-[10px] font-bold tracking-wider"
            )}>
              INSUFFICIENT
            </div>
          ) : isButtonDisabled ? (
            // Перманентный предмет уже куплен
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
              "bg-gray-500/20 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-400/40 dark:border-gray-500/30",
              "text-[10px] font-bold tracking-wider cursor-not-allowed"
            )}>
              <Check className="w-3 h-3" />
              <span>OWNED</span>
            </div>
          ) : (
            // Расходник или еще не купленный перманентный - можно покупать
            <button
              ref={buttonRef}
              onClick={handlePurchaseClick}
              disabled={isPurchasing || buttonState === 'processing'}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg overflow-hidden",
                "bg-zinc-900 dark:bg-white/5 hover:bg-zinc-800 dark:hover:bg-white/10",
                "border border-zinc-800 dark:border-white/10 hover:border-zinc-700 dark:hover:border-white/20",
                "transition-all active:scale-95",
                "text-[10px] font-bold tracking-wider text-white",
                "hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.15)]",
                (isPurchasing || buttonState === 'processing') ? "cursor-not-allowed" : "cursor-pointer",
                buttonState === 'acquired' && "bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              )}
            >
              {/* Прогресс-бар overlay с цветом категории */}
              {buttonState === 'processing' && (
                <motion.div
                  className={cn(
                    "absolute inset-0",
                    boostCategory === 'exploit' ? "bg-red-500/40" :
                      boostCategory === 'defense' ? "bg-cyan-500/40" : "bg-emerald-500/40"
                  )}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              )}

              {/* Контент кнопки */}
              <span className="relative z-10 flex items-center gap-1.5">
                {buttonState === 'processing' ? (
                  <>
                    <span className="hidden sm:inline font-mono text-[10px] tracking-tighter animate-pulse">DECRYPTING...</span>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap size={10} className={cn(
                        boostCategory === 'exploit' ? "text-red-400" :
                          boostCategory === 'defense' ? "text-cyan-400" : "text-emerald-400"
                      )} />
                    </motion.div>
                  </>
                ) : buttonState === 'acquired' ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="hidden sm:inline text-emerald-400 font-mono tracking-wide">SECURED</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline font-mono tracking-widest font-bold">ACCESS</span>
                    <Download size={12} className="opacity-70 group-hover:translate-y-0.5 transition-transform" />
                  </>
                )}
              </span>
            </button>
          )
        }
      </div >

      {/* Индикатор выбора (только для перманентных предметов, которые уже куплены) */}
      {
        inventoryCount > 0 && !isConsumable && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1.5 right-1.5 z-20"
          >
            <div className="w-4 h-4 rounded-full bg-indigo-500 dark:bg-indigo-500 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.8)]">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          </motion.div>
        )
      }

      {/* Floating Cost */}
      <AnimatePresence>
        {showFloatingCost && (
          <FloatingCost
            cost={boost.cost_coins}
            x={floatingCostPos.x}
            y={floatingCostPos.y}
            onComplete={() => setShowFloatingCost(false)}
          />
        )}
      </AnimatePresence>
    </motion.div >
  );
}, (prevProps, nextProps) => {
  // ОПТИМИЗАЦИЯ: Кастомная функция сравнения для предотвращения лишних ререндеров
  return (
    prevProps.boost.id === nextProps.boost.id &&
    prevProps.inventoryCount === nextProps.inventoryCount &&
    prevProps.coins === nextProps.coins &&
    prevProps.category === nextProps.category &&
    prevProps.isPurchasing === nextProps.isPurchasing &&
    prevProps.onPurchase === nextProps.onPurchase &&
    prevProps.onInspect === nextProps.onInspect
  );
});

