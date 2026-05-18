/**
 * AnswerStreakBadge — плавающий бейдж серии правильных ответов.
 * Появляется при streak >= 3, скрывается на ошибке.
 * Цветовые уровни: orange (3-4), deep-orange (5-7), red+glow (8+).
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type AnswerStreakBadgeProps = {
    streak: number;
    className?: string;
};

export const AnswerStreakBadge = ({ streak, className }: AnswerStreakBadgeProps) => {
    const tier = useMemo(() => {
        if (streak >= 8) return "hot" as const;
        if (streak >= 5) return "warm" as const;
        if (streak >= 3) return "mild" as const;
        return "off" as const;
    }, [streak]);

    const styles = {
        mild: {
            bg: "bg-orange-500/15 dark:bg-orange-500/20",
            ring: "ring-orange-500/30",
            text: "text-orange-600 dark:text-orange-300",
            flame: "text-orange-500 fill-orange-500/40 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]",
            glow: "",
        },
        warm: {
            bg: "bg-red-500/15 dark:bg-red-500/22",
            ring: "ring-red-500/40",
            text: "text-red-600 dark:text-red-300",
            flame: "text-red-500 fill-red-500/40 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]",
            glow: "shadow-[0_0_18px_-2px_rgba(239,68,68,0.45)]",
        },
        hot: {
            bg: "bg-gradient-to-r from-red-500/25 via-orange-500/25 to-red-500/25",
            ring: "ring-red-500/50",
            text: "text-red-600 dark:text-red-200",
            flame: "text-red-500 fill-orange-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]",
            glow: "shadow-[0_0_24px_-2px_rgba(239,68,68,0.6)]",
        },
        off: null,
    }[tier];

    return (
        <AnimatePresence>
            {tier !== "off" && styles && (
                <motion.div
                    key={tier}
                    initial={{ opacity: 0, scale: 0.6, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 h-9 rounded-full backdrop-blur-md ring-1 shrink-0",
                        styles.bg,
                        styles.ring,
                        styles.glow,
                        className
                    )}
                >
                    <motion.span
                        key={streak}
                        initial={{ scale: 0.6, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 12 }}
                        className="inline-flex items-center"
                    >
                        <Flame className={cn("w-4 h-4", styles.flame)} />
                    </motion.span>
                    <span
                        className={cn(
                            "font-black tabular-nums leading-none text-[13px] tracking-tight",
                            styles.text
                        )}
                    >
                        {streak}
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
