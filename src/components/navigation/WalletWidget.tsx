import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Trophy } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCoins } from '@/hooks/useCoins';
import { BoostShopModal } from '@/components/shop/BoostShopModal';
import { DuelPassSeasonModal } from '@/components/monetization/DuelPassSeasonModal';
import { cn } from '@/lib/utils';
import { useDuelPassData } from '@/hooks/useDuelPassData';

interface WalletWidgetProps {
  className?: string;
}

export function WalletWidget({ className }: WalletWidgetProps) {
  const { profileId } = useUserContext();
  const { balance, loading: coinsLoading } = useCoins();
  const { t } = useLanguage();
  const [shopOpen, setShopOpen] = useState(false);
  const [duelPassModalOpen, setDuelPassModalOpen] = useState(false);
  const { duelPassData, isPending: duelPassPending } = useDuelPassData(profileId);

  const showCoinsSkeleton = coinsLoading;
  const showDuelPassSkeleton = duelPassPending;

  return (
    <>
      <div className={cn("flex items-center gap-1.5 md:gap-2", className)}>
        {/* Coins Skeleton/Content */}
        {showCoinsSkeleton ? (
          <Skeleton className="h-8 w-20 rounded-lg" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShopOpen(true);
            }}
            className="h-8 px-1.5 md:px-2 gap-1 md:gap-1.5 hover:bg-muted/50"
          >
            <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />
            <span className="text-xs md:text-sm font-semibold">{balance}</span>
          </Button>
        )}

        {/* Duel Pass Skeleton/Content - улучшенная версия для мобильных с прогресс-баром и SP */}
        {/* ИСПРАВЛЕНИЕ: Показываем skeleton только если еще загружается, иначе показываем контент или ничего */}
        {showDuelPassSkeleton ? (
          <>
            <Skeleton className="h-8 w-24 rounded-lg sm:hidden" />
            <Skeleton className="h-8 w-32 rounded-lg hidden sm:block" />
          </>
        ) : duelPassData ? (
          <button
            onClick={() => {
              setDuelPassModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer sm:hidden"
            title={t('wallet.duelPassTooltipMobile', { level: duelPassData.level, xp: duelPassData.xp })}
          >
            {/* Season Points */}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-blue-400">S</span>
              </div>
              <span className="text-xs font-semibold text-foreground">{duelPassData.xp}</span>
            </div>
            
            {/* Разделитель */}
            <div className="w-px h-4 bg-border" />
            
            {/* Уровень с прогресс-баром */}
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                  style={{ width: `${Math.max(5, duelPassData.progress)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground min-w-[18px]">{duelPassData.level}</span>
            </div>
          </button>
        ) : null}
        {!showDuelPassSkeleton && duelPassData && (
          <button
            onClick={() => {
              setDuelPassModalOpen(true);
            }}
            className="hidden sm:flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            title={t('wallet.duelPassTooltipDesktop', { level: duelPassData.level })}
          >
            <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-500" />
            <div className="w-10 md:w-12 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                style={{ width: `${duelPassData.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{duelPassData.level}</span>
          </button>
        )}


      </div>

      <BoostShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <DuelPassSeasonModal open={duelPassModalOpen} onOpenChange={setDuelPassModalOpen} />
    </>
  );
}

