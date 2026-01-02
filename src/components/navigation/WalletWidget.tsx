import { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
import { useProfileData } from '@/hooks/useProfileData';

interface WalletWidgetProps {
  className?: string;
}

export const WalletWidget = memo(function WalletWidget({ className }: WalletWidgetProps) {
  const { profileId } = useUserContext();
  const { balance, loading: coinsLoading } = useCoins();
  const { t } = useLanguage();
  const { isPremium } = usePremium();
  const { openModal: openBoostShop } = useModal('BOOST_SHOP');
  const [duelPassModalOpen, setDuelPassModalOpen] = useState(false);
  const { duelPassData, isPending: duelPassPending } = useDuelPassData(profileId);

  // ОПТИМИЗАЦИЯ: Мемоизируем вычисления для предотвращения лишних ре-рендеров
  const showCoinsSkeleton = coinsLoading;
  const showDuelPassSkeleton = duelPassPending;
  const { xp, streakDays, loading: profileLoading } = useProfileData();

  const hasClaimableReward = useMemo(() => Boolean(
    duelPassData &&
    (duelPassData.hasUnlockedFreeReward ||
      (isPremium && duelPassData.hasUnlockedPremiumReward))
  ), [duelPassData, isPremium]);
  const duelPassRewardLabel = useMemo(() => hasClaimableReward ? t('wallet.duelPassRewardReady') : null, [hasClaimableReward, t]);

  const duelPassTooltipMobile = useMemo(() => duelPassData
    ? [
      t('wallet.duelPassTooltipMobile', { level: duelPassData.level, xp: duelPassData.xp }),
      duelPassRewardLabel,
    ]
      .filter(Boolean)
      .join(' · ')
    : undefined, [duelPassData, duelPassRewardLabel, t]);

  const duelPassTooltipDesktop = useMemo(() => duelPassData
    ? [
      t('wallet.duelPassTooltipDesktop', { level: duelPassData.level }),
      duelPassRewardLabel,
    ]
      .filter(Boolean)
      .join(' · ')
    : undefined, [duelPassData, duelPassRewardLabel, t]);

  // ОПТИМИЗАЦИЯ: Мемоизируем функцию для предотвращения лишних ре-рендеров
  const getDuelPassButtonClasses = useCallback((extra: string) =>
    cn(
      "rounded-xl border transition-all duration-200",
      extra,
      hasClaimableReward
        ? "bg-gradient-to-r from-amber-50/95 to-orange-50/85 text-foreground shadow-[0_8px_25px_rgba(251,191,36,0.35)] border-amber-200/80 dark:from-[#40320a] dark:via-[#2a1f08] dark:to-[#1f1606] dark:text-white dark:border-amber-400/40"
        : "bg-muted/30 hover:bg-muted/50 border-transparent dark:bg-slate-800/60 dark:hover:bg-slate-700/60"
    ), [hasClaimableReward]);

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчики для предотвращения лишних ре-рендеров
  const handleDuelPassClick = useCallback(() => {
    setDuelPassModalOpen(true);
  }, []);

  const handleCoinsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    openBoostShop();
  }, [openBoostShop]);

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
        className={cn("flex items-center gap-1 md:gap-1.5", className)}
        style={{
          pointerEvents: 'auto',
          position: 'relative',
          zIndex: 50 // КРИТИЧНО: Высокий z-index чтобы быть выше других элементов
        }}
      >
        {/* Streak Badge */}
        {!profileLoading && streakDays > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full border border-orange-500/20 cursor-help transition hover:bg-orange-500/20 shrink-0">
            <span className="text-[10px] sm:text-xs">🔥</span>
            <span className="text-[10px] sm:text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              {streakDays}
            </span>
          </div>
        )}

        {/* Coins Capsule */}
        {showCoinsSkeleton ? (
          <Skeleton className="h-8 w-20 rounded-full" />
        ) : (
          <div
            className="group relative h-8 flex items-center gap-1.5 px-3 rounded-full bg-white/5 dark:bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-white/20 cursor-pointer overflow-visible coin-capsule"
            onClick={handleCoinsClick}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            style={{
              pointerEvents: 'auto',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
              zIndex: 51
            }}
          >
            {/* Coin Icon */}
            <Coins className="w-4 h-4 text-yellow-500 coin-icon transition-transform duration-500" />

            {/* Balance Text */}
            <span className="text-xs md:text-sm font-bold text-foreground coin-balance transition-all duration-300">{balance}</span>

            {/* Vertical Separator */}
            <div className="w-px h-4 bg-white/10" />

            {/* Plus Button - Integrated */}
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/10 border border-yellow-500/30 transition-all duration-200 hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:scale-110 plus-zone">
              <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400">+</span>
            </div>

            {/* Particle Container */}
            <div className="coin-particles pointer-events-none absolute inset-0" />
          </div>
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
              onClick={handleDuelPassClick}
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
              onClick={handleDuelPassClick}
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
});

