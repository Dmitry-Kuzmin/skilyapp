import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Lock, Zap, Timer, Lightbulb, SkipForward, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  'translate': Globe,
};

const boostColors = {
  'fifty_fifty': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'time_extend': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'hint': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'skip': 'bg-green-500/10 text-green-600 border-green-500/20',
  'translate': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

export function BoostCard({ boost, inventoryCount, coins, onPurchase, isPremium = false }: BoostCardProps) {
  const canAfford = coins >= boost.cost_coins;
  const Icon = boostIcons[boost.type as keyof typeof boostIcons] || Zap;
  const colorClass = boostColors[boost.type as keyof typeof boostColors] || 'bg-primary/10 text-primary border-primary/20';
  const { t } = useLanguage();

  const getTranslatedValue = (field: 'name' | 'description', fallback: string) => {
    const key = `boostShop.boostNames.${boost.type}.${field}`;
    const value = t(key);
    return value === key ? fallback : value;
  };

  const displayName = getTranslatedValue('name', boost.name_ru);
  const displayDescription = getTranslatedValue('description', boost.description_ru);

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border transition-all
      ${isPremium ? 'bg-gold/5 border-gold/30' : 'bg-card border-border/50 hover:border-border'}
      hover:shadow-sm
    `}>
      {/* Icon */}
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
        ${isPremium ? 'bg-gold/20' : colorClass}
      `}>
        <Icon className={`w-5 h-5 ${isPremium ? 'text-gold' : ''}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-semibold text-sm truncate">{displayName}</h4>
          {/* Индикатор количества - всегда показываем, даже если 0, для консистентности */}
          <Badge 
            variant="outline" 
            className={`text-xs px-1.5 py-0 min-w-[20px] text-center ${
              inventoryCount > 0 
                ? 'border-success/50 text-success bg-success/10' 
                : 'border-muted-foreground/30 text-muted-foreground bg-muted/30'
            }`}
          >
            {inventoryCount}
          </Badge>
          {isPremium && (
            <Badge className="gradient-gold border-none text-xs px-1.5 py-0">
              {t('boostShop.sections.premiumBadge')}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{displayDescription}</p>
      </div>

      {/* Price & Buy Button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Coins className={`w-4 h-4 ${canAfford ? 'text-gold' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-semibold ${canAfford ? '' : 'text-muted-foreground'}`}>
            {boost.cost_coins}
          </span>
        </div>
        
        <Button
          size="sm"
          onClick={onPurchase}
          disabled={!canAfford || isPremium}
          className={`
            h-8 px-3 text-xs
            ${isPremium ? 'bg-gold/10 hover:bg-gold/20 text-gold border-gold/30' : ''}
            ${!canAfford && !isPremium ? 'opacity-50' : ''}
          `}
          variant={isPremium ? 'outline' : 'default'}
        >
          {isPremium ? (
            <>
              <Lock className="w-3 h-3 mr-1" />
              {t('boostShop.buttons.premium')}
            </>
          ) : !canAfford ? (
            t('boostShop.buttons.insufficient')
          ) : (
            t('boostShop.buttons.buy')
          )}
        </Button>
      </div>
    </div>
  );
}
