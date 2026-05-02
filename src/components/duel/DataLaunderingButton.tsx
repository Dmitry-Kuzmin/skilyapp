import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Coins, Loader2, Clock, Lock, Sparkles } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { useAdRewardStatus } from '@/hooks/useAdRewardStatus';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface DataLaunderingButtonProps {
  winnings: number;
  duelId: string;
  className?: string;
}

/**
 * Компонент "DATA LAUNDERING" - удвоение выигрыша за просмотр рекламы
 * Интегрирован в киберпанк-лоре игры
 */
export function DataLaunderingButton({ winnings, duelId, className }: DataLaunderingButtonProps) {
  const { profileId } = useUserContext();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showAdModal, setShowAdModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Проверяем статус рекламы (double_winnings: без лимитов, но с кулдауном 60 минут)
  const {
    canWatch,
    nextAvailableAt,
    dailyCount,
    dailyLimit,
    cooldownMinutes,
    refetch
  } = useAdRewardStatus(
    profileId,
    'double_winnings',
    {
      enabled: !!profileId && winnings > 0,
      dailyLimit: 999, // Без дневного лимита (но можно ограничить)
      cooldownMinutes: 60, // 1 час кулдаун
      refetchInterval: 30000, // Обновляем каждые 30 секунд
    }
  );

  // Обновляем статус после закрытия модалки рекламы
  useEffect(() => {
    if (!showAdModal && profileId) {
      const timer = setTimeout(() => {
        refetch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showAdModal, profileId, refetch]);

  const getTimeUntilAvailable = () => {
    if (!nextAvailableAt) return null;

    const now = new Date();
    const diff = nextAvailableAt.getTime() - now.getTime();

    if (diff <= 0) return null;

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const timeUntilAvailable = getTimeUntilAvailable();
  const isOnCooldown = !!timeUntilAvailable;

  const handleWatchAd = () => {
    // Проверяем лимиты перед показом модалки
    if (!canWatch && isOnCooldown) {
      toast({
        title: 'Кулдаун активен',
        description: `Подожди ${Math.ceil((nextAvailableAt!.getTime() - Date.now()) / 60000)} минут перед следующим просмотром.`,
        variant: 'default',
      });
      return;
    }

    setShowAdModal(true);
  };

  const handleRewardClaimed = async () => {
    if (!profileId) {
      toast({
        title: 'Ошибка',
        description: 'Необходимо войти в систему',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Удваиваем выигрыш через Edge Function
      // Используем claim_ad_reward с типом 'double_winnings'
      const { data, error } = await supabase.functions.invoke('claim-ad-reward', {
        body: {
          user_id: profileId,
          reward_type: 'double_winnings',
          reward_amount: winnings, // Сумма для удвоения
          metadata: { duel_id: duelId },
        }
      });

      if (error) throw error;

      if (data.success) {
        // Обновляем баланс в кэше
        await queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });

        // Обновляем данные дуэли
        await queryClient.invalidateQueries({ queryKey: ['duel-results', duelId] });

        // Обновляем статус рекламы
        await refetch();

        sounds.correctAnswer();
        haptics.boostActivated();

        toast({
          title: '✅ DATA LAUNDERING',
          description: `+${winnings} монет начислено! Выигрыш удвоен.`,
        });
      } else {
        throw new Error(data.error || 'Не удалось удвоить выигрыш');
      }
    } catch (err: any) {
      console.error('[DataLaunderingButton] Error claiming reward:', err);

      // Обрабатываем ошибки лимитов
      if (err.message?.includes('cooldown')) {
        toast({
          title: 'Кулдаун активен',
          description: err.message || 'Подожди перед следующим просмотром',
          variant: 'default',
        });
        await refetch(); // Обновляем статус
      } else {
        toast({
          title: 'Ошибка',
          description: err.message || 'Не удалось удвоить выигрыш',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn("relative group", className)}
      >
        <Button
          onClick={handleWatchAd}
          disabled={loading || winnings === 0 || isOnCooldown}
          className={cn(
            "w-full h-auto p-0 overflow-hidden rounded-[2rem] transition-all duration-500",
            "bg-white/10 dark:bg-white/[0.03] backdrop-blur-xl",
            "border border-white/20 dark:border-white/[0.05]",
            "hover:bg-white/20 dark:hover:bg-white/[0.08]",
            "hover:shadow-[0_0_32px_rgba(99,102,241,0.2)]",
            "disabled:opacity-40 disabled:grayscale-[0.5] disabled:hover:shadow-none"
          )}
        >
          {/* Subtle Glow Effect */}
          {!isOnCooldown && (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          )}

          {/* Animated Background Shine - Refined */}
          {!isOnCooldown && (
            <motion.div
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent z-0"
            />
          )}

          {/* Noise Texture */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0" style={{ backgroundImage: 'url("/noise.svg")' }} />

          <div className="relative z-10 w-full p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                isOnCooldown ? "bg-black/10 dark:bg-white/5" : "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_8px_16px_rgba(99,102,241,0.3)]"
              )}>
                {isOnCooldown ? (
                  <Clock className="text-slate-400 dark:text-zinc-500 w-6 h-6" />
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Video className="text-white w-6 h-6" />
                  </motion.div>
                )}
              </div>

              <div className="text-left">
                <div className="text-slate-900 dark:text-white font-black tracking-tight text-lg leading-none mb-1 flex items-center gap-2">
                  X2 ВЫИГРЫШ
                  {!isOnCooldown && <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
                </div>
                <div className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                  {isOnCooldown ? (
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> Перезагрузка {timeUntilAvailable}
                    </span>
                  ) : (
                    'Data Laundering • Ready'
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 dark:text-blue-400 font-black text-2xl tracking-tighter">
                  +{winnings}
                </span>
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400 blur-sm opacity-30" />
                  <Coins className="w-5 h-5 text-yellow-500 dark:text-yellow-400 relative z-10" />
                </div>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest bg-slate-100 dark:bg-black/40 px-3 py-1 rounded-full mt-1 border border-black/5 dark:border-white/5">
                WATCH AD
              </div>
            </div>
          </div>
        </Button>
      </motion.div>

      <RewardedAdModal
        open={showAdModal}
        onOpenChange={setShowAdModal}
        rewardType="coins"
        rewardAmount={winnings}
        onRewardClaimed={handleRewardClaimed}
        title={t('rewardedAds.placements.dataLaundering.title')}
        description={t('rewardedAds.placements.dataLaundering.description', { amount: winnings })}
      />
    </>
  );
}
