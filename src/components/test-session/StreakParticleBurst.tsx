/**
 * StreakParticleBurst — частицы + плавающий toast-чип стрика.
 *
 * Частицы летят от выбранного ответа к [data-streak-target] в шапке.
 * Floating chip:
 *   - compact: маленький пилл 🔥 N (всегда виден при streak ≥ 1)
 *   - milestone: расширяется в баннер с лейблом на 3/5/7/10
 *
 * Цветовые уровни частиц:
 *   1-2 — изумрудно-зелёный
 *   3-7 — золотой
 *   8+  — янтарно-оранжевый
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useAnimationControls } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StreakParticleBurstProps {
    streak: number;
    selectedAnswerId?: string | null;
}

type Tier = "low" | "mid" | "high";

interface Burst {
    id: number;
    source: { x: number; y: number };
    target: { x: number; y: number };
    tier: Tier;
    streak: number;
}

interface ParticleSpec {
    color: string;
    startX: number;
    startY: number;
    midX: number;
    midY: number;
    targetX: number;
    targetY: number;
    size: number;
    delay: number;
    duration: number;
}

const TIER_COLORS: Record<Tier, string[]> = {
    low:  ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
    mid:  ["#fbbf24", "#fcd34d", "#fde68a", "#fef3c7"],
    high: ["#f59e0b", "#fbbf24", "#fb923c", "#fde68a"],
};

const TIER_COUNT: Record<Tier, number> = {
    low: 14,
    mid: 20,
    high: 28,
};

const MILESTONES: Record<number, { emoji: string; textKey: string; gradient: string }> = {
    3:  { emoji: "🔥", textKey: "test.streakMilestone3",  gradient: "from-orange-500 to-amber-400" },
    5:  { emoji: "⚡", textKey: "test.streakMilestone5",  gradient: "from-orange-600 to-red-400" },
    7:  { emoji: "💥", textKey: "test.streakMilestone7",  gradient: "from-red-500 to-orange-400" },
    10: { emoji: "🏆", textKey: "test.streakMilestone10", gradient: "from-red-600 to-yellow-400" },
};

/** Градиенты + глоу для компактного чипа по тиру */
const COMPACT_TIER = {
    low:  { bg: "from-amber-400 to-orange-500",     glow: "shadow-[0_4px_20px_rgba(251,146,60,0.55)]" },
    mid:  { bg: "from-orange-500 to-red-500",        glow: "shadow-[0_4px_24px_rgba(249,115,22,0.6)]" },
    high: { bg: "from-rose-600 via-red-500 to-orange-400", glow: "shadow-[0_4px_28px_rgba(220,38,38,0.7)]" },
} as const;

