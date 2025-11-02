import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Lock, Zap, Timer, Lightbulb, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';

interface Boost {
  type: string;
  name_ru: string;
  description_ru: string;
  icon: string;
  cost_coins: number;
  is_premium: boolean;
}

interface BoostCardProps {
  boost: Boost;
  inventoryCount: number;
  coins: number;
  onPurchase: () => void;
  isPremium?: boolean;
}

const boostIcons = {
  'fifty_fifty': Zap,
  'time_extend': Timer,
  'hint': Lightbulb,
  'skip': SkipForward,
  'translate': Lightbulb,
};

const boostGradients = {
  'fifty_fifty': 'from-amber-500 via-yellow-500 to-amber-600',
  'time_extend': 'from-cyan-500 via-blue-500 to-cyan-600',
  'hint': 'from-orange-500 via-red-500 to-orange-600',
  'skip': 'from-violet-500 via-purple-500 to-violet-600',
  'translate': 'from-emerald-500 via-green-500 to-emerald-600',
};

export function BoostCard({ boost, inventoryCount, coins, onPurchase, isPremium = false }: BoostCardProps) {
  const canAfford = coins >= boost.cost_coins;
  const Icon = boostIcons[boost.type as keyof typeof boostIcons] || Zap;
  const gradient = boostGradients[boost.type as keyof typeof boostGradients] || 'from-primary to-secondary';

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Card className={`
        relative overflow-hidden p-6 h-full
        ${isPremium ? 'bg-gradient-to-br from-gold/10 via-yellow-500/5 to-gold/10 border-gold/30' : 'bg-gradient-to-br from-card/80 to-card border-border/50'}
        hover:shadow-2xl hover:border-primary/30 transition-all duration-300 group backdrop-blur-sm
      `}>
        {/* Background Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-5 blur-3xl`}></div>
        </div>

        {/* Accent Corner */}
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 blur-2xl rounded-full -mr-12 -mt-12`}></div>

        {/* Header */}
        <div className="relative flex items-start justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <div className={`
              w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl
              bg-gradient-to-br ${gradient} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300
              relative
            `}>
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} blur-lg opacity-50`}></div>
              <Icon className="w-7 h-7 text-white relative z-10" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg leading-tight mb-1.5 group-hover:text-primary transition-colors">
                {boost.name_ru}
              </h4>
              {inventoryCount > 0 && (
                <Badge variant="outline" className="text-xs border-success/60 text-success bg-success/10 font-semibold">
                  В наличии: {inventoryCount}
                </Badge>
              )}
            </div>
          </div>
          {isPremium && (
            <Badge className="gradient-gold border-none text-xs shrink-0 shadow-lg">
              Premium
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground/90 mb-5 min-h-[60px] relative leading-relaxed">
          {boost.description_ru}
        </p>

        {/* Footer */}
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-br from-gold/10 to-amber-500/10 border border-gold/20">
            <Coins className={`w-5 h-5 ${canAfford ? 'text-gold' : 'text-muted-foreground/60'}`} />
            <span className={`font-bold text-xl ${canAfford ? 'text-gold' : 'text-muted-foreground/60'}`}>
              {boost.cost_coins}
            </span>
          </div>
          
          <Button
            size="default"
            onClick={onPurchase}
            disabled={!canAfford || isPremium}
            className={`
              font-semibold px-6 h-10 rounded-xl
              ${isPremium ? 'bg-gold/20 hover:bg-gold/30 text-gold border-gold/50' : ''}
              ${canAfford && !isPremium ? `bg-gradient-to-r ${gradient} hover:shadow-2xl border-0 text-white` : ''}
              transition-all duration-300 group/button
            `}
            variant={isPremium ? 'outline' : canAfford ? 'default' : 'outline'}
          >
            {isPremium ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Premium
              </>
            ) : !canAfford ? (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Недостаточно
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2 group-hover/button:rotate-12 transition-transform" />
                Купить
              </>
            )}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
