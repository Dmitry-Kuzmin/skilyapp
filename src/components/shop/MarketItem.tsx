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
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "group relative flex flex-col",
        "p-3 rounded-xl border transition-all duration-200",
        "bg-zinc-900/50 border-white/5 hover:border-white/10",
        "hover:bg-zinc-800/50",
        !canAfford && "opacity-50 cursor-not-allowed",
        boost.is_premium && "border-amber-500/20 bg-amber-500/5"
      )}
    >
      {/* Noise texture (subtle) */}
      <div 
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none rounded-xl"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />

      {/* Header: Icon + Badge */}
      <div className="flex items-start justify-between mb-2 relative z-10">
        <div className={cn(
          "p-2 rounded-lg border",
          boostCategory === 'exploit' && "bg-red-500/10 border-red-500/20",
          boostCategory === 'defense' && "bg-cyan-500/10 border-cyan-500/20",
          boostCategory === 'utility' && "bg-emerald-500/10 border-emerald-500/20"
        )}>
          <span className="text-lg">
            {boost.icon}
          </span>
        </div>
        {inventoryCount > 0 && (
          <Badge 
            variant="outline" 
            className="text-xs px-1.5 py-0 min-w-[18px] text-center border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          >
            {inventoryCount}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 mb-3 relative z-10 text-left">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            boostCategory === 'exploit' && "text-red-400",
            boostCategory === 'defense' && "text-cyan-400",
            boostCategory === 'utility' && "text-emerald-400"
          )}>
            {boostCategory === 'exploit' ? 'ATK' : boostCategory === 'defense' ? 'DEF' : 'UTL'}
          </span>
        </div>
        
        <h3 className="text-sm font-semibold text-white mb-1 leading-tight">
          {displayName}
        </h3>
        
        <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">
          {displayDescription}
        </p>
      </div>

      {/* Footer: Price + Action */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 relative z-10">
        <div className="flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-400">{boost.cost_coins}</span>
        </div>
        
        {boost.is_premium ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-400">LOCKED</span>
          </div>
        ) : !canAfford ? (
          <span className="text-[10px] font-medium text-zinc-500">Недостаточно</span>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <Download className="w-3 h-3 text-zinc-300" />
            <span className="text-[10px] font-semibold text-zinc-300">GET</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

