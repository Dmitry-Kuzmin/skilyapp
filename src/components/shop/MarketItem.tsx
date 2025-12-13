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
  category?: 'utility' | 'exploit' | 'defense';
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

export function MarketItem({ boost, inventoryCount, coins, onPurchase, category }: MarketItemProps) {
  const { t } = useLanguage();
  const canAfford = coins >= boost.cost_coins;
  const boostCategory = category || getBoostCategory(boost.type);
  const CategoryIcon = categoryIcons[boostCategory];

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
    <motion.button
      onClick={onPurchase}
      disabled={!canAfford || boost.is_premium}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "group relative flex items-center gap-3",
        "p-3 rounded-xl overflow-hidden",
        "bg-[#0f1014] border transition-all duration-300",
        theme.border,
        theme.hoverBorder,
        theme.hoverGlow,
        "hover:bg-[#15161a]",
        (!canAfford || boost.is_premium) && "opacity-60 cursor-not-allowed"
      )}
    >
      {/* Background Grid Pattern (еле заметный) */}
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
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
      <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity z-10">
        <div className={cn(
          "w-2 h-2 border-t-2 border-r-2",
          boostCategory === 'exploit' && "border-red-500",
          boostCategory === 'defense' && "border-cyan-500",
          boostCategory === 'utility' && "border-emerald-500"
        )} />
      </div>

      {/* Иконка слева */}
      <div className={cn(
        "relative z-10 flex-shrink-0",
        "w-12 h-12 rounded-lg flex items-center justify-center",
        "bg-black/50 border border-white/5",
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
      <div className="relative z-10 flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-white font-bold text-sm leading-tight truncate group-hover:text-white transition-colors">
            {displayName}
          </h3>
          <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/40 flex-shrink-0">
            v.{level}
          </div>
          {inventoryCount > 0 && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1 py-0 min-w-[18px] text-center border-success/50 text-success bg-success/10 flex-shrink-0"
            >
              {inventoryCount}
            </Badge>
          )}
        </div>
        <p className="text-xs text-white/60 line-clamp-1 leading-relaxed">
          {displayDescription}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[9px] font-mono tracking-widest uppercase opacity-60",
            theme.text
          )}>
            {boostCategory === 'exploit' ? 'ATK' : boostCategory === 'defense' ? 'DEF' : 'UTL'}
          </span>
          <div className="h-0.5 w-8 rounded-full bg-white/10 overflow-hidden">
            <div className={cn(
              "h-full w-2/3", theme.powerBar,
              "shadow-[0_0_6px_currentColor]"
            )}></div>
          </div>
        </div>
      </div>

      {/* Правая часть: Цена + Кнопка */}
      <div className="relative z-10 flex items-center gap-2 flex-shrink-0">
        <div className="font-mono text-yellow-500 font-bold flex items-center gap-1 text-sm">
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
            "bg-white/5 text-white/40 border border-white/10",
            "text-[10px] font-bold tracking-wider"
          )}>
            INSUFFICIENT
          </div>
        ) : inventoryCount > 0 ? (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
            "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
            "text-[10px] font-bold tracking-wider"
          )}>
            <Check className="w-3 h-3" />
            <span>OWNED</span>
          </div>
        ) : (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
            "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30",
            "transition-all active:scale-95",
            "text-[10px] font-bold tracking-wider text-white"
          )}>
            <span>GET</span>
            <Download size={12} className="text-white/70" />
          </div>
        )}
      </div>

      {/* Индикатор выбора (если есть в инвентаре) */}
      {inventoryCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 z-20"
        >
          <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.8)]">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

