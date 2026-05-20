/**
 * StreakParticleBurst — частицы, летящие от карточки правильного ответа
 * к счётчику стрика на каждое инкрементное событие.
 *
 * Триггер: streak увеличился.
 * Источник: DOM-элемент с [data-answer-id="<selectedAnswerId>"] (выбранный ответ).
 * Цель: [data-streak-target] (бейдж стрика или невидимый якорь в шапке).
 *
 * Цветовые уровни:
 *   1-2 — изумрудно-зелёный (просто верно)
 *   3-7 — золотой (серия)
 *   8+  — янтарно-оранжевый (горячая серия)
 *
 * При попадании частиц бейдж получает scale-bump через CustomEvent
 * 'streak-burst-hit' (см. AnswerStreakBadge).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
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
    const { t } = useLanguage();
    const prevStreakRef = useRef(streak);
    const milestoneTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const [bursts, setBursts] = useState<Burst[]>([]);
    const [milestone, setMilestone] = useState<{ key: number; data: typeof MILESTONES[number] } | null>(null);

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

        // Сообщаем бейджу о моменте прилёта частиц (≈ конец анимации)
        const hitTimer = window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent("streak-burst-hit", { detail: { streak, tier } }));
        }, 520);

        // Уборка частиц
        const cleanupTimer = window.setTimeout(() => {
            setBursts((prevB) => prevB.filter((b) => b.id !== id));
        }, 1100);

        // Milestone-баннер на 3/5/7/10.
        // Таймер живёт в ref — cleanup effect его НЕ отменяет,
        // иначе следующий ответ убивал бы таймер и баннер зависал.
        if (MILESTONES[streak]) {
            setMilestone({ key: streak, data: MILESTONES[streak] });
            if (milestoneTimerRef.current) window.clearTimeout(milestoneTimerRef.current);
            milestoneTimerRef.current = window.setTimeout(() => setMilestone(null), 1600);
        }

        return () => {
            window.clearTimeout(hitTimer);
            window.clearTimeout(cleanupTimer);
        };
    }, [streak, selectedAnswerId]);

    return (
        <>
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 250 }}>
                <AnimatePresence>
                    {bursts.map((burst) => (
                        <BurstLayer key={burst.id} burst={burst} />
                    ))}
                </AnimatePresence>
            </div>

            {/* Milestone-баннер */}
            <AnimatePresence>
                {milestone && (
                    <motion.div
                        key={milestone.key}
                        className="fixed inset-x-0 pointer-events-none flex justify-center"
                        style={{ top: "18%", zIndex: 300 }}
                        initial={{ opacity: 0, scale: 0.5, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: -12 }}
                        transition={{
                            type: "spring", stiffness: 420, damping: 18,
                            exit: { duration: 0.35, ease: "easeIn" },
                        }}
                    >
                        <div className={`bg-gradient-to-r ${milestone.data.gradient} px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5`}>
                            <motion.span
                                className="text-2xl"
                                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                {milestone.data.emoji}
                            </motion.span>
                            <span className="text-white font-black text-lg tracking-tight drop-shadow">
                                {t(milestone.data.textKey)}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
