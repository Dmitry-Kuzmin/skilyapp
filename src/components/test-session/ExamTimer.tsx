/**
 * ExamTimer — современный pill-style таймер для экзаменов / марафона.
 * MM:SS формат, glassmorphism, плавная прогресс-линия, состояния:
 *   normal  (>2 мин) — холодный синий
 *   warning (≤2 мин) — янтарный
 *   critical (≤30 сек) — красный + пульсация
 */

import { useMemo } from "react";
import { motion } from "@/components/optimized/Motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIMER_WARNING_THRESHOLD, TIMER_CRITICAL_THRESHOLD } from "@/lib/test-constants";

type ExamTimerProps = {
    timeLeft: number;
    maxTime: number;
    className?: string;
};

const formatMMSS = (sec: number): string => {
    if (sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const ExamTimer = ({ timeLeft, maxTime, className }: ExamTimerProps) => {
    const { state, progress, displayTime } = useMemo(() => {
        const safeMax = Math.max(1, maxTime);
        const safeLeft = Math.max(0, timeLeft);
        const pct = Math.min(100, (safeLeft / safeMax) * 100);
        let s: "normal" | "warning" | "critical" = "normal";
        if (safeLeft <= TIMER_CRITICAL_THRESHOLD) s = "critical";
        else if (safeLeft <= TIMER_WARNING_THRESHOLD) s = "warning";
        return { state: s, progress: pct, displayTime: formatMMSS(safeLeft) };
    }, [timeLeft, maxTime]);

    const palette = {
        normal: {
            ring: "ring-blue-500/20",
            bg: "bg-blue-500/8 dark:bg-blue-500/12",
            icon: "text-blue-500 dark:text-blue-400",
            text: "text-foreground",
            bar: "bg-gradient-to-r from-blue-500 to-cyan-400",
            glow: "",
        },
        warning: {
            ring: "ring-amber-500/30",
            bg: "bg-amber-500/10 dark:bg-amber-500/14",
            icon: "text-amber-500 dark:text-amber-400",
            text: "text-amber-700 dark:text-amber-200",
            bar: "bg-gradient-to-r from-amber-500 to-orange-400",
            glow: "shadow-[0_0_12px_-2px_rgba(245,158,11,0.4)]",
        },
        critical: {
            ring: "ring-red-500/40",
            bg: "bg-red-500/12 dark:bg-red-500/18",
            icon: "text-red-500 dark:text-red-400",
            text: "text-red-600 dark:text-red-300",
            bar: "bg-gradient-to-r from-red-500 to-rose-400",
            glow: "shadow-[0_0_18px_-2px_rgba(239,68,68,0.6)]",
        },
    }[state];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={cn(
                "relative inline-flex items-center gap-2 pl-2.5 pr-3 h-9 rounded-full backdrop-blur-md ring-1 shrink-0",
                palette.bg,
                palette.ring,
                palette.glow,
                "overflow-hidden",
                className
            )}
        >
            {/* Pulse rings for critical state */}
            {state === "critical" && (
                <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-red-500/20"
                    animate={{ opacity: [0.35, 0, 0.35] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            <Clock
                className={cn(
                    "w-3.5 h-3.5 shrink-0 relative z-10",
                    palette.icon,
                    state === "critical" && "animate-pulse"
                )}
            />

            <span
                className={cn(
                    "relative z-10 font-bold tabular-nums leading-none text-[13px] tracking-tight",
                    palette.text
                )}
            >
                {displayTime}
            </span>

            {/* Progress underline */}
            <motion.span
                aria-hidden
                className={cn("absolute left-1 right-1 bottom-0.5 h-[2px] rounded-full", palette.bar)}
                style={{ transformOrigin: "left center" }}
                animate={{ scaleX: progress / 100 }}
                transition={{ duration: 0.6, ease: "linear" }}
            />
        </motion.div>
    );
};
