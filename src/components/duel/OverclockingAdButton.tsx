import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cpu, Video, Loader2, Clock, Lock } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { useAdRewardStatus } from '@/hooks/useAdRewardStatus';

interface OverclockingAdButtonProps {
  slotNumber: 2 | 3;
  onSlotUnlocked: () => void;
  className?: string;
}

/**
 * Компонент "OVERCLOCKING" - разблокировка слота за просмотр рекламы
 * Интегрирован в киберпанк-лоре игры
 */
export function OverclockingAdButton({ slotNumber, onSlotUnlocked, className }: OverclockingAdButtonProps) {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();
  const [showAdModal, setShowAdModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Проверяем статус рекламы (только для слота 2, слот 3 только Premium)
  // Для slot_unlock: 1 раз в день, кулдаун 24 часа
  const { canWatch, nextAvailableAt, dailyCount, dailyLimit } = useAdRewardStatus(
    profileId,
    'slot_unlock',
    { 
      enabled: slotNumber === 2, // Только для слота 2
      dailyLimit: 1, // 1 раз в день
      cooldownMinutes: 1440, // 24 часа
    }
  );

  // Для слота 3 реклама недоступна (только Premium)
  if (slotNumber === 3) {
    return null;
  }

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

  const handleWatchAd = () => {
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
      // Разблокируем слот через Edge Function
      // Используем claim_ad_reward с типом 'slot_unlock'
      const { data, error } = await supabase.functions.invoke('claim-ad-reward', {
        body: {
          user_id: profileId,
          reward_type: 'slot_unlock',
          reward_amount: 0, // Не начисляем монеты, только разблокируем слот
          metadata: { slot_number: slotNumber },
        }
      });

      if (error) throw error;

      if (data.success) {
        // Обновляем профиль (разблокируем слот)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ ram_slots_unlocked: slotNumber })
          .eq('id', profileId);

        if (updateError) throw updateError;

        // Обновляем баланс в кэше
        await queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });

        sounds.correctAnswer();
        haptics.boostActivated();

        toast({
          title: '✅ OVERCLOCKING',
          description: `Слот ${slotNumber} разблокирован на эту дуэль!`,
        });

        // Уведомляем родителя
        onSlotUnlocked();
      } else {
        throw new Error(data.error || 'Не удалось разблокировать слот');
      }
    } catch (err: any) {
      console.error('[OverclockingAdButton] Error claiming reward:', err);
      toast({
        title: 'Ошибка',
        description: err.message || 'Не удалось разблокировать слот',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleWatchAd}
        disabled={loading || isOnCooldown || isDailyLimitReached}
        variant="outline"
        size="sm"
        className={cn(
          "w-full h-10 text-xs font-semibold transition-all relative overflow-hidden",
          "border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 to-violet-950/30",
          "hover:from-indigo-950/60 hover:to-violet-950/50 hover:border-indigo-400/60",
          "text-indigo-300 hover:text-indigo-200",
          "shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {isDailyLimitReached ? (
          <>
            <Lock className="w-3.5 h-3.5 mr-1.5 text-indigo-500/50" />
            <span>Daily Limit</span>
          </>
        ) : isOnCooldown ? (
          <>
            <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500/50" />
            <span>Cooldown ({timeUntilAvailable})</span>
          </>
        ) : (
          <>
            <Video className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            <span>OVERCLOCK</span>
          </>
        )}
      </Button>

      <RewardedAdModal
        open={showAdModal}
        onOpenChange={setShowAdModal}
        rewardType="coins"
        rewardAmount={0}
        onRewardClaimed={handleRewardClaimed}
        title="OVERCLOCKING"
        description="Посмотри видео и разблокируй слот на эту дуэль. Временный root-доступ..."
      />
    </>
  );
}

