import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cpu, Video, Loader2, Lock, Clock } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';

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
  const [adStatus, setAdStatus] = useState<{
    canWatch: boolean;
    nextAvailableAt?: Date;
    dailyCount?: number;
    dailyLimit?: number;
  } | null>(null);

  // Проверяем статус рекламы (можно ли смотреть, кулдаун, лимиты)
  const checkAdStatus = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-ad-reward-status', {
        body: { user_id: profileId, reward_type: 'coins' }
      });

      if (error) throw error;

      setAdStatus({
        canWatch: data.can_watch || false,
        nextAvailableAt: data.next_available_at ? new Date(data.next_available_at) : undefined,
        dailyCount: data.daily_count || 0,
        dailyLimit: data.daily_limit || 5,
      });
    } catch (err: any) {
      console.error('[CryptoMinerAdButton] Error checking ad status:', err);
      // По умолчанию разрешаем смотреть (если сервер недоступен)
      setAdStatus({
        canWatch: true,
        dailyCount: 0,
        dailyLimit: 5,
      });
    }
  };

  // Загружаем статус при монтировании и после закрытия модалки
  useEffect(() => {
    if (profileId) {
      checkAdStatus();
    }
  }, [profileId]);

  // Обновляем статус после закрытия модалки рекламы
  useEffect(() => {
    if (!showAdModal && profileId) {
      // Небольшая задержка, чтобы дать время серверу обработать запрос
      const timer = setTimeout(() => {
        checkAdStatus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showAdModal, profileId]);

  const handleWatchAd = async () => {
    if (!profileId) {
      toast({
        title: 'Ошибка',
        description: 'Необходимо войти в систему',
        variant: 'destructive',
      });
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
          reward_amount: 50,
        }
      });

      if (error) throw error;

      if (data.success) {
        // Обновляем баланс в кэше
        await queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });
        
        // Обновляем статус рекламы
        await checkAdStatus();

        sounds.correctAnswer();
        haptics.boostActivated();

        toast({
          title: '✅ CRYPTO MINER',
          description: `+50 монет начислено! (${data.daily_count || 0}/${data.daily_limit || 5} сегодня)`,
        });
      } else {
        throw new Error(data.error || 'Не удалось начислить награду');
      }
    } catch (err: any) {
      console.error('[CryptoMinerAdButton] Error claiming reward:', err);
      toast({
        title: 'Ошибка',
        description: err.message || 'Не удалось начислить монеты',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilAvailable = () => {
    if (!adStatus?.nextAvailableAt) return null;
    
    const now = new Date();
    const diff = adStatus.nextAvailableAt.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const timeUntilAvailable = getTimeUntilAvailable();
  const isOnCooldown = !!timeUntilAvailable;
  const isDailyLimitReached = adStatus?.dailyCount && adStatus?.dailyLimit 
    ? adStatus.dailyCount >= adStatus.dailyLimit 
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
                'STATUS: DAILY LIMIT REACHED'
              ) : isOnCooldown ? (
                `STATUS: COOLDOWN (${timeUntilAvailable})`
              ) : (
                'STATUS: READY'
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-white font-mono font-bold block">+50 🟡</span>
          <span className="text-[10px] text-white/40 uppercase">
            {isDailyLimitReached ? 'Limit' : isOnCooldown ? 'Wait' : 'Watch Ad'}
          </span>
        </div>
      </button>

      <RewardedAdModal
        open={showAdModal}
        onOpenChange={setShowAdModal}
        rewardType="coins"
        rewardAmount={50}
        onRewardClaimed={handleRewardClaimed}
        title="CRYPTO MINER"
        description="Посмотри видео и получи 50 монет. Майнинг крипты требует времени..."
      />
    </>
  );
}