// ─────────────────────────────────────────────────────────────
// Floating streak toast chip
// ─────────────────────────────────────────────────────────────
const StreakFloatingChip = ({ streak }: { streak: number }) => {
    const { t } = useLanguage();
    const prevStreakRef = useRef(streak);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showMilestone, setShowMilestone] = useState(false);
    const [activeMilestone, setActiveMilestone] = useState<typeof MILESTONES[number] | null>(null);

    // Controls for compact chip bump on each streak inc
    const chipControls = useAnimationControls();
    const iconControls = useAnimationControls();

    useEffect(() => {
        const prev = prevStreakRef.current;
        prevStreakRef.current = streak;

        if (streak <= 0) {
            setShowMilestone(false);
            return;
        }
        if (streak <= prev) return;

        // Bump compact chip
        chipControls.start({
            scale: [1, 1.22, 0.94, 1.06, 1],
            transition: { duration: 0.45, ease: "easeOut" },
        });
        iconControls.start({
            rotate: [0, -20, 15, -8, 0],
            scale:  [1, 1.35, 0.9, 1.1, 1],
            transition: { duration: 0.5, ease: "easeOut" },
        });

        // Milestone?
        if (MILESTONES[streak]) {
            setActiveMilestone(MILESTONES[streak]);
            setShowMilestone(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setShowMilestone(false), 1800);
        }
    }, [streak, chipControls, iconControls]);

    const tier = tierFromStreak(streak);
    const tierStyle = COMPACT_TIER[tier];

    return (
        <AnimatePresence>
            {streak >= 1 && (
                <div
                    className="fixed inset-x-0 flex justify-center pointer-events-none"
                    style={{ top: "62px", zIndex: 300 }}
                >
                    <AnimatePresence mode="wait">
                        {showMilestone && activeMilestone ? (
                            /* ── Milestone banner ── */
                            <motion.div
                                key="milestone"
                                initial={{ opacity: 0, scale: 0.55, y: -12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.82, y: -8 }}
                                transition={{ type: "spring", stiffness: 440, damping: 18 }}
                                className={cn(
                                    "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl",
                                    "bg-gradient-to-r shadow-2xl",
                                    activeMilestone.gradient,
                                )}
                            >
                                <motion.span
                                    className="text-xl leading-none"
                                    animate={{ rotate: [0, -18, 16, -8, 0] }}
                                    transition={{ duration: 0.5, delay: 0.08 }}
                                >
                                    {activeMilestone.emoji}
                                </motion.span>
                                <span className="text-white font-black text-base tracking-tight drop-shadow leading-none">
                                    {t(activeMilestone.textKey)}
                                </span>
                            </motion.div>
                        ) : (
                            /* ── Compact chip ── */
                            <motion.div
                                key="compact"
                                data-streak-target="chip"
                                initial={{ opacity: 0, scale: 0.5, y: -8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: -8 }}
                                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                                className={cn(
                                    "relative flex items-center gap-1.5 px-3 h-8 rounded-full overflow-hidden",
                                    "bg-gradient-to-r backdrop-blur-md ring-1 ring-white/20",
                                    tierStyle.bg,
                                    tierStyle.glow,
                                )}
                            >
                                {/* Radial flash on bump */}
                                <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
                                    <motion.div
                                        key={streak}
                                        className="absolute inset-0 rounded-full"
                                        style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35) 0%, transparent 70%)" }}
                                        initial={{ opacity: 0, scale: 0.4 }}
                                        animate={{ opacity: [0, 1, 0], scale: [0.4, 2.2, 2.8] }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                </div>

                                <motion.div animate={chipControls} className="relative z-10 flex items-center gap-1">
                                    <motion.span animate={iconControls} className="flex items-center">
                                        <Flame className="w-3.5 h-3.5 text-white drop-shadow-[0_0_6px_rgba(253,186,36,0.9)]" />
                                    </motion.span>
                                    <motion.span
                                        key={streak}
                                        initial={{ scale: 0.5, y: 4, opacity: 0 }}
                                        animate={{ scale: 1, y: 0, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 600, damping: 18 }}
                                        className="font-black tabular-nums text-[13px] leading-none tracking-tight text-white"
                                    >
                                        {streak}
                                    </motion.span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
};

let burstSeq = 0;

const tierFromStreak = (s: number): Tier => {
    if (s >= 8) return "high";
    if (s >= 3) return "mid";
    return "low";
};

const buildParticles = (burst: Burst): ParticleSpec[] => {
    const count = TIER_COUNT[burst.tier];
    const colors = TIER_COLORS[burst.tier];
    const arr: ParticleSpec[] = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const startSpread = 24 + Math.random() * 28;
        const startX = burst.source.x + Math.cos(angle) * startSpread;
        const startY = burst.source.y + Math.sin(angle) * startSpread;
        // Bezier control: smoothly arcs upward toward target
        const midX = (startX + burst.target.x) / 2 + (Math.random() - 0.5) * 140;
        const midY = Math.min(startY, burst.target.y) - 40 - Math.random() * 90;
        arr.push({
            color: colors[i % colors.length],
            startX,
            startY,
            midX,
            midY,
            targetX: burst.target.x + (Math.random() - 0.5) * 14,
            targetY: burst.target.y + (Math.random() - 0.5) * 14,
            size: 5 + Math.random() * 6,
            delay: i * 0.012 + Math.random() * 0.04,
            duration: 0.55 + Math.random() * 0.18,
        });
    }
    return arr;
};

export const StreakParticleBurst = ({ streak, selectedAnswerId }: StreakParticleBurstProps) => {
    const prevStreakRef = useRef(streak);
    const [bursts, setBursts] = useState<Burst[]>([]);

    useEffect(() => {
        const prev = prevStreakRef.current;
        prevStreakRef.current = streak;

        if (streak <= prev || streak <= 0) return;

        // Source — выбранная (правильная) карточка ответа
        const sourceEl = selectedAnswerId
            ? document.querySelector<HTMLElement>(`[data-answer-id="${CSS.escape(selectedAnswerId)}"]`)
            : null;
        const targetEl = document.querySelector<HTMLElement>("[data-streak-target]");
        if (!sourceEl || !targetEl) return;

        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const tier = tierFromStreak(streak);

        const id = ++burstSeq;
        const burst: Burst = {
            id,
            source: {
                x: sourceRect.left + sourceRect.width / 2,
                y: sourceRect.top + sourceRect.height / 2,
            },
            target: {
                x: targetRect.left + targetRect.width / 2,
                y: targetRect.top + targetRect.height / 2,
            },
            tier,
            streak,
        };

        setBursts((prevB) => [...prevB, burst]);

        // Сообщаем floating-чипу о попадании частиц
        const hitTimer = window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent("streak-burst-hit", { detail: { streak, tier } }));
        }, 520);

        // Уборка частиц
        const cleanupTimer = window.setTimeout(() => {
            setBursts((prevB) => prevB.filter((b) => b.id !== id));
        }, 1100);

        return () => {
            window.clearTimeout(hitTimer);
            window.clearTimeout(cleanupTimer);
        };
    }, [streak, selectedAnswerId]);

    return (
        <>
            {/* Частицы */}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 250 }}>
                <AnimatePresence>
                    {bursts.map((burst) => (
                        <BurstLayer key={burst.id} burst={burst} />
                    ))}
                </AnimatePresence>
            </div>

            {/* Floating toast chip — compact + milestone */}
            <StreakFloatingChip streak={streak} />
        </>
    );
};

const BurstLayer = ({ burst }: { burst: Burst }) => {
    const particles = useMemo(() => buildParticles(burst), [burst]);

    return (
        <>
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        boxShadow: `0 0 ${p.size * 2.2}px ${p.color}, 0 0 ${p.size * 0.8}px ${p.color}`,
                        left: 0,
                        top: 0,
                        willChange: "transform, opacity",
                    }}
                    initial={{
                        x: p.startX,
                        y: p.startY,
                        opacity: 0,
                        scale: 0.4,
                    }}
                    animate={{
                        x: [p.startX, p.midX, p.targetX],
                        y: [p.startY, p.midY, p.targetY],
                        opacity: [0, 1, 1, 0],
                        scale: [0.4, 1.15, 0.25],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        times: [0, 0.25, 1],
                        opacity: { duration: p.duration, delay: p.delay, times: [0, 0.15, 0.7, 1], ease: "easeOut" },
                        ease: [0.22, 0.7, 0.3, 1],
                    }}
                />
            ))}
        </>
    );
};
