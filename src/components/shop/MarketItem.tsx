import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Download, Zap, Shield, Wand2, Lock, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

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
}

// Определяем категорию по типу буста
const getBoostCategory = (type: string): 'utility' | 'exploit' | 'defense' => {
  // Атака (exploit)
  if (['screen_injector', 'input_lag', 'spam_attack'].includes(type)) {
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

export function MarketItem({ boost, inventoryCount, coins, onPurchase, onInspect, category, isPurchasing = false }: MarketItemProps) {
  const { t } = useLanguage();
  const canAfford = coins >= boost.cost_coins;
  const boostCategory = category || getBoostCategory(boost.type);
  const CategoryIcon = categoryIcons[boostCategory];

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

  return (
    <motion.div
      onClick={() => {
        if (onInspect) {
          console.log('[MarketItem] Opening inspect sheet for:', boost.type);
          onInspect();
        }
      }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center gap-3",
        "p-3 sm:p-3 rounded-xl overflow-hidden",
        "bg-zinc-900 dark:bg-[#0f1014] border transition-all duration-300",
        "border-zinc-800 dark:border-zinc-800",
        theme.border,
        theme.hoverBorder,
        theme.hoverGlow,
        "hover:bg-zinc-800 dark:hover:bg-[#15161a]",
        onInspect && "cursor-pointer"
      )}
    >
      {/* Background Grid Pattern (еле заметный) */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none"
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
        "relative z-10 flex-shrink-0",
        "w-12 h-12 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center",
        "bg-black/50 dark:bg-black/50 border border-white/10 dark:border-white/5",
        theme.iconBg || "shadow-[inset_0_0_15px_rgba(0,0,0,0.3)]"
      )}>
        <span 
          className={cn("text-xl", theme.icon)}
          style={{
            filter: `drop-shadow(0 0 8px ${
              boostCategory === 'exploit' ? 'rgba(239, 68, 68, 0.6)' : 
              boostCategory === 'defense' ? 'rgba(6, 182, 212, 0.6)' : 
              'rgba(34, 197, 94, 0.6)'
            })`
          }}
        >
          {boost.icon}
        </span>
      </div>

      {/* Центральный контент: Название + Описание */}
      <div className="relative z-10 flex-1 min-w-0 text-left w-full sm:w-auto">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-zinc-100 dark:text-white font-bold text-sm sm:text-sm leading-tight break-words sm:truncate group-hover:text-white transition-colors">
            {displayName}
          </h3>
          <div className="px-1.5 py-0.5 rounded bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 text-[9px] font-mono text-zinc-400 dark:text-white/40 flex-shrink-0">
            v.{level}
          </div>
          {/* STOCK Badge (Индикатор запаса для расходников) - рядом с версией */}
          {inventoryCount > 0 && isConsumable && (
            <div className={cn(
              "px-2 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-1 flex-shrink-0",
              "bg-emerald-500/20 dark:bg-emerald-500/10 border-emerald-500/40 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
              "shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            )}>
              <span className="text-[8px] opacity-70">STOCK:</span>
              <span className="text-xs">{inventoryCount}</span>
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
          <p className="text-xs text-zinc-400 dark:text-white/60 line-clamp-2 sm:line-clamp-1 leading-relaxed break-words">
            {displayDescription}
          </p>
          {/* Градиент внизу текста, намекающий "читай дальше" */}
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-zinc-900 dark:from-[#0f1014] to-transparent pointer-events-none sm:hidden" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[9px] font-mono tracking-widest uppercase opacity-70 dark:opacity-60",
            theme.text
          )}>
            {boostCategory === 'exploit' ? 'ATK' : boostCategory === 'defense' ? 'DEF' : 'UTL'}
          </span>
          <div className="h-0.5 w-8 rounded-full bg-zinc-300/30 dark:bg-white/10 overflow-hidden">
            <div className={cn(
              "h-full w-2/3", theme.powerBar,
              "shadow-[0_0_6px_currentColor]"
            )}></div>
          </div>
        </div>
      </div>

      {/* Правая часть: Цена + Кнопка */}
      <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-zinc-800 dark:border-zinc-800 sm:border-0">
        <div className="font-mono text-yellow-500 dark:text-yellow-500 font-bold flex items-center gap-1 text-sm">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-500">{boost.cost_coins}</span>
        </div>
        
        {boost.is_premium ? (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
            "bg-gold/10 text-gold border border-gold/30",
            "text-[10px] font-bold tracking-wider"
          )}>
            <Lock className="w-3 h-3" />
            <span>LOCKED</span>
          </div>
        ) : !canAfford ? (
          <div className={cn(
            "px-2.5 py-1.5 rounded-lg",
            "bg-white/10 dark:bg-white/5 text-zinc-500 dark:text-white/40 border border-zinc-300 dark:border-white/10",
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
            onClick={(e) => {
              e.stopPropagation(); // Предотвращаем открытие модалки при клике на кнопку
              if (!isPurchasing) {
                onPurchase();
              }
            }}
            disabled={isPurchasing}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              "bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10",
              "border border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30",
              "transition-all active:scale-95",
              "text-[10px] font-bold tracking-wider text-zinc-900 dark:text-white",
              isPurchasing ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <span>{isPurchasing ? '...' : 'GET'}</span>
            {!isPurchasing && <Download size={12} className="text-zinc-700 dark:text-white/70" />}
          </button>
        )}
      </div>

      {/* Индикатор выбора (только для перманентных предметов, которые уже куплены) */}
      {inventoryCount > 0 && !isConsumable && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 z-20"
        >
          <div className="w-4 h-4 rounded-full bg-indigo-500 dark:bg-indigo-500 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.8)]">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

