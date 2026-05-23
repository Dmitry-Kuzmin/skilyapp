/**
 * AnswerStreakBadge — бейдж серии правильных ответов.
 *
 * Всегда показывает 🔥 (огонёк), градиентный фон нарастает с ростом стрика.
 * Вау-анимация: spring-bounce при маунте, pulse-ring при каждом новом ответе.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useAnimationControls } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type AnswerStreakBadgeProps = {
    streak: number;
    className?: string;
};

type Tier = "seed" | "mild" | "warm" | "hot" | "off";

const TIER_CONFIG = {
    seed: {
        bg:     "bg-gradient-to-r from-amber-400/90 to-orange-500/90",
        ring:   "ring-orange-400/50",
        glow:   "shadow-[0_0_12px_2px_rgba(251,146,60,0.45)]",
        icon:   "text-white drop-shadow-[0_0_6px_rgba(253,186,36,0.9)]",
        text:   "text-white",
        pulse:  "bg-orange-400",
        flash:  "rgba(251,146,60,0.6)",
    },
    mild: {
        bg:     "bg-gradient-to-r from-orange-500/90 to-red-500/85",
        ring:   "ring-orange-500/50",
        glow:   "shadow-[0_0_16px_3px_rgba(249,115,22,0.5)]",
        icon:   "text-white drop-shadow-[0_0_8px_rgba(253,186,36,1)]",
        text:   "text-white",
        pulse:  "bg-orange-500",
        flash:  "rgba(249,115,22,0.65)",
    },
    warm: {
        bg:     "bg-gradient-to-r from-red-500/90 to-rose-600/90",
        ring:   "ring-red-500/60",
        glow:   "shadow-[0_0_20px_4px_rgba(239,68,68,0.55)]",
        icon:   "text-white fill-orange-300/50 drop-shadow-[0_0_10px_rgba(253,186,36,1)]",
        text:   "text-white",
        pulse:  "bg-red-500",
        flash:  "rgba(239,68,68,0.7)",
    },
    hot: {
        bg:     "bg-gradient-to-r from-rose-600/95 via-red-500/95 to-orange-500/90",
        ring:   "ring-red-400/70",
        glow:   "shadow-[0_0_28px_6px_rgba(220,38,38,0.65)]",
        icon:   "text-yellow-200 fill-orange-400/60 drop-shadow-[0_0_12px_rgba(253,224,71,1)]",
        text:   "text-yellow-100",
        pulse:  "bg-rose-500",
        flash:  "rgba(248,113,113,0.75)",
    },
    off: null,
} as const;

export const AnswerStreakBadge = ({ streak, className }: AnswerStreakBadgeProps) => {
    const tier = useMemo((): Tier => {
        if (streak >= 8) return "hot";
        if (streak >= 5) return "warm";
        if (streak >= 3) return "mild";
        if (streak >= 1) return "seed";
        return "off";
    }, [streak]);

    const styles = TIER_CONFIG[tier];

    const badgeControls = useAnimationControls();
    const iconControls = useAnimationControls();
    const [flashKey, setFlashKey] = useState(0);
    const [pulseKey, setPulseKey] = useState(0);
    const prevStreakRef = useRef(streak);

    // Animate on streak increment
    useEffect(() => {
        const prev = prevStreakRef.current;
        prevStreakRef.current = streak;
        if (streak <= prev || streak < 1) return;

        badgeControls.start({
            scale: [1, 1.28, 0.93, 1.08, 1],
            transition: { duration: 0.5, times: [0, 0.2, 0.5, 0.75, 1], ease: "easeOut" },
        });
        iconControls.start({
            rotate: [0, -22, 18, -10, 0],
            scale:  [1, 1.4, 0.9, 1.12, 1],
            transition: { duration: 0.55, times: [0, 0.2, 0.5, 0.75, 1], ease: "easeOut" },
        });
        setFlashKey(k => k + 1);
        setPulseKey(k => k + 1);
    }, [streak, badgeControls, iconControls]);

    // Also react to streak-burst-hit event from StreakParticleBurst
    useEffect(() => {
        const onHit = () => {
            badgeControls.start({
                scale: [1, 1.22, 0.96, 1.04, 1],
                transition: { duration: 0.45, ease: "easeOut" },
            });
            iconControls.start({
                rotate: [0, -15, 12, -6, 0],
                transition: { duration: 0.5, ease: "easeOut" },
            });
            setFlashKey(k => k + 1);
        };
        window.addEventListener("streak-burst-hit", onHit);
        return () => window.removeEventListener("streak-burst-hit", onHit);
    }, [badgeControls, iconControls]);

    return (
        <AnimatePresence>
            {tier !== "off" && styles && (
                <motion.div
                    key="streak-badge"
                    data-streak-target="badge"
                    initial={{ opacity: 0, scale: 0.4, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.4, y: -6 }}
                    transition={{ type: "spring", stiffness: 400, damping: 16 }}
                    className={cn(
                        "relative inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full backdrop-blur-md ring-1 shrink-0 overflow-hidden",
                        styles.bg,
                        styles.ring,
                        styles.glow,
                        className
                    )}
                >
                    {/* Radial flash на попадание */}
                    <AnimatePresence>
                        <motion.span
                            key={flashKey}
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                background: `radial-gradient(circle at 50% 50%, ${styles.flash} 0%, transparent 65%)`,
                            }}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 2.5] }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                        />
                    </AnimatePresence>

                    {/* Pulse ring — расходящееся кольцо */}
                    <AnimatePresence>
                        <motion.span
                            key={pulseKey}
                            className={cn("absolute inset-0 rounded-full pointer-events-none opacity-60", styles.pulse)}
                            initial={{ opacity: 0.5, scale: 1 }}
                            animate={{ opacity: 0, scale: 2.4 }}
                            exit={{}}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                    </AnimatePresence>

                    {/* Content */}
                    <motion.div
                        animate={badgeControls}
                        className="relative z-10 inline-flex items-center gap-1"
                    >
                        <motion.span animate={iconControls} className="inline-flex items-center">
                            <Flame className={cn("w-3.5 h-3.5", styles.icon)} />
                        </motion.span>
                        <motion.span
                            key={streak}
                            initial={{ scale: 0.5, y: 4, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 600, damping: 18 }}
                            className={cn(
                                "font-black tabular-nums leading-none text-[13px] tracking-tight",
                                styles.text
                            )}
                        >
                            {streak}
                        </motion.span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
