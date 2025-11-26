import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, Coins, Trophy, Sparkles } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCoins } from '@/hooks/useCoins';
import { BoostShopModal } from '@/components/shop/BoostShopModal';
import { DuelPassSeasonModal } from '@/components/monetization/DuelPassSeasonModal';
import { cn } from '@/lib/utils';
import { useDuelPassData } from '@/hooks/useDuelPassData';
import { usePremium } from '@/hooks/usePremium';

interface WalletWidgetProps {
  className?: string;
}

export function WalletWidget({ className }: WalletWidgetProps) {
  const { profileId } = useUserContext();
  const { balance, loading: coinsLoading } = useCoins();
  const { t } = useLanguage();
  const { isPremium } = usePremium();
  const [shopOpen, setShopOpen] = useState(false);
  const [duelPassModalOpen, setDuelPassModalOpen] = useState(false);
  const { duelPassData, isPending: duelPassPending } = useDuelPassData(profileId);

  const showCoinsSkeleton = coinsLoading;
  const showDuelPassSkeleton = duelPassPending;
  const hasClaimableReward = Boolean(
    duelPassData &&
      (duelPassData.hasUnlockedFreeReward ||
        (isPremium && duelPassData.hasUnlockedPremiumReward))
  );
  const duelPassRewardLabel = hasClaimableReward ? t('wallet.duelPassRewardReady') : null;
  const duelPassRewardCTA = hasClaimableReward ? t('wallet.duelPassRewardCTA') : null;

  const duelPassTooltipMobile = duelPassData
    ? [
        t('wallet.duelPassTooltipMobile', { level: duelPassData.level, xp: duelPassData.xp }),
        duelPassRewardLabel,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  const duelPassTooltipDesktop = duelPassData
    ? [
        t('wallet.duelPassTooltipDesktop', { level: duelPassData.level }),
        duelPassRewardLabel,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  // КРИТИЧНО: Логирование для диагностики открытия модального окна
  useEffect(() => {
    if (shopOpen) {
      console.log('[WalletWidget] Shop modal opened, shopOpen:', shopOpen);
    }
  }, [shopOpen]);

  const getDuelPassButtonClasses = (extra: string) =>
    cn(
      "rounded-xl border transition-all duration-200",
      extra,
      hasClaimableReward
        ? "bg-gradient-to-r from-amber-50/95 to-orange-50/80 text-foreground shadow-[0_8px_20px_rgba(251,191,36,0.25)] border-amber-200/70 dark:from-amber-500/20 dark:to-orange-500/15 dark:text-white dark:border-amber-400/50"
        : "bg-muted/30 hover:bg-muted/50 border-transparent dark:bg-slate-800/60 dark:hover:bg-slate-700/60"
    );

  const ClaimIndicator = ({ position }: { position: "mobile" | "desktop" }) => {
    if (!duelPassRewardCTA) return null;
    return (
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-semibold uppercase tracking-[0.08em] text-white shadow-lg ring-1 ring-amber-200/40 backdrop-blur",
          position === "mobile"
            ? "-top-3 right-2 px-2 py-0.5"
            : "-top-3 right-3 px-2.5 py-0.5"
        )}
      >
        <ArrowUpRight className="w-3 h-3" />
        {duelPassRewardCTA}
      </span>
    );
  };

  return (
    <>
      <div 
        className={cn("flex items-center gap-1.5 md:gap-2", className)}
        style={{
          pointerEvents: 'auto',
          position: 'relative',
          zIndex: 50 // КРИТИЧНО: Высокий z-index чтобы быть выше других элементов
        }}
      >
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
              console.log('[WalletWidget] Shop button clicked, opening modal, current shopOpen:', shopOpen);
              // КРИТИЧНО: Используем функциональное обновление для гарантии
              setShopOpen((prev) => {
                console.log('[WalletWidget] Setting shopOpen from', prev, 'to', true);
                return true;
              });
            }}
            onTouchStart={(e) => {
              // КРИТИЧНО: Обработка touch для мгновенной реакции на мобильных
              e.stopPropagation();
            }}
            className="h-8 px-1.5 md:px-2 gap-1 md:gap-1.5 hover:bg-muted/50"
            style={{
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
              zIndex: 51 // КРИТИЧНО: Выше контейнера
            }}
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
          <div className="relative sm:hidden">
            {hasClaimableReward && (
              <>
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.3)] animate-pulse" />
                <ClaimIndicator position="mobile" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 p-1 shadow-lg"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300/40 to-orange-400/40 animate-ping" />
                  <Sparkles className="relative w-3 h-3 text-white" />
                </span>
              </>
            )}
            <button
              onClick={() => {
                setDuelPassModalOpen(true);
              }}
              className={getDuelPassButtonClasses("flex items-center gap-1.5 px-2 py-1 w-full")}
              title={duelPassTooltipMobile}
              aria-label={duelPassTooltipMobile}
            >
              {/* Season Points */}
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-blue-400">S</span>
                </div>
                <span className="text-xs font-semibold text-foreground dark:text-white">{duelPassData.xp}</span>
              </div>
              
              {/* Разделитель */}
              <div className="w-px h-4 bg-border/70 dark:bg-white/20" />
              
              {/* Уровень с прогресс-баром */}
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                <div className="w-12 h-1 bg-muted rounded-full overflow-hidden dark:bg-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                    style={{ width: `${Math.max(5, duelPassData.progress)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground dark:text-white min-w-[18px]">{duelPassData.level}</span>
              </div>
            </button>
          </div>
        ) : null}
        {!showDuelPassSkeleton && duelPassData && (
          <div className="relative hidden sm:block">
            {hasClaimableReward && (
              <>
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-amber-300/70 shadow-[0_0_22px_rgba(251,191,36,0.3)] animate-pulse" />
                <ClaimIndicator position="desktop" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 shadow-lg"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300/40 to-orange-400/40 animate-ping" />
                  <Sparkles className="relative w-3 h-3 text-white" />
                </span>
              </>
            )}
            <button
              onClick={() => {
                setDuelPassModalOpen(true);
              }}
              className={getDuelPassButtonClasses("hidden sm:flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1")}
              title={duelPassTooltipDesktop}
              aria-label={duelPassTooltipDesktop}
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
          </div>
        )}


      </div>

      <BoostShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <DuelPassSeasonModal open={duelPassModalOpen} onOpenChange={setDuelPassModalOpen} />
    </>
  );
}

