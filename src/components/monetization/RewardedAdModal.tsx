import { useState, useEffect } from 'react';
import { useRewardedAd, RewardType } from '@/hooks/useRewardedAd';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Coins, Calendar, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
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
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-200 font-medium mb-1">Premium подписка активна</p>
                <p className="text-xs text-zinc-400">
                  У тебя Premium подписка! Ты получаешь все награды без просмотра рекламы.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="primary"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Понятно
            </Button>
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
          defaultDescription: 'Посмотри короткое видео и получи монеты',
          rewardText: `+${rewardAmount} монет`,
        };
      case 'restore_streak':
        return {
          icon: Calendar,
          defaultTitle: 'Восстановить серию',
          defaultDescription: 'Посмотри видео и восстанови свою серию ежедневных бонусов',
          rewardText: 'Серию восстановлено',
        };
      case 'test_attempt':
        return {
          icon: Video,
          defaultTitle: 'Дополнительная попытка',
          defaultDescription: 'Посмотри видео и получи дополнительную попытку прохождения теста',
          rewardText: 'Попытка восстановлена',
        };
      default:
        return {
          icon: Video,
          defaultTitle: 'Получить награду',
          defaultDescription: 'Посмотри короткое видео и получи награду',
          rewardText: 'Награда получена',
        };
    }
  };

  const rewardInfo = getRewardInfo();
  const RewardIcon = rewardInfo.icon;

  const handleShowAd = async () => {
    try {
      setShowReward(false);
      // Сбрасываем предыдущие ошибки через reset() из хука
      reset();
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
    } catch (err: any) {
      // Ошибка уже установлена в хуке, но можем добавить дополнительную обработку
      console.error('[RewardedAdModal] Error:', err);
      
      // Если это NotAllowedError, предлагаем пользователю попробовать еще раз
      if (err.message?.includes('not allowed') || err.message?.includes('NotAllowedError')) {
        // Ошибка уже установлена в хуке, просто логируем
        console.warn('[RewardedAdModal] Autoplay blocked, user needs to interact again');
      }
    }
  };

  return (
    <UnifiedModal 
      open={open} 
      onOpenChange={onOpenChange}
      title={title || rewardInfo.defaultTitle}
    >
      <div className="space-y-4">
            {/* Состояние: Ожидание просмотра */}
            {!showReward && (
              <>
                <div className="flex flex-col items-center justify-center space-y-3 py-4">
                  {/* Иконка награды */}
                  <div className="relative">
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10">
                      <RewardIcon className="w-8 h-8 text-indigo-400" />
                    </div>
                  </div>
                  
                  {/* Описание */}
                  <div className="text-center space-y-1">
                    <p className="text-sm text-zinc-300">
                      {description || rewardInfo.defaultDescription}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Смотри рекламу минимум 3 секунды, чтобы получить награду
                    </p>
                  </div>
                  
                  {/* Индикатор прогресса */}
                  {loading && (
                    <div className="w-full max-w-xs space-y-2">
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <p className="text-xs text-zinc-400 text-center">
                        Реклама загружается...
                      </p>
                    </div>
                  )}
                </div>

            {/* Ошибка */}
            {error && (
              <div className="bg-zinc-900/50 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 sm:flex-initial"
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleShowAd}
                disabled={loading}
                className="flex-1 sm:flex-initial"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Смотреть видео
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Состояние: Награда получена */}
        {showReward && (
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            {/* Иконка успеха */}
            <div className="relative">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            
            {/* Текст награды */}
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-emerald-400">
                {rewardInfo.rewardText}
              </p>
              <p className="text-xs text-zinc-400">
                Награда начислена
              </p>
            </div>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}

