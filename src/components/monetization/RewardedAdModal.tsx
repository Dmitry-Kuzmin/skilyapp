import { useState, useEffect } from 'react';
import { useRewardedAd, RewardType } from '@/hooks/useRewardedAd';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Coins, Calendar, Sparkles, CheckCircle2, Zap, Gift, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
 * 🏆 PREMIUM Rewarded Ad Modal
 * 
 * Адаптивная по высоте модалка для показа Rewarded Video рекламы
 * С premium дизайном и glassmorphism эффектами
 */
export function RewardedAdModal({
  open,
  onOpenChange,
  rewardType,
  rewardAmount = 50,
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

  const getRewardInfo = () => {
    switch (rewardType) {
      case 'coins':
        return {
          icon: Coins,
          emoji: '🪙',
          defaultTitle: 'CRYPTO MINER',
          defaultDescription: 'Добывай криптомонеты! Смотри рекламу и получай награду.',
          rewardText: `+${rewardAmount} монет`,
          gradient: 'from-yellow-500 to-amber-600',
          bgGradient: 'from-yellow-500/10 to-amber-500/10',
          iconColor: 'text-yellow-400',
        };
      case 'restore_streak':
        return {
          icon: Calendar,
          emoji: '🔥',
          defaultTitle: 'Восстановить серию',
          defaultDescription: 'Посмотри видео и восстанови свою серию ежедневных бонусов',
          rewardText: 'Серия восстановлена!',
          gradient: 'from-orange-500 to-red-600',
          bgGradient: 'from-orange-500/10 to-red-500/10',
          iconColor: 'text-orange-400',
        };
      case 'test_attempt':
        return {
          icon: Zap,
          emoji: '⚡',
          defaultTitle: 'Дополнительная попытка',
          defaultDescription: 'Посмотри видео и получи дополнительную попытку',
          rewardText: 'Попытка восстановлена!',
          gradient: 'from-violet-500 to-purple-600',
          bgGradient: 'from-violet-500/10 to-purple-500/10',
          iconColor: 'text-violet-400',
        };
      default:
        return {
          icon: Gift,
          emoji: '🎁',
          defaultTitle: 'Получить награду',
          defaultDescription: 'Посмотри короткое видео и получи награду',
          rewardText: 'Награда получена!',
          gradient: 'from-indigo-500 to-blue-600',
          bgGradient: 'from-indigo-500/10 to-blue-500/10',
          iconColor: 'text-indigo-400',
        };
    }
  };

  const rewardInfo = getRewardInfo();
  const RewardIcon = rewardInfo.icon;

  const handleShowAd = async () => {
    try {
      setShowReward(false);
      reset();
      const success = await showAd();

      if (success) {
        setShowReward(true);
        await onRewardClaimed();

        // Автоматически закрываем через 2.5 секунды
        setTimeout(() => {
          onOpenChange(false);
        }, 2500);
      }
    } catch (err: any) {
      console.error('[RewardedAdModal] Error:', err);
    }
  };

  // Premium пользователь — не показываем рекламу
  if (!isAvailable) {
    return (
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        className="max-w-sm"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Premium активен</h3>
              <p className="text-xs text-muted-foreground">Награды без рекламы</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            У тебя Premium подписка! Ты получаешь все награды без просмотра рекламы.
          </p>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          >
            Понятно
          </Button>
        </div>
      </ResponsiveModal>
    );
  }

  // Header для модалки
  const headerContent = (
    <div className={cn(
      "relative overflow-hidden px-4 py-4",
      "bg-gradient-to-br",
      rewardInfo.bgGradient
    )}>
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{rewardInfo.emoji}</span>
          <h3 className="font-bold text-foreground tracking-wide">
            {title || rewardInfo.defaultTitle}
          </h3>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="p-1.5 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      headerContent={headerContent}
      className="max-w-sm"
      hideHandle={true}
    >
      <AnimatePresence mode="wait">
        {!showReward ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 space-y-5"
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div className={cn(
                "relative w-16 h-16 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br",
                rewardInfo.bgGradient,
                "border border-border/50"
              )}>
                <RewardIcon className={cn("w-8 h-8", rewardInfo.iconColor)} />
                {/* Pulse ring */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl animate-ping opacity-20",
                  "bg-gradient-to-br",
                  rewardInfo.gradient
                )} style={{ animationDuration: '2s' }} />
              </div>
            </div>

            {/* Description */}
            <div className="text-center space-y-2">
              <p className="text-sm text-foreground font-medium">
                {description || rewardInfo.defaultDescription}
              </p>
              <p className="text-xs text-muted-foreground">
                Награда будет начислена после показа рекламы
              </p>
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="space-y-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", rewardInfo.gradient)}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Загрузка рекламы...
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-xs text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleShowAd}
                disabled={loading}
                className={cn(
                  "flex-1 text-white shadow-lg",
                  "bg-gradient-to-r hover:opacity-90 transition-opacity",
                  rewardInfo.gradient
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Смотреть видео
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 flex flex-col items-center justify-center space-y-4"
          >
            {/* Success animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              {/* Particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 0,
                    x: Math.cos(i * 45 * Math.PI / 180) * 50,
                    y: Math.sin(i * 45 * Math.PI / 180) * 50
                  }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-400 rounded-full"
                />
              ))}
            </motion.div>

            <div className="text-center space-y-1">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-emerald-400"
              >
                {rewardInfo.rewardText}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground"
              >
                Награда успешно начислена!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveModal>
  );
}
