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
};

const boostGradients = {
  'fifty_fifty': 'from-blue-500 to-purple-500',
  'time_extend': 'from-orange-500 to-red-500',
  'hint': 'from-yellow-500 to-orange-500',
  'skip': 'from-green-500 to-emerald-500',
};

export function BoostCard({ boost, inventoryCount, coins, onPurchase, isPremium = false }: BoostCardProps) {
  const canAfford = coins >= boost.cost_coins;
  const Icon = boostIcons[boost.type as keyof typeof boostIcons] || Zap;
  const gradient = boostGradients[boost.type as keyof typeof boostGradients] || 'from-primary to-secondary';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Card className={`
        relative overflow-hidden p-5 h-full
        ${isPremium ? 'bg-gradient-to-br from-gold/10 via-yellow-500/5 to-gold/10 border-gold/30' : 'border-border/50'}
        hover:shadow-lg transition-all duration-300 group
      `}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className={`w-32 h-32 rounded-full blur-3xl bg-gradient-to-br ${gradient} absolute -top-10 -right-10`}></div>
        </div>

        {/* Header */}
        <div className="relative flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center shadow-lg
              bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform
            `}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-base leading-tight">{boost.name_ru}</h4>
              {inventoryCount > 0 && (
                <Badge variant="outline" className="mt-1 text-xs border-success/50 text-success">
                  В наличии: {inventoryCount}
                </Badge>
              )}
            </div>
          </div>
          {isPremium && (
            <Badge className="gradient-gold border-none text-xs shrink-0">
              Premium
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 min-h-[60px] relative">
          {boost.description_ru}
        </p>

        {/* Footer */}
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coins className={`w-5 h-5 ${canAfford ? 'text-gold' : 'text-muted-foreground'}`} />
            <span className={`font-bold text-lg ${canAfford ? 'text-foreground' : 'text-muted-foreground'}`}>
              {boost.cost_coins}
            </span>
          </div>
          
          <Button
            size="sm"
            onClick={onPurchase}
            disabled={!canAfford || isPremium}
            className={`
              ${isPremium ? 'bg-gold/20 hover:bg-gold/30 text-gold border-gold/50' : ''}
              ${canAfford && !isPremium ? 'shadow-md hover:shadow-lg' : ''}
              transition-all duration-300
            `}
            variant={isPremium ? 'outline' : 'default'}
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
                <Zap className="w-4 h-4 mr-2" />
                Купить
              </>
            )}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
