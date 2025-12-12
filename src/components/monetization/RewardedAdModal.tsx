import { useState, useEffect } from 'react';
import { useRewardedAd, RewardType } from '@/hooks/useRewardedAd';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Coins, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RewardedAdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewardType: RewardType;
  rewardAmount?: number;
  onRewardClaimed: () => void | Promise<void>;
  title?: string;
  description?: string;
}

/**
 * Компонент модалки для показа Rewarded Video рекламы
 * 
 * Использование:
 * - Восстановление streak: rewardType="restore_streak"
 * - Получение монет: rewardType="coins", rewardAmount=20
 */
export function RewardedAdModal({
  open,
  onOpenChange,
  rewardType,
  rewardAmount = 20,
  onRewardClaimed,
  title,
  description,
}: RewardedAdModalProps) {
  const { loading, error, isAvailable, showAd, reset } = useRewardedAd();
  const [showReward, setShowReward] = useState(false);

  // Сбрасываем состояние при закрытии
  useEffect(() => {
    if (!open) {
      reset();
      setShowReward(false);
    }
  }, [open, reset]);

  // Если реклама недоступна (Premium пользователь), показываем сообщение
  if (!isAvailable) {
    return (
      <UnifiedModal open={open} onOpenChange={onOpenChange} title="Premium статус">
        <div className="space-y-4">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              У тебя Premium подписка! Ты получаешь все награды без просмотра рекламы.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-end">
            <Button onClick={() => onOpenChange(false)}>Понятно</Button>
          </div>
        </div>
      </UnifiedModal>
    );
  }

  const getRewardInfo = () => {
    switch (rewardType) {
      case 'coins':
        return {
          icon: Coins,
          defaultTitle: `Получить ${rewardAmount} монет`,
          defaultDescription: 'Посмотри короткое видео и получи монеты!',
          rewardText: `+${rewardAmount} монет`,
        };
      case 'restore_streak':
        return {
          icon: Calendar,
          defaultTitle: 'Восстановить серию',
          defaultDescription: 'Посмотри видео и восстанови свою серию ежедневных бонусов!',
          rewardText: 'Серию восстановлено!',
        };
      case 'test_attempt':
        return {
          icon: Video,
          defaultTitle: 'Дополнительная попытка',
          defaultDescription: 'Посмотри видео и получи дополнительную попытку прохождения теста!',
          rewardText: 'Попытка восстановлена!',
        };
      default:
        return {
          icon: Video,
          defaultTitle: 'Получить награду',
          defaultDescription: 'Посмотри короткое видео и получи награду!',
          rewardText: 'Награда получена!',
        };
    }
  };

  const rewardInfo = getRewardInfo();
  const RewardIcon = rewardInfo.icon;

  const handleShowAd = async () => {
    try {
      setShowReward(false);
      const success = await showAd();
      
      if (success) {
        // Показываем анимацию награды
        setShowReward(true);
        
        // Вызываем callback для начисления награды
        await onRewardClaimed();
        
        // Автоматически закрываем через 2 секунды
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      }
    } catch (err) {
      // Ошибка уже установлена в хуке
      console.error('[RewardedAdModal] Error:', err);
    }
  };

  return (
    <UnifiedModal 
      open={open} 
      onOpenChange={onOpenChange}
      title={title || rewardInfo.defaultTitle}
    >
      <div className="space-y-6">
        {/* Состояние: Ожидание просмотра */}
        {!showReward && (
          <>
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-8">
                  <RewardIcon className="w-16 h-16 text-indigo-400" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-zinc-400">
                  {description || rewardInfo.defaultDescription}
                </p>
                <p className="text-xs text-zinc-500">
                  Видео займет около 30 секунд
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button
                onClick={handleShowAd}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Смотреть видео
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Состояние: Награда получена */}
        {showReward && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-green-500/30 blur-2xl rounded-full animate-ping" />
              <div className="relative bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-2xl p-8">
                <Sparkles className="w-16 h-16 text-emerald-400 animate-pulse" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold text-emerald-400">
                {rewardInfo.rewardText}
              </p>
              <p className="text-sm text-zinc-400">
                Награда начислена!
              </p>
            </div>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}

