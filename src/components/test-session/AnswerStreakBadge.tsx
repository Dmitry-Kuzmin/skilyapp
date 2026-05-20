/**
 * AnswerStreakBadge — эволюционирующий бейдж серии правильных ответов.
 *
 * Стадии:
 *   seed (1-2)  — зелёная pill с галочкой, частицы уже есть куда лететь
 *   mild (3-4)  — оранжевый flame
 *   warm (5-7)  — красно-оранжевый flame
 *   hot  (8+)   — горячий flame + glow
 *
 * Hit-анимация: реагирует на CustomEvent 'streak-burst-hit',
 * который шлёт StreakParticleBurst в момент прилёта частиц.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useAnimationControls } from "framer-motion";
import { Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type AnswerStreakBadgeProps = {
    streak: number;
    className?: string;
};

type Tier = "seed" | "mild" | "warm" | "hot" | "off";

const TIER_STYLES = {
    seed: {
        bg: "bg-emerald-500/15 dark:bg-emerald-500/20",
        ring: "ring-emerald-500/30",
        text: "text-emerald-600 dark:text-emerald-300",
        icon: "text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]",
        glow: "",
        flash: "rgba(52,211,153,0.5)",
    },
    mild: {
        bg: "bg-orange-500/15 dark:bg-orange-500/20",
        ring: "ring-orange-500/30",
        text: "text-orange-600 dark:text-orange-300",
        icon: "text-orange-500 fill-orange-500/40 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]",
        glow: "",
        flash: "rgba(251,191,36,0.55)",
    },
    warm: {
        bg: "bg-red-500/15 dark:bg-red-500/22",
        ring: "ring-red-500/40",
        text: "text-red-600 dark:text-red-300",
        icon: "text-red-500 fill-red-500/40 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        glow: "shadow-[0_0_18px_-2px_rgba(239,68,68,0.45)]",
        flash: "rgba(251,146,60,0.6)",
    },
    hot: {
        bg: "bg-gradient-to-r from-red-500/25 via-orange-500/25 to-red-500/25",
        ring: "ring-red-500/50",
        text: "text-red-600 dark:text-red-200",
        icon: "text-red-500 fill-orange-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]",
        glow: "shadow-[0_0_24px_-2px_rgba(239,68,68,0.6)]",
        flash: "rgba(248,113,113,0.7)",
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

    const styles = TIER_STYLES[tier];

    const containerControls = useAnimationControls();
    const iconControls = useAnimationControls();
    const [flashKey, setFlashKey] = useState(0);

    useEffect(() => {
        const onHit = () => {
            containerControls.start({
                scale: [1, 1.22, 0.96, 1.04, 1],
                transition: { duration: 0.5, times: [0, 0.22, 0.55, 0.8, 1], ease: "easeOut" },
            });
            iconControls.start({
                rotate: [0, -18, 14, -8, 0],
                scale: [1, 1.35, 0.95, 1.1, 1],
                transition: { duration: 0.55, times: [0, 0.2, 0.5, 0.75, 1], ease: "easeOut" },
            });
            setFlashKey((k) => k + 1);
        };
        window.addEventListener("streak-burst-hit", onHit);
        return () => window.removeEventListener("streak-burst-hit", onHit);
    }, [containerControls, iconControls]);

    return (
        <AnimatePresence>
            {tier !== "off" && styles && (
                <motion.div
                    key={tier}
                    data-streak-target="badge"
                    initial={{ opacity: 0, scale: 0.6, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className={cn(
                        "relative inline-flex items-center gap-1.5 px-2.5 h-9 rounded-full backdrop-blur-md ring-1 shrink-0",
                        styles.bg,
                        styles.ring,
                        styles.glow,
                        className
                    )}
                >
                    {/* Radial flash при попадании частиц */}
                    <AnimatePresence>
                        <motion.span
                            key={flashKey}
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                background: `radial-gradient(circle at 50% 50%, ${styles.flash} 0%, transparent 70%)`,
                            }}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.8, 2.2] }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                    </AnimatePresence>

                    <motion.div
                        animate={containerControls}
                        className="relative z-10 inline-flex items-center gap-1.5"
                    >
                        <motion.span
                            animate={iconControls}
                            className="inline-flex items-center"
                        >
                            {tier === "seed" ? (
                                <Check className={cn("w-4 h-4", styles.icon)} strokeWidth={2.5} />
                            ) : (
                                <Flame className={cn("w-4 h-4", styles.icon)} />
                            )}
                        </motion.span>
                        <motion.span
                            key={streak}
                            initial={{ scale: 0.6, y: 4, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 16 }}
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
