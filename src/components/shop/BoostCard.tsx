import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Lock, Zap, Timer, Lightbulb, SkipForward, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

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
    <div
      className={cn(
        "h-full min-w-0 rounded-xl border p-3 transition-all duration-200",
        "flex flex-col gap-3",
        "hover:-translate-y-0.5 hover:shadow-md",
        isPremium
          ? "bg-gold/5 border-gold/30 shadow-[0_8px_24px_-18px_rgba(250,204,21,0.45)]"
          : "bg-card border-border/50 hover:border-border",
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border",
            isPremium ? "bg-gold/20 border-gold/30" : colorClass,
          )}
        >
          <Icon className={cn("w-5 h-5", isPremium && "text-gold")} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-1.5 mb-1.5">
            <h4 className="min-w-0 flex-1 text-sm font-semibold leading-tight line-clamp-2">
              {displayName}
            </h4>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] px-1.5 py-0 min-w-[22px] justify-center shrink-0",
                inventoryCount > 0
                  ? "border-success/50 text-success bg-success/10"
                  : "border-muted-foreground/30 text-muted-foreground bg-muted/30",
              )}
            >
              {inventoryCount}
            </Badge>
            {isPremium && (
              <Badge className="gradient-gold border-none text-[10px] px-1.5 py-0 shrink-0">
                {t('boostShop.sections.premiumBadge')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {displayDescription}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 pt-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Coins className={cn("w-4 h-4 shrink-0", canAfford ? 'text-gold' : 'text-muted-foreground')} />
          <span className={cn("text-sm font-semibold", !canAfford && 'text-muted-foreground')}>
            {boost.cost_coins}
          </span>
        </div>

        <Button
          size="sm"
          onClick={onPurchase}
          disabled={!canAfford || isPremium}
          className={cn(
            "h-9 min-w-[88px] px-3 text-xs font-semibold shrink-0",
            isPremium && "bg-gold/10 hover:bg-gold/20 text-gold border-gold/30",
            !canAfford && !isPremium && "opacity-50",
          )}
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
