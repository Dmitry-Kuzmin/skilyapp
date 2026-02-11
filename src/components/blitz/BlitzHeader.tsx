import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { triggerHapticFeedback } from '@/lib/telegram';

interface FloatingLabel {
    id: string;
    text: string;
    type: 'correct' | 'wrong';
}

interface BlitzHeaderProps {
    timeLeft: number;
    currentIndex: number;
    totalQuestions: number;
    onClose: () => void;
    maxTime?: number;
    streak?: number;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getComboText = (streak: number): { text: string; icon: string; isSuper: boolean } | null => {
    if (streak < 2) return null;
    if (streak >= 5) return { text: `${streak} SUPER COMBO`, icon: '⚡️', isSuper: true };
    return { text: `${streak} Combo`, icon: '🔥', isSuper: false };
};

export const BlitzHeader = memo(({
    timeLeft,
    currentIndex,
    totalQuestions,
    onClose,
    maxTime = 90,
    streak = 0,
}: BlitzHeaderProps) => {
    const [prevTimeLeft, setPrevTimeLeft] = useState(timeLeft);
    const [floatingLabels, setFloatingLabels] = useState<FloatingLabel[]>([]);
    const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
    const [comboExploding, setComboExploding] = useState(false);
    const [prevStreak, setPrevStreak] = useState(streak);

    const isCritical = timeLeft <= 10 && timeLeft > 0;
    const progressPercent = Math.min(100, (timeLeft / maxTime) * 100);
    const comboInfo = getComboText(streak);

    // Detect combo break
    useEffect(() => {
        if (prevStreak >= 2 && streak === 0) {
            setComboExploding(true);
            setTimeout(() => setComboExploding(false), 500);
        }
        setPrevStreak(streak);
    }, [streak, prevStreak]);

    // Heartbeat haptic
    useEffect(() => {
        if (isCritical) {
            triggerHapticFeedback('light');
        }
    }, [timeLeft, isCritical]);

    // Floating labels on time change
    useEffect(() => {
        const diff = timeLeft - prevTimeLeft;

        if (diff !== 0 && diff !== -1) {
            const isCorrect = diff > 0;
            const labelText = isCorrect ? `+${diff}s` : `${diff}s`;

            const newLabel: FloatingLabel = {
                id: `${Date.now()}-${Math.random()}`,
                text: labelText,
                type: isCorrect ? 'correct' : 'wrong',
            };

            setFloatingLabels(prev => [...prev, newLabel]);
            setFlashColor(isCorrect ? 'green' : 'red');

            setTimeout(() => setFlashColor(null), 400);
            setTimeout(() => {
                setFloatingLabels(prev => prev.filter(l => l.id !== newLabel.id));
            }, 1000);
        }

        setPrevTimeLeft(timeLeft);
    }, [timeLeft, prevTimeLeft]);

    return (
        <>
            {/* Edge-to-edge Progress Bar (The Fuse) */}
            <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-slate-200 dark:bg-slate-800/80">
                <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600"
                    style={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                />
                <motion.div
                    className="absolute top-0 h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 blur-sm opacity-60"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Timer HUD - Floating above the Glass Card */}
            <div className="relative flex flex-col items-center pt-4 pb-2">
                {/* Ambient Glow behind timer */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: isCritical
                            ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.15) 0%, transparent 70%)'
                            : 'radial-gradient(ellipse at center, rgba(6,182,212,0.1) 0%, transparent 70%)'
                    }}
                />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    type="button"
                    className="absolute left-2 sm:left-4 top-4 w-10 h-10 rounded-full bg-white/20 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white transition-all z-[60] shadow-lg hover:scale-110 active:scale-95"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Question Counter */}
                <div className="absolute right-0 top-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 backdrop-blur-sm border border-slate-200 dark:border-white/10 z-10">
                    <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{currentIndex + 1}</span>
                    <span className="text-slate-400 dark:text-white/40">/</span>
                    <span className="text-sm text-slate-500 dark:text-white/50">{totalQuestions}</span>
                </div>

                {/* The Timer */}
                <div className="relative flex items-center justify-center">
                    <motion.div
                        className={cn(
                            "text-7xl sm:text-8xl font-black tabular-nums tracking-tight transition-all duration-200",
                            flashColor === 'green' && "text-emerald-500 dark:text-emerald-400",
                            flashColor === 'red' && "text-red-600 dark:text-red-500",
                            !flashColor && (isCritical ? "text-red-600 dark:text-red-500" : "text-slate-900 dark:text-white"),
                            isCritical && "animate-pulse"
                        )}
                        style={{
                            textShadow: isCritical
                                ? '0 0 40px rgba(239,68,68,0.7), 0 0 80px rgba(239,68,68,0.3)'
                                : '0 0 40px rgba(6,182,212,0.5), 0 0 80px rgba(6,182,212,0.2)',
                        }}
                    >
                        {formatTime(timeLeft)}
                    </motion.div>

                    {/* Floating Labels - Positioned OUTSIDE the timer */}
                    <AnimatePresence>
                        {floatingLabels.map(label => (
                            <motion.div
                                key={label.id}
                                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                                animate={{
                                    opacity: 0,
                                    y: label.type === 'correct' ? -50 : 50,
                                    scale: 1.2
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={cn(
                                    "absolute -right-20 top-1/2 -translate-y-1/2 font-black text-3xl sm:text-4xl tabular-nums whitespace-nowrap",
                                    label.type === 'correct'
                                        ? "text-emerald-400"
                                        : "text-red-500"
                                )}
                                style={{
                                    textShadow: label.type === 'correct'
                                        ? '0 0 20px rgba(52,211,153,0.8)'
                                        : '0 0 20px rgba(239,68,68,0.8)',
                                }}
                            >
                                {label.text}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Combo Meter - Below timer, above card */}
                <div className="h-8 flex items-center justify-center mt-1">
                    <AnimatePresence mode="wait">
                        {comboExploding ? (
                            <motion.div
                                key="explode"
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 2, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                                className="text-red-500 font-black text-base"
                            >
                                💥 COMBO LOST
                            </motion.div>
                        ) : comboInfo ? (
                            <motion.div
                                key={`combo-${streak}`}
                                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                                animate={{
                                    scale: comboInfo.isSuper ? [1, 1.08, 1] : 1,
                                    opacity: 1,
                                    y: 0
                                }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{
                                    duration: 0.3,
                                    scale: comboInfo.isSuper ? { repeat: Infinity, duration: 0.5 } : {}
                                }}
                                className={cn(
                                    "flex items-center gap-2 font-black italic",
                                    comboInfo.isSuper
                                        ? "text-xl bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-lg"
                                        : "text-base text-orange-400"
                                )}
                            >
                                <span className="text-2xl">{comboInfo.icon}</span>
                                <span>{comboInfo.text}</span>
                            </motion.div>
                        ) : (
                            <div className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400 dark:text-white/20">
                                Time Attack
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Critical Vignette */}
            <AnimatePresence>
                {isCritical && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.15, 0.3, 0.15] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="fixed inset-0 pointer-events-none z-20"
                        style={{
                            background: 'radial-gradient(circle at center, transparent 40%, rgba(220,38,38,0.4) 100%)',
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
});

BlitzHeader.displayName = 'BlitzHeader';

export default BlitzHeader;
