import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Coins, Loader2, Clock, Lock } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { useAdRewardStatus } from '@/hooks/useAdRewardStatus';

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
      <Button
        onClick={handleWatchAd}
        disabled={loading || winnings === 0 || isOnCooldown}
        className={cn(
          "w-full p-4 bg-gradient-to-r from-violet-500/20 to-indigo-500/20",
          "border border-violet-500/50 rounded-xl",
          "flex items-center justify-between group",
          "hover:from-violet-500/30 hover:to-indigo-500/30 transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "disabled:hover:from-violet-500/20 disabled:hover:to-indigo-500/20",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 bg-violet-500/20 rounded-lg",
            isOnCooldown && "opacity-50"
          )}>
            {isOnCooldown ? (
              <Clock className="text-violet-400 w-6 h-6" />
            ) : (
              <Video className="text-violet-400 w-6 h-6" />
            )}
          </div>
          <div className="text-left">
            <div className="text-white font-bold font-mono">DATA LAUNDERING</div>
            <div className="text-[10px] text-violet-400/80 font-mono">
              {isOnCooldown ? (
                `COOLDOWN (${timeUntilAvailable})`
              ) : (
                'Удвой выигрыш'
              )}
            </div>
            {!isOnCooldown && (
              <div className="text-[9px] text-violet-400/60 font-mono mt-0.5">
                {cooldownMinutes}min cooldown
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-white font-mono font-bold block">+{winnings} 🟡</span>
          <span className="text-[10px] text-white/40 uppercase">
            {isOnCooldown ? 'Wait' : 'Watch Ad'}
          </span>
        </div>
      </Button>

      <RewardedAdModal
        open={showAdModal}
        onOpenChange={setShowAdModal}
        rewardType="coins"
        rewardAmount={winnings}
        onRewardClaimed={handleRewardClaimed}
        title="DATA LAUNDERING"
        description={`Посмотри видео и удвой свой выигрыш: +${winnings} монет`}
      />
    </>
  );
}

