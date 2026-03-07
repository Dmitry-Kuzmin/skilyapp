import { useState, useEffect, useRef } from 'react';
import { Cpu, Zap, Clock, Sparkles, Coins, Play, ChevronRight, TrendingUp, Gift } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { useAdRewardStatus } from '@/hooks/useAdRewardStatus';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { isTelegramMiniApp } from '@/lib/telegram';

interface CryptoMinerAdvancedProps {
    className?: string;
}

/**
 * 🚀 CRYPTO MINER V3 - Premium Edition
 * Премиальный баннер для заработка монет за рекламу
 * Отлично смотрится как в темной, так и в светлой теме
 */
export function CryptoMinerAdvanced({ className }: CryptoMinerAdvancedProps) {
    const { profileId } = useUserContext();
    const queryClient = useQueryClient();
    const [showAdModal, setShowAdModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Статус рекламы
    const {
        canWatch,
        nextAvailableAt,
        dailyCount = 0,
        dailyLimit = 5,
        cooldownMinutes = 60,
        refetch
    } = useAdRewardStatus(
        profileId,
        'coins',
        {
            enabled: !!profileId,
            dailyLimit: 5,
            cooldownMinutes: 60,
            // refetchInterval убран для экономии Edge Requests
        }
    );

    useEffect(() => {
        if (!showAdModal && profileId) {
            const timer = setTimeout(() => refetch(), 500);
            return () => clearTimeout(timer);
        }
    }, [showAdModal, profileId, refetch]);

    const handleWatchAd = async () => {
        if (!profileId) {
            toast({ title: 'Ошибка', description: 'Необходимо войти в систему', variant: 'destructive' });
            return;
        }

        if (!canWatch) {
            if (dailyCount >= dailyLimit) {
                toast({ title: '⚡ Дневной лимит', description: `Майнер перегрелся! Возвращайся завтра.` });
            } else if (nextAvailableAt) {
                const minutes = Math.ceil((nextAvailableAt.getTime() - Date.now()) / 60000);
                toast({ title: '🔄 Охлаждение', description: `Майнер остывает... ${minutes} мин` });
            }
            haptics.wrongAnswer();
            return;
        }

        haptics.buttonClick();
        setShowAdModal(true);
    };

    const handleRewardClaimed = async () => {
        setLoading(true);
        try {
            // Для Telegram мы НЕ вызываем claim-ad-reward вручную, 
            // так как это делает сервер Adsgram через S2S callback.
            // Мы только оповещаем UI об успехе, если это не Telegram.
            // Начисляем монеты через Edge Function (с проверкой ограничений)
            const { data, error } = await supabase.functions.invoke('claim-ad-reward', {
                body: { user_id: profileId, reward_type: 'coins', reward_amount: 25 }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Ошибка майнинга');

            await queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });
            await refetch();

            sounds.correctAnswer();
            haptics.boostActivated();

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);

            toast({ title: '⚡ CRYPTO MINED!', description: `+25 монет добыто!` });
        } catch (err: any) {
            console.error('[CryptoMinerAdvanced] Error:', err);
            toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getTimeUntilAvailable = () => {
        if (!nextAvailableAt) return null;
        const diff = nextAvailableAt.getTime() - Date.now();
        if (diff <= 0) return null;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const timeUntilAvailable = getTimeUntilAvailable();
    const isOnCooldown = !!timeUntilAvailable;
    const isDailyLimitReached = dailyCount >= dailyLimit;
    const remainingWatches = dailyLimit - dailyCount;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={cn("relative overflow-hidden", className)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Основной контейнер */}
                <motion.button
                    onClick={handleWatchAd}
                    disabled={loading || isDailyLimitReached}
                    whileHover={canWatch ? { scale: 1.01 } : {}}
                    whileTap={canWatch ? { scale: 0.99 } : {}}
                    className={cn(
                        "relative w-full overflow-hidden rounded-2xl",
                        "transition-all duration-300",
                        // Градиенты для темной и светлой темы
                        canWatch
                            ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-600 dark:via-purple-600 dark:to-indigo-600"
                            : "bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-700 dark:to-slate-800",
                        // Тень
                        canWatch
                            ? "shadow-[0_8px_32px_rgba(139,92,246,0.35)] dark:shadow-[0_8px_32px_rgba(139,92,246,0.4)]"
                            : "shadow-lg",
                        "disabled:cursor-not-allowed"
                    )}
                >
                    {/* Анимированный фоновый блик */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0"
                        animate={{
                            x: isHovered && canWatch ? ['0%', '200%'] : '0%',
                        }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                        style={{ width: '50%', left: '-25%' }}
                    />

                    {/* Декоративные элементы */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                    {/* Контент */}
                    <div className="relative flex items-center justify-between p-4 sm:p-5">
                        {/* Левая часть */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            {/* Иконка */}
                            <div className={cn(
                                "relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl",
                                "bg-white/20 backdrop-blur-sm",
                                "border border-white/30"
                            )}>
                                {/* Анимированное кольцо для активного состояния */}
                                {canWatch && (
                                    <motion.div
                                        className="absolute inset-0 rounded-xl border-2 border-white/50"
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            opacity: [0.5, 0.2, 0.5],
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                )}

                                {isOnCooldown ? (
                                    <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-white/80" />
                                ) : isDailyLimitReached ? (
                                    <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white/60" />
                                ) : (
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        <Cpu className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Текст */}
                            <div className="text-left">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-bold text-base sm:text-lg tracking-wide drop-shadow-sm">
                                        CRYPTO MINER
                                    </span>
                                    {canWatch && (
                                        <motion.span
                                            className="px-2 py-0.5 bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold rounded-full uppercase tracking-wider"
                                            animate={{ opacity: [1, 0.7, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            Ready
                                        </motion.span>
                                    )}
                                </div>

                                <div className="text-white/80 text-xs sm:text-sm font-medium">
                                    {isDailyLimitReached ? (
                                        <span className="text-white/60">Лимит исчерпан на сегодня</span>
                                    ) : isOnCooldown ? (
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            Доступно через {timeUntilAvailable}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <Gift className="w-3.5 h-3.5" />
                                            Смотри рекламу — получай монеты
                                        </span>
                                    )}
                                </div>

                                {/* Счётчик оставшихся просмотров */}
                                <div className="flex items-center gap-2 mt-2">
                                    {[...Array(dailyLimit)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className={cn(
                                                "w-2 h-2 rounded-full",
                                                i < remainingWatches
                                                    ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                                                    : "bg-white/30"
                                            )}
                                            initial={false}
                                            animate={i === remainingWatches - 1 && canWatch ? {
                                                scale: [1, 1.3, 1],
                                            } : {}}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />
                                    ))}
                                    <span className="text-[10px] text-white/60 ml-1">
                                        {remainingWatches} осталось
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Правая часть - награда */}
                        <div className="flex flex-col items-end gap-2">
                            <motion.div
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                                    "bg-white/20 backdrop-blur-sm",
                                    "border border-white/30",
                                    canWatch && "shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
                                )}
                                whileHover={canWatch ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.3)' } : {}}
                            >
                                <Coins className="w-5 h-5 text-yellow-300 drop-shadow-sm" />
                                <span className="text-white font-bold text-lg sm:text-xl drop-shadow-sm">+25</span>
                            </motion.div>

                            {canWatch && (
                                <motion.div
                                    className="flex items-center gap-1 text-[11px] text-white/80 font-medium"
                                    animate={{ x: [0, 3, 0] }}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Смотреть</span>
                                    <ChevronRight className="w-3 h-3" />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.button>

                {/* Анимация успешного майнинга */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-violet-600/95 via-purple-600/95 to-indigo-600/95 backdrop-blur-sm z-20 rounded-2xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Частицы */}
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                                    initial={{
                                        x: 0,
                                        y: 0,
                                        opacity: 1,
                                        scale: 1
                                    }}
                                    animate={{
                                        x: Math.cos(i * 30 * Math.PI / 180) * 80,
                                        y: Math.sin(i * 30 * Math.PI / 180) * 50,
                                        opacity: 0,
                                        scale: 0
                                    }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                            ))}

                            <motion.div
                                className="flex flex-col items-center gap-2"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.2, opacity: 0 }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                <motion.div
                                    animate={{ rotate: [0, 15, -15, 0] }}
                                    transition={{ duration: 0.5, repeat: 2 }}
                                >
                                    <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-300 drop-shadow-lg" />
                                </motion.div>
                                <span className="text-white font-bold text-xl sm:text-2xl drop-shadow-lg">+25 MINED!</span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <RewardedAdModal
                open={showAdModal}
                onOpenChange={setShowAdModal}
                rewardType="coins"
                rewardAmount={25}
                onRewardClaimed={handleRewardClaimed}
                title="⚡ CRYPTO MINER"
                description="Добывай криптомонеты! Смотри рекламу и получай награду."
            />
        </>
    );
}
