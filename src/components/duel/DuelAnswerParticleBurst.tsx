/**
 * DuelAnswerParticleBurst — частицы летят от выбранного ответа к сегменту
 * прогресс-бара для текущего вопроса. Цвет: зелёный (верно) / красный (ошибка).
 *
 * Триггер: длина answerHistory выросла → новый ответ зарегистрирован.
 * Источник: [data-answer-id="<selectedAnswerId>"] — выбранная кнопка ответа.
 * Цель:     [data-progress-segment="<index>"] — конкретный сегмент в шапке.
 *
 * Позиции считаются через getBoundingClientRect в момент триггера, так что
 * эффект корректно работает на любой ширине экрана и при любом лейауте.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface DuelAnswerParticleBurstProps {
    answers: Array<{ isCorrect: boolean } | null>;
    selectedAnswerId: string | null;
}

interface Burst {
    id: number;
    source: { x: number; y: number };
    target: { x: number; y: number };
    isCorrect: boolean;
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

const COLORS_CORRECT   = ["#14b8a6", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];
const COLORS_INCORRECT = ["#f43f5e", "#e11d48", "#fb7185", "#fda4af", "#fecaca"];
const PARTICLE_COUNT   = 22;

let burstSeq = 0;

const buildParticles = (burst: Burst): ParticleSpec[] => {
    const colors = burst.isCorrect ? COLORS_CORRECT : COLORS_INCORRECT;
    const arr: ParticleSpec[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spread = 22 + Math.random() * 26;
        const startX = burst.source.x + Math.cos(angle) * spread;
        const startY = burst.source.y + Math.sin(angle) * spread;
        // Bezier control: smoothly arcs upward then converges on the segment
        const midX = (startX + burst.target.x) / 2 + (Math.random() - 0.5) * 130;
        const midY = Math.min(startY, burst.target.y) - 50 - Math.random() * 80;
        arr.push({
            color:    colors[i % colors.length],
            startX,
            startY,
            midX,
            midY,
            targetX:  burst.target.x + (Math.random() - 0.5) * 12,
            targetY:  burst.target.y + (Math.random() - 0.5) * 6,
            size:     5 + Math.random() * 5,
            delay:    i * 0.012 + Math.random() * 0.04,
            duration: 0.55 + Math.random() * 0.18,
        });
    }
    return arr;
};

// ─────────────────────────────────────────────────────────────────────────────

export const DuelAnswerParticleBurst = ({ answers, selectedAnswerId }: DuelAnswerParticleBurstProps) => {
    const prevCountRef = useRef<number>(answers.filter(Boolean).length);
    const lastSelectedRef = useRef<string | null>(selectedAnswerId);
    const [bursts, setBursts] = useState<Burst[]>([]);

    // Cache latest non-null selection — answers may update slightly after selection resets.
    useEffect(() => {
        if (selectedAnswerId) lastSelectedRef.current = selectedAnswerId;
    }, [selectedAnswerId]);

    useEffect(() => {
        const currentCount = answers.filter(Boolean).length;
        const prevCount    = prevCountRef.current;
        prevCountRef.current = currentCount;

        if (currentCount <= prevCount) return;

        // Find the newly-answered index (last non-null entry).
        let answeredIndex = -1;
        let answer: { isCorrect: boolean } | null = null;
        for (let i = answers.length - 1; i >= 0; i--) {
            if (answers[i] != null) {
                answeredIndex = i;
                answer = answers[i];
                break;
            }
        }
        if (answeredIndex < 0 || !answer) return;

        const answerId = selectedAnswerId ?? lastSelectedRef.current;
        if (!answerId) return;

        const sourceEl = document.querySelector<HTMLElement>(`[data-answer-id="${CSS.escape(answerId)}"]`);
        const targetEl = document.querySelector<HTMLElement>(`[data-progress-segment="${answeredIndex}"]`);
        if (!sourceEl || !targetEl) return;

        const sr = sourceEl.getBoundingClientRect();
        const tr = targetEl.getBoundingClientRect();

        const id = ++burstSeq;
        const burst: Burst = {
            id,
            source: { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 },
            target: { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 },
            isCorrect: answer.isCorrect,
        };

        setBursts(prev => [...prev, burst]);

        const cleanupTimer = window.setTimeout(() => {
            setBursts(prev => prev.filter(b => b.id !== id));
        }, 1100);

        return () => window.clearTimeout(cleanupTimer);
    }, [answers, selectedAnswerId]);

    return (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 250 }}>
            <AnimatePresence>
                {bursts.map(b => <BurstLayer key={b.id} burst={b} />)}
            </AnimatePresence>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const BurstLayer = ({ burst }: { burst: Burst }) => {
    const particles = useMemo(() => buildParticles(burst), [burst]);

    return (
        <>
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width:      p.size,
                        height:     p.size,
                        background: p.color,
                        boxShadow:  `0 0 ${p.size * 2.2}px ${p.color}, 0 0 ${p.size * 0.8}px ${p.color}`,
                        left:       0,
                        top:        0,
                        willChange: "transform, opacity",
                    }}
                    initial={{
                        x: p.startX,
                        y: p.startY,
                        opacity: 0,
                        scale: 0.4,
                    }}
                    animate={{
                        x:       [p.startX, p.midX, p.targetX],
                        y:       [p.startY, p.midY, p.targetY],
                        opacity: [0, 1, 1, 0],
                        scale:   [0.4, 1.15, 0.25],
                    }}
                    transition={{
                        duration: p.duration,
                        delay:    p.delay,
                        times:    [0, 0.25, 1],
                        opacity:  { duration: p.duration, delay: p.delay, times: [0, 0.15, 0.7, 1], ease: "easeOut" },
                        ease:     [0.22, 0.7, 0.3, 1],
                    }}
                />
            ))}
        </>
    );
};
