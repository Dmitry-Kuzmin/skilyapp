import { useState, useEffect, useRef } from 'react';
import { Cpu, Zap, Clock, Sparkles, Coins, Volume2, Play, ChevronRight } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { useAdRewardStatus } from '@/hooks/useAdRewardStatus';
import { motion, AnimatePresence } from 'framer-motion';

interface CryptoMinerAdvancedProps {
    className?: string;
}

/**
 * 🚀 CRYPTO MINER V2 - Advanced Edition
 * Футуристический баннер для заработка монет за рекламу
 * С анимированными частицами, неоновыми эффектами и прогресс-индикаторами
 */
export function CryptoMinerAdvanced({ className }: CryptoMinerAdvancedProps) {
    const { profileId } = useUserContext();
    const queryClient = useQueryClient();
    const [showAdModal, setShowAdModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
            refetchInterval: 30000,
        }
    );

    // Анимация частиц на canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            alpha: number;
            color: string;
        }> = [];

        const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#ffffff'];

        const createParticle = () => {
            return {
                x: Math.random() * canvas.width,
                y: canvas.height + 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 1.5 - 0.5,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.3,
                color: colors[Math.floor(Math.random() * colors.length)],
            };
        };

        // Инициализация частиц
        for (let i = 0; i < 15; i++) {
            const p = createParticle();
            p.y = Math.random() * canvas.height;
            particles.push(p);
        }

        let animationId: number;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.003;

                if (p.y < -10 || p.alpha <= 0) {
                    particles[index] = createParticle();
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, []);

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
                toast({
                    title: '⚡ Дневной лимит',
                    description: `Майнер перегрелся! Возвращайся завтра.`,
                });
            } else if (nextAvailableAt) {
                const minutes = Math.ceil((nextAvailableAt.getTime() - Date.now()) / 60000);
                toast({
                    title: '🔄 Охлаждение',
                    description: `Майнер остывает... ${minutes} мин до готовности`,
                });
            }
            haptics.wrongAnswer();
            return;
        }

        haptics.buttonPress();
        setShowAdModal(true);
    };

    const handleRewardClaimed = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('claim-ad-reward', {
                body: { user_id: profileId, reward_type: 'coins', reward_amount: 50 }
            });

            if (error) throw error;

            if (data.success) {
                await queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });
                await refetch();

                sounds.correctAnswer();
                haptics.boostActivated();

                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);

                toast({
                    title: '⚡ CRYPTO MINED!',
                    description: `+50 монет добыто! (${data.daily_count}/${data.daily_limit})`,
                });
            } else {
                throw new Error(data.error || 'Ошибка майнинга');
            }
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
    const progressPercent = ((dailyLimit - dailyCount) / dailyLimit) * 100;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("relative overflow-hidden rounded-2xl", className)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Фоновый градиент */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-yellow-900/40" />

                {/* Анимированные частицы */}
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
                />

                {/* Неоновое свечение при наведении */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0"
                    animate={{
                        opacity: isHovered ? 1 : 0,
                        x: isHovered ? ['-100%', '100%'] : '-100%',
                    }}
                    transition={{
                        opacity: { duration: 0.3 },
                        x: { duration: 1.5, ease: 'linear', repeat: Infinity },
                    }}
                />

                {/* Пульсирующая рамка */}
                <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-yellow-500/30"
                    animate={{
                        borderColor: canWatch
                            ? ['rgba(251, 191, 36, 0.3)', 'rgba(251, 191, 36, 0.6)', 'rgba(251, 191, 36, 0.3)']
                            : 'rgba(251, 191, 36, 0.1)',
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Основной контент */}
                <button
                    onClick={handleWatchAd}
                    disabled={loading || isDailyLimitReached}
                    className={cn(
                        "relative w-full p-4 sm:p-5",
                        "flex items-center justify-between gap-4",
                        "transition-all duration-300",
                        "disabled:cursor-not-allowed",
                        canWatch && "hover:scale-[1.01] active:scale-[0.99]"
                    )}
                >
                    {/* Левая часть - иконка и статус */}
                    <div className="flex items-center gap-3 sm:gap-4 z-10">
                        {/* Анимированная иконка майнера */}
                        <motion.div
                            className={cn(
                                "relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl",
                                "bg-gradient-to-br from-yellow-500/30 to-amber-600/30",
                                "flex items-center justify-center",
                                "border border-yellow-500/40",
                                "shadow-lg shadow-yellow-500/20"
                            )}
                            animate={canWatch ? {
                                boxShadow: [
                                    '0 0 20px rgba(251, 191, 36, 0.2)',
                                    '0 0 30px rgba(251, 191, 36, 0.4)',
                                    '0 0 20px rgba(251, 191, 36, 0.2)',
                                ],
                            } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {/* Вращающийся фоновый элемент */}
                            <motion.div
                                className="absolute inset-2 rounded-lg bg-gradient-to-br from-yellow-400/20 to-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                            />

                            {isOnCooldown ? (
                                <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-400/60" />
                            ) : isDailyLimitReached ? (
                                <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-400/40" />
                            ) : (
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    <Cpu className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-400" />
                                </motion.div>
                            )}

                            {/* Блики */}
                            <div className="absolute top-1 right-1 w-2 h-2 bg-white/30 rounded-full blur-sm" />
                        </motion.div>

                        {/* Текст и статус */}
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-base sm:text-lg tracking-wide">
                                    CRYPTO MINER
                                </span>
                                {canWatch && (
                                    <motion.span
                                        className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase"
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        Ready
                                    </motion.span>
                                )}
                            </div>

                            <div className="text-xs sm:text-sm text-yellow-500/80 font-medium mt-0.5">
                                {isDailyLimitReached ? (
                                    <span className="text-red-400/80">Лимит исчерпан на сегодня</span>
                                ) : isOnCooldown ? (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Остывает: {timeUntilAvailable}
                                    </span>
                                ) : (
                                    <span className="text-green-400/80">Смотри рекламу → получай монеты</span>
                                )}
                            </div>

                            {/* Прогресс бар */}
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-20 sm:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <span className="text-[10px] text-white/50 font-mono">
                                    {dailyLimit - dailyCount}/{dailyLimit}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Правая часть - награда */}
                    <div className="flex flex-col items-end gap-1 z-10">
                        <motion.div
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl",
                                "bg-gradient-to-r from-yellow-500/20 to-amber-500/20",
                                "border border-yellow-500/30"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Coins className="w-5 h-5 text-yellow-400" />
                            <span className="text-white font-bold text-lg">+50</span>
                        </motion.div>

                        {canWatch && (
                            <motion.div
                                className="flex items-center gap-1 text-[10px] text-yellow-400/70 font-medium"
                                animate={{ x: [0, 3, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Watch Ad</span>
                                <ChevronRight className="w-3 h-3" />
                            </motion.div>
                        )}
                    </div>
                </button>

                {/* Эффект успешного майнинга */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="flex flex-col items-center gap-2"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.5, opacity: 0 }}
                            >
                                <Sparkles className="w-12 h-12 text-yellow-400" />
                                <span className="text-yellow-400 font-bold text-xl">+50 MINED!</span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <RewardedAdModal
                open={showAdModal}
                onOpenChange={setShowAdModal}
                rewardType="coins"
                rewardAmount={50}
                onRewardClaimed={handleRewardClaimed}
                title="⚡ CRYPTO MINER"
                description="Добывай криптомонеты! Смотри рекламу и получай награду."
            />
        </>
    );
}
