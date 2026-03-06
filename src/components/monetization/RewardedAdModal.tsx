import { useState, useEffect } from 'react';
import { useRewardedAd, RewardType } from '@/hooks/useRewardedAd';
import { Button } from '@/components/ui/button';
import { Video, Coins, Calendar, Sparkles, CheckCircle2, Zap, Gift, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface RewardedAdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewardType: RewardType;
  rewardAmount?: number;
  onRewardClaimed: () => void | Promise<void>;
  title?: string;
  description?: string;
  inlineOverlay?: boolean;
  secondaryAction?: {
    text: string;
    subtext?: string;
    icon?: React.ReactNode;
    onClick: () => void | Promise<void>;
  };
}

export function RewardedAdModal({
  open,
  onOpenChange,
  rewardType,
  rewardAmount = 25,
  onRewardClaimed,
  title,
  description,
  inlineOverlay = false,
  secondaryAction,
}: RewardedAdModalProps) {
  const { loading, error, isAvailable, showAd, reset } = useRewardedAd();
  const [showReward, setShowReward] = useState(false);

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
          defaultTitle: title || 'Получить монеты',
          defaultDescription: description || 'Посмотри короткую рекламу и получай монеты бесплатно.',
          rewardText: `+${rewardAmount} монет`,
          gradient: 'from-amber-500 to-yellow-500',
          glow: 'shadow-amber-500/40',
          bg: 'from-amber-950/60 via-yellow-950/40 to-black',
          ring: 'ring-amber-500/30',
          iconBg: 'from-amber-500 to-yellow-500',
          actionText: `Смотреть и получить +${rewardAmount}`,
        };
      case 'restore_streak':
        return {
          icon: Calendar,
          emoji: '🔥',
          defaultTitle: title || 'Восстановить серию',
          defaultDescription: description || 'Посмотри видео и восстанови свою серию ежедневных бонусов.',
          rewardText: 'Серия восстановлена!',
          gradient: 'from-orange-500 to-red-500',
          glow: 'shadow-orange-500/40',
          bg: 'from-orange-950/60 via-red-950/40 to-black',
          ring: 'ring-orange-500/30',
          iconBg: 'from-orange-500 to-red-500',
          actionText: 'Смотреть и восстановить',
        };
      case 'test_attempt':
        return {
          icon: Zap,
          emoji: '⚡',
          defaultTitle: title || 'Дополнительная попытка',
          defaultDescription: description || 'Посмотри видео и получи ещё одну попытку.',
          rewardText: 'Попытка восстановлена!',
          gradient: 'from-violet-500 to-purple-500',
          glow: 'shadow-violet-500/40',
          bg: 'from-violet-950/60 via-purple-950/40 to-black',
          ring: 'ring-violet-500/30',
          iconBg: 'from-violet-500 to-purple-500',
          actionText: 'Смотреть и получить попытку',
        };
      case 'slot_unlock':
        return {
          icon: Zap,
          emoji: '🔓',
          defaultTitle: title || 'Открыть слот',
          defaultDescription: description || 'Смотри короткую рекламу и открой боевой слот на одну дуэль.',
          rewardText: '+1 Слот на игру',
          gradient: 'from-orange-500 to-amber-500',
          glow: 'shadow-orange-500/40',
          bg: 'from-orange-950/60 via-amber-950/40 to-black',
          ring: 'ring-orange-500/30',
          iconBg: 'from-orange-500 to-amber-500',
          actionText: 'Смотреть и открыть слот',
        };
      default:
        return {
          icon: Gift,
          emoji: '🎁',
          defaultTitle: title || 'Получить награду',
          defaultDescription: description || 'Посмотри короткое видео и получи награду.',
          rewardText: 'Награда получена!',
          gradient: 'from-indigo-500 to-blue-500',
          glow: 'shadow-indigo-500/40',
          bg: 'from-indigo-950/60 via-blue-950/40 to-black',
          ring: 'ring-indigo-500/30',
          iconBg: 'from-indigo-500 to-blue-500',
          actionText: 'Смотреть и получить',
        };
    }
  };

  const info = getRewardInfo();
  const RewardIcon = info.icon;

  const handleShowAd = async () => {
    try {
      setShowReward(false);
      reset();
      const success = await showAd();
      if (success) {
        setShowReward(true);
        await onRewardClaimed();
        setTimeout(() => onOpenChange(false), 2500);
      }
    } catch {
      // error уже установлен в хуке
    }
  };

  return (
    <AnimatePresence>
      {open && (
        /* Backdrop */
        <motion.div
          key="ad-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "z-50 flex items-end sm:items-center justify-center p-0 backdrop-blur-2xl bg-[#0b0d14]/80",
            inlineOverlay ? "absolute inset-0 rounded-xl overflow-hidden" : "fixed inset-0 sm:p-4"
          )}
          onClick={() => !loading && onOpenChange(false)}
        >
          {/* Overlay color if not using backdrop-blur directly on the container */}
          {!inlineOverlay && <div className="absolute inset-0 bg-[#0b0d14]/80 backdrop-blur-2xl" />}

          {/* Modal */}
          <motion.div
            key="ad-modal-content"
            initial={{ opacity: 0, y: inlineOverlay ? 0 : 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: inlineOverlay ? 0 : 30, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative overflow-hidden shadow-none border-none",
              inlineOverlay ? "w-full h-full flex flex-col justify-center rounded-xl" : "w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Premium dark background */}
            <div className={cn("absolute inset-0 bg-gradient-to-br", info.bg)} />
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.04]" />
            <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-30 bg-gradient-to-r", info.gradient)} />

            {/* Close button - Always visible and at the top right of the modal */}
            <button
              onClick={() => !loading && onOpenChange(false)}
              disabled={loading}
              className="absolute top-2 right-2 p-2 text-white/50 hover:text-white transition-colors disabled:opacity-30 rounded-lg hover:bg-white/10 flex items-center justify-center z-[100]"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Content */}
            <div className={cn(
              "relative z-10 flex flex-col items-center w-full",
              inlineOverlay ? "h-full justify-center overflow-y-auto no-scrollbar" : ""
            )}>
              <AnimatePresence mode="wait">
                {!showReward ? (
                  <motion.div
                    key="ad-waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "w-full max-w-sm mx-auto flex flex-col",
                      inlineOverlay ? "p-4 space-y-4" : "p-6 sm:p-8 space-y-6"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("flex flex-col items-center", inlineOverlay ? "gap-2 pt-1" : "gap-4 pt-2")}>
                      <div className="relative">
                        <div className={cn(
                          inlineOverlay ? "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl" : "w-20 h-20 rounded-3xl",
                          "flex items-center justify-center shadow-2xl bg-gradient-to-br",
                          info.iconBg,
                          info.glow
                        )}>
                          <RewardIcon className={cn(inlineOverlay ? "w-7 h-7 sm:w-8 sm:h-8" : "w-10 h-10", "text-white drop-shadow-lg")} />
                        </div>
                        {/* Pulsing ring */}
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                          className={cn("absolute inset-0 bg-gradient-to-br", inlineOverlay ? "rounded-2xl" : "rounded-3xl", info.gradient)}
                        />
                        {/* Badge */}
                        <div className={cn(
                          "absolute -bottom-1 -right-1 bg-black/60 border border-white/10 flex items-center justify-center",
                          inlineOverlay ? "w-5 h-5 sm:w-6 sm:h-6 rounded-lg text-xs" : "w-7 h-7 rounded-xl text-base"
                        )}>
                          {info.emoji}
                        </div>
                      </div>

                      {/* Title + desc */}
                      <div className="text-center space-y-1">
                        <h3 className={cn("font-black text-white tracking-tight", inlineOverlay ? "text-lg sm:text-xl" : "text-xl")}>
                          {info.defaultTitle}
                        </h3>
                        <p className={cn("text-white/60 leading-relaxed max-w-[260px]", inlineOverlay ? "text-xs" : "text-sm")}>
                          {info.defaultDescription}
                        </p>
                      </div>

                      {/* Reward badge */}
                      {!isAvailable || rewardType === 'slot_unlock' ? null : (
                        <div className={cn(
                          "px-5 py-2 rounded-full border text-sm font-black text-white bg-gradient-to-r",
                          info.gradient,
                          info.ring,
                          "ring-1 shadow-lg",
                          info.glow
                        )}>
                          {info.rewardText}
                        </div>
                      )}
                    </div>

                    {/* Progress bar when loading */}
                    <AnimatePresence>
                      {loading && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className={cn("h-full rounded-full bg-gradient-to-r", info.gradient)}
                              initial={{ width: '0%' }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 2.5, ease: 'easeInOut' }}
                            />
                          </div>
                          <p className="text-xs text-center text-white/40">Загрузка рекламы...</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Error / AdBlock notice */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
                        >
                          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-red-300">Не удалось показать рекламу</p>
                            <p className="text-xs text-red-400/80 mt-0.5 leading-relaxed">
                              {error.includes('AdBlock')
                                ? 'Обнаружен AdBlock. Отключи его для этого сайта, чтобы получить награду.'
                                : error}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Buttons */}
                    {!isAvailable ? (
                      /* Premium mode — награда без рекламы */
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Premium активен</p>
                            <p className="text-xs text-white/50">Награды без рекламы</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => onOpenChange(false)}
                          className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-black shadow-xl"
                        >
                          Закрыть
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 w-full relative z-10 w-full pt-1">
                        <Button
                          variant="ghost"
                          onClick={handleShowAd}
                          disabled={loading}
                          className={cn(
                            "w-full rounded-2xl text-white hover:text-white font-black shadow-2xl border-none",
                            "bg-gradient-to-r hover:opacity-90 active:scale-[0.98] transition-all duration-200",
                            "relative overflow-hidden group hover:bg-transparent",
                            inlineOverlay ? "h-12 text-sm" : "h-14 text-sm lg:text-base",
                            info.gradient,
                            info.glow
                          )}
                        >
                          {/* Shimmer */}
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                          {loading ? (
                            <svg className="w-5 h-5 animate-spin relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <span className="relative z-10 flex items-center gap-2">
                              {info.actionText}
                            </span>
                          )}
                        </Button>

                        {secondaryAction && (
                          <div className={cn("border-t border-white/10", inlineOverlay ? "pt-1" : "pt-2")}>
                            <button
                              onClick={secondaryAction.onClick}
                              className={cn(
                                "w-full relative group rounded-xl border border-white/5 hover:border-white/10 bg-black/20 hover:bg-black/30 transition-all flex flex-col items-center justify-center",
                                inlineOverlay ? "py-2 px-3" : "py-3 px-4"
                              )}
                            >
                              <div className={cn("flex items-center gap-1.5 font-bold text-white/90 group-hover:text-amber-400 transition-colors", inlineOverlay ? "text-xs" : "text-sm")}>
                                {secondaryAction.icon}
                                {secondaryAction.text}
                              </div>
                              {secondaryAction.subtext && (
                                <div className="text-[9px] sm:text-[10px] text-white/40 group-hover:text-white/60 transition-colors mt-0.5 max-w-[90%] mx-auto leading-tight text-center">
                                  {secondaryAction.subtext}
                                </div>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* Success state */
                  <motion.div
                    key="ad-success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="p-8 flex flex-col items-center justify-center space-y-5"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                      className="relative"
                    >
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                      </div>
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                          animate={{
                            opacity: 0, scale: 0,
                            x: Math.cos(i * 45 * Math.PI / 180) * 55,
                            y: Math.sin(i * 45 * Math.PI / 180) * 55,
                          }}
                          transition={{ duration: 0.7, delay: 0.15 }}
                          className="absolute top-1/2 left-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-emerald-400 rounded-full"
                        />
                      ))}
                    </motion.div>
                    <div className="text-center space-y-1">
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-black text-emerald-400"
                      >
                        {info.rewardText}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.45 }}
                        className="text-sm text-white/50"
                      >
                        Начислено на твой счёт ✓
                      </motion.p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
