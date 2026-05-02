import { useState, useEffect } from 'react';
import { Cpu, Zap, Clock, Sparkles, Coins, Play } from 'lucide-react';
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

interface CryptoMinerAdvancedProps {
    className?: string;
    onRewardClaimed?: () => void;
}

/**
 * 🚀 CRYPTO MINER V3 - Premium Edition
 * Баннер для заработка монет за просмотр рекламы
 */
export function CryptoMinerAdvanced({ className, onRewardClaimed }: CryptoMinerAdvancedProps) {
    const { profileId } = useUserContext();
    const queryClient = useQueryClient();
    const [showAdModal, setShowAdModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const {
        canWatch,
        nextAvailableAt,
        dailyCount = 0,
        dailyLimit = 5,
        refetch
    } = useAdRewardStatus(
        profileId,
        'coins',
        {
            enabled: !!profileId,
            dailyLimit: 5,
            cooldownMinutes: 60,
        }
    );

    useEffect(() => {
        if (!showAdModal && profileId) {
            const timer = setTimeout(() => refetch(), 500);
            return () => clearTimeout(timer);
        }
    }, [showAdModal, profileId, refetch]);

    const handleWatchAd = () => {
        if (!profileId) {
            toast({ title: 'Ошибка', description: 'Необходимо войти в систему', variant: 'destructive' });
            return;
        }
        if (!canWatch) {
            if (dailyCount >= dailyLimit) {
                toast({ title: '⚡ Дневной лимит', description: 'Майнер перегрелся! Возвращайся завтра.' });
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
            const { data, error } = await supabase.functions.invoke('claim-ad-reward', {
                body: { user_id: profileId, reward_type: 'coins', reward_amount: 25 }
            });
            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Ошибка майнинга');

            await queryClient.refetchQueries({ queryKey: ['profile-data', profileId] });
            await refetch();

            sounds.correctAnswer();
            haptics.boostActivated();
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);
            onRewardClaimed?.();
            toast({ title: '⚡ CRYPTO MINED!', description: '+25 монет добыто!' });
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
                className={cn("relative overflow-hidden rounded-2xl", className)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <motion.button
                    onClick={handleWatchAd}
                    disabled={loading || isDailyLimitReached}
                    whileHover={canWatch ? { scale: 1.005 } : {}}
                    whileTap={canWatch ? { scale: 0.995 } : {}}
                    className={cn(
                        "relative w-full overflow-hidden rounded-2xl text-left",
                        "transition-all duration-300",
                        canWatch
                            ? "bg-[#0d0618] shadow-[0_8px_40px_rgba(109,40,217,0.4)]"
                            : "bg-[#111827] shadow-lg",
                        "disabled:cursor-not-allowed"
                    )}
                >
                    {/* Deep gradient overlay */}
                    <div className={cn(
                        "absolute inset-0 transition-opacity duration-500",
                        canWatch
                            ? "bg-gradient-to-br from-violet-900/60 via-purple-900/40 to-indigo-900/60"
                            : "bg-gradient-to-br from-slate-800/80 to-slate-900/80"
                    )} />

                    {/* Subtle grid pattern */}
                    <div className="absolute inset-0 opacity-[0.04]" style={{
                        backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                        backgroundSize: '28px 28px'
                    }} />

                    {/* Glow orb */}
                    {canWatch && (
                        <motion.div
                            className="absolute -top-8 -right-8 w-48 h-48 bg-violet-600/30 rounded-full blur-3xl pointer-events-none"
                            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    )}

                    {/* Shimmer on hover */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.06] to-white/0 pointer-events-none"
                        animate={{ x: isHovered && canWatch ? ['-100%', '200%'] : '-100%' }}
                        transition={{ duration: 1.2, ease: 'easeInOut' }}
                        style={{ width: '60%' }}
                    />

                    {/* Content */}
                    <div className="relative z-10 flex items-center gap-3 p-4 sm:p-5">
                        {/* Icon */}
                        <div className={cn(
                            "relative flex-shrink-0 flex items-center justify-center rounded-xl",
                            "w-12 h-12 sm:w-14 sm:h-14",
                            canWatch
                                ? "bg-white/10 border border-white/20 shadow-inner"
                                : "bg-white/5 border border-white/10"
                        )}>
                            {canWatch && (
                                <motion.div
                                    className="absolute inset-0 rounded-xl border border-violet-400/40"
                                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.1, 0.6] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}
                            {isOnCooldown ? (
                                <Clock className="w-6 h-6 text-white/50" />
                            ) : isDailyLimitReached ? (
                                <Zap className="w-6 h-6 text-white/30" />
                            ) : (
                                <motion.div
                                    animate={{ rotate: [0, 8, -8, 0] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <Cpu className="w-6 h-6 sm:w-7 sm:h-7 text-violet-300" />
                                </motion.div>
                            )}
                        </div>

                        {/* Main text */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-white font-black text-sm sm:text-base tracking-widest uppercase">
                                    Crypto Miner
                                </span>
                                {canWatch && (
                                    <motion.span
                                        className="hidden xs:inline-flex px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black rounded-full uppercase tracking-wider"
                                        animate={{ opacity: [1, 0.6, 1] }}
                                        transition={{ duration: 1.8, repeat: Infinity }}
                                    >
                                        READY
                                    </motion.span>
                                )}
                            </div>
                            <p className="text-white/50 text-[11px] font-medium leading-tight">
                                {isDailyLimitReached
                                    ? 'Лимит исчерпан — вернись завтра'
                                    : isOnCooldown
                                        ? `Доступно через ${timeUntilAvailable}`
                                        : 'Смотри рекламу — получай монеты'
                                }
                            </p>

                            {/* Progress dots */}
                            <div className="flex items-center gap-1.5 mt-2">
                                {[...Array(dailyLimit)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1 rounded-full transition-all duration-300",
                                            i < remainingWatches
                                                ? "w-4 bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]"
                                                : "w-3 bg-white/15"
                                        )}
                                    />
                                ))}
                                <span className="text-[9px] text-white/30 font-mono ml-0.5">
                                    {remainingWatches}/{dailyLimit}
                                </span>
                            </div>
                        </div>

                        {/* Right: Reward + CTA */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                            <div className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl",
                                canWatch
                                    ? "bg-yellow-400/15 border border-yellow-400/25"
                                    : "bg-white/5 border border-white/10"
                            )}>
                                <Coins className={cn("w-4 h-4", canWatch ? "text-yellow-300" : "text-white/30")} />
                                <span className={cn(
                                    "font-black text-base sm:text-lg tabular-nums",
                                    canWatch ? "text-yellow-200" : "text-white/30"
                                )}>+25</span>
                            </div>
                            {canWatch && (
                                <motion.div
                                    className="flex items-center gap-1 text-violet-300 text-[10px] font-bold"
                                    animate={{ x: [0, 2, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Смотреть</span>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.button>

                {/* Success overlay */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-[#0d0618]/95 backdrop-blur-sm z-20 rounded-2xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {[...Array(10)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full"
                                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                    animate={{
                                        x: Math.cos(i * 36 * Math.PI / 180) * 70,
                                        y: Math.sin(i * 36 * Math.PI / 180) * 45,
                                        opacity: 0, scale: 0
                                    }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                />
                            ))}
                            <motion.div
                                className="flex flex-col items-center gap-2"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.2, opacity: 0 }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                <Sparkles className="w-10 h-10 text-yellow-300" />
                                <span className="text-white font-black text-2xl tracking-wider">+25 MINED</span>
                                <span className="text-violet-400 text-xs font-mono uppercase tracking-widest">Block confirmed</span>
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
                allowForPremium
            />
        </>
    );
}
