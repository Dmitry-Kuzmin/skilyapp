import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Trophy, Sparkles } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCoins } from '@/hooks/useCoins';
import { useModal } from '@/hooks/useModal';
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
  const { openModal: openBoostShop } = useModal('BOOST_SHOP');
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


  const getDuelPassButtonClasses = (extra: string) =>
    cn(
      "rounded-xl border transition-all duration-200",
      extra,
      hasClaimableReward
        ? "bg-gradient-to-r from-amber-50/95 to-orange-50/85 text-foreground shadow-[0_8px_25px_rgba(251,191,36,0.35)] border-amber-200/80 dark:from-[#40320a] dark:via-[#2a1f08] dark:to-[#1f1606] dark:text-white dark:border-amber-400/40"
        : "bg-muted/30 hover:bg-muted/50 border-transparent dark:bg-slate-800/60 dark:hover:bg-slate-700/60"
    );

  const RewardBubble = ({ variant }: { variant: "mobile" | "desktop" }) => (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg ring-1 ring-amber-100/40",
        variant === "mobile" ? "-top-2.5 -right-2" : "-top-2.5 -right-3"
      )}
    >
      <span className="absolute inset-0 rounded-full bg-white/50 opacity-60 animate-ping" />
      <Sparkles className="relative w-3 h-3 text-white" />
    </span>
  );

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
              openBoostShop();
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
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.35)] animate-pulse" />
                <RewardBubble variant="mobile" />
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
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-amber-300/70 shadow-[0_0_22px_rgba(251,191,36,0.35)] animate-pulse" />
                <RewardBubble variant="desktop" />
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

      <DuelPassSeasonModal open={duelPassModalOpen} onOpenChange={setDuelPassModalOpen} />
    </>
  );
}

