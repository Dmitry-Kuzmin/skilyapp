import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cpu, Video, Loader2, Lock, Clock, Info } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { useAdRewardStatus } from '@/hooks/useAdRewardStatus';

interface CryptoMinerAdButtonProps {
  className?: string;
}

/**
 * Компонент "CRYPTO MINER" - кнопка для получения монет за просмотр рекламы
 * Интегрирован в киберпанк-лоре игры
 */
export function CryptoMinerAdButton({ className }: CryptoMinerAdButtonProps) {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();
  const [showAdModal, setShowAdModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Проверяем статус рекламы через хук (coins: 5 раз в день, кулдаун 60 минут)
  const {
    canWatch,
    nextAvailableAt,
    dailyCount,
    dailyLimit,
    cooldownMinutes,
    refetch
  } = useAdRewardStatus(
    profileId,
    'coins',
    {
      enabled: !!profileId,
      dailyLimit: 5, // 5 раз в день
      cooldownMinutes: 60, // 1 час кулдаун
      // refetchInterval: 30000 убран для экономии Edge Requests
    }
  );

  // Обновляем статус после закрытия модалки рекламы
  useEffect(() => {
    if (!showAdModal && profileId) {
      // Небольшая задержка, чтобы дать время серверу обработать запрос
      const timer = setTimeout(() => {
        refetch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showAdModal, profileId, refetch]);

  const handleWatchAd = async () => {
    if (!profileId) {
      toast({
        title: 'Ошибка',
        description: 'Необходимо войти в систему',
        variant: 'destructive',
      });
      return;
    }

    // Проверяем лимиты перед показом модалки
    if (!canWatch) {
      if (dailyCount && dailyLimit && dailyCount >= dailyLimit) {
        toast({
          title: 'Дневной лимит достигнут',
          description: `Ты уже посмотрел ${dailyLimit} реклам сегодня. Попробуй завтра!`,
          variant: 'default',
        });
      } else if (nextAvailableAt) {
        const now = new Date();
        const diff = nextAvailableAt.getTime() - now.getTime();
        const minutes = Math.ceil(diff / 60000);
        toast({
          title: 'Кулдаун активен',
          description: `Подожди ${minutes} минут перед следующим просмотром.`,
          variant: 'default',
        });
      }
      return;
    }

    setShowAdModal(true);
  };

  const handleRewardClaimed = async () => {
    setLoading(true);
    try {
      // Начисляем монеты через Edge Function (с проверкой ограничений)
      const { data, error } = await supabase.functions.invoke('claim-ad-reward', {
        body: {
          user_id: profileId,
          reward_type: 'coins',
          reward_amount: 25,
        }
      });

      if (error) throw error;

      if (data.success) {
        // Обновляем баланс в кэше
        await queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });

        // Обновляем статус рекламы
        await refetch();

        sounds.correctAnswer();
        haptics.boostActivated();

        toast({
          title: '✅ CRYPTO MINER',
          description: `+25 монет начислено! (${data.daily_count || 0}/${data.daily_limit || 5} сегодня)`,
        });
      } else {
        throw new Error(data.error || 'Не удалось начислить награду');
      }
    } catch (err: any) {
      console.error('[CryptoMinerAdButton] Error claiming reward:', err);

      // Обрабатываем ошибки лимитов
      if (err.message?.includes('daily limit') || err.message?.includes('cooldown')) {
        toast({
          title: 'Лимит достигнут',
          description: err.message || 'Ты уже использовал все доступные просмотры',
          variant: 'default',
        });
        await refetch(); // Обновляем статус
      } else {
        toast({
          title: 'Ошибка',
          description: err.message || 'Не удалось начислить монеты',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
  const isDailyLimitReached = dailyCount && dailyLimit
    ? dailyCount >= dailyLimit
    : false;

  return (
    <>
      <button
        onClick={handleWatchAd}
        disabled={loading || isOnCooldown || isDailyLimitReached}
        className={cn(
          "w-full p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl",
          "flex items-center justify-between group",
          "hover:bg-yellow-500/20 transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "disabled:hover:bg-yellow-500/10",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 bg-yellow-500/20 rounded-lg",
            isOnCooldown && "opacity-50"
          )}>
            {isOnCooldown ? (
              <Clock className="text-yellow-500 w-6 h-6" />
            ) : (
              <Cpu className="text-yellow-500 w-6 h-6 animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <div className="text-white font-bold font-mono">CRYPTO MINER</div>
            <div className="text-[10px] text-yellow-500/80 font-mono">
              {isDailyLimitReached ? (
                `STATUS: LIMIT (${dailyCount}/${dailyLimit})`
              ) : isOnCooldown ? (
                `STATUS: COOLDOWN (${timeUntilAvailable})`
              ) : (
                `STATUS: READY (${dailyCount || 0}/${dailyLimit || 5})`
              )}
            </div>
            {/* Информация о лимитах */}
            {!isDailyLimitReached && !isOnCooldown && (
              <div className="text-[9px] text-yellow-500/60 font-mono mt-0.5">
                {cooldownMinutes}min cooldown
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-white font-mono font-bold block">+25 🟡</span>
          <span className="text-[10px] text-white/40 uppercase">
            {isDailyLimitReached ? 'Limit' : isOnCooldown ? 'Wait' : 'Watch Ad'}
          </span>
        </div>
      </button>

      <RewardedAdModal
        open={showAdModal}
        onOpenChange={setShowAdModal}
        rewardType="coins"
        rewardAmount={25}
        onRewardClaimed={handleRewardClaimed}
        placement="crypto-miner"
        title="CRYPTO MINER"
        description="Посмотри видео и получи 25 монет. Майнинг крипты требует времени..."
      />
    </>
  );
}

