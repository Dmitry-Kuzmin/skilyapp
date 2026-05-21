/**
 * StreakEdgeGlow — градиентная «огненная» подсветка по периметру экрана
 * при серии правильных ответов.
 *
 * Тиры (по значению streak):
 *   off    (0-1)  — невидимо
 *   low    (2-3)  — лёгкий зелёный отблеск
 *   mid    (4-6)  — оранжевый огонь
 *   high   (7-9)  — ярко-красный огонь
 *   ultra  (10+)  — максимальная интенсивность + более быстрое мерцание
 *
 * Используется inset box-shadow на fixed inset-0 div — работает во всех браузерах.
 */

import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "@/components/optimized/Motion";

interface StreakEdgeGlowProps {
    streak: number;
}

type Tier = "off" | "low" | "mid" | "high" | "ultra";

// Three inset shadow layers for depth: outer halo · mid body · inner core
function makeFlame(tier: Tier, boost = 1): string {
    if (tier === "off") return "inset 0 0 0px 0px rgba(251,146,60,0)";

    type FlameLevel = {
        outer: [number, number, string];
        mid:   [number, number, string];
        core:  [number, number, string];
    };

    const levels: Record<Exclude<Tier, "off">, FlameLevel> = {
        low: {
            outer: [80,  10, "rgba(52,211,153,0.18)"],
            mid:   [32,   5, "rgba(16,185,129,0.28)"],
            core:  [14,   2, "rgba(167,243,208,0.32)"],
        },
        mid: {
            outer: [85,  11, "rgba(234,56,56,0.26)"],
            mid:   [34,   6, "rgba(249,115,22,0.40)"],
            core:  [15,   3, "rgba(253,186,36,0.46)"],
        },
        high: {
            outer: [95,  13, "rgba(220,38,38,0.32)"],
            mid:   [38,   7, "rgba(249,115,22,0.50)"],
            core:  [17,   4, "rgba(253,224,71,0.56)"],
        },
        ultra: {
            outer: [105, 15, "rgba(185,28,28,0.38)"],
            mid:   [42,   8, "rgba(249,115,22,0.60)"],
            core:  [19,   5, "rgba(253,224,71,0.66)"],
        },
    };

    const { outer, mid, core } = levels[tier as Exclude<Tier, "off">];
    const b = (v: number) => Math.round(v * boost);
    return [
        `inset 0 0 ${b(outer[0])}px ${b(outer[1])}px ${outer[2]}`,
        `inset 0 0 ${b(mid[0])}px   ${b(mid[1])}px   ${mid[2]}`,
        `inset 0 0 ${b(core[0])}px  ${b(core[1])}px  ${core[2]}`,
    ].join(", ");
}

// Irregular flicker keyframes for a natural flame feel
function flameKeyframes(tier: Exclude<Tier, "off">): string[] {
    const boosts = [1.0, 1.10, 0.90, 1.08, 0.92, 1.10, 0.94, 1.0];
    return boosts.map((b) => makeFlame(tier, b));
}

// Theme-color meta tint per tier (browser chrome on mobile)
const THEME_COLORS: Record<Exclude<Tier, "off">, string> = {
    low:   "#064e3b",
    mid:   "#7f1d1d",
    high:  "#6b0000",
    ultra: "#450a0a",
};
const THEME_DEFAULT = "#09090b";

export const StreakEdgeGlow = ({ streak }: StreakEdgeGlowProps) => {
    const prevStreakRef = useRef(streak);
    const justIncremented = streak > prevStreakRef.current;
    prevStreakRef.current = streak;

    // Tint browser chrome on mobile
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const tier = useMemo((): Tier => {
        if (streak >= 10) return "ultra";
        if (streak >= 7)  return "high";
        if (streak >= 4)  return "mid";
        if (streak >= 2)  return "low";
        return "off";
    }, [streak]);

    const isOff = tier === "off";

    useEffect(() => {
        if (!mounted) return;
        const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
        if (!meta) return;
        meta.content = isOff ? THEME_DEFAULT : THEME_COLORS[tier as Exclude<Tier, "off">];
        return () => { meta.content = THEME_DEFAULT; };
    }, [tier, isOff, mounted]);

    const flickerDuration =
        tier === "ultra" ? 4.0 :
        tier === "high"  ? 5.0 :
        tier === "mid"   ? 6.0 : 7.5;

    return (
        <>
            {/* Persistent flickering glow */}
            <motion.div
                className="fixed inset-0 pointer-events-none"
                style={{ zIndex: 199 }}
                animate={{
                    boxShadow: isOff
                        ? makeFlame("off")
                        : flameKeyframes(tier as Exclude<Tier, "off">),
                    opacity: isOff ? 0 : 1,
                }}
                transition={
                    isOff
                        ? { duration: 0.7, ease: "easeOut" }
                        : {
                            boxShadow: {
                                duration: flickerDuration,
                                repeat: Infinity,
                                ease: "easeInOut",
                                times: [0, 0.12, 0.27, 0.42, 0.55, 0.68, 0.83, 1],
                            },
                            opacity: { duration: 0.4, ease: "easeOut" },
                        }
                }
            />

            {/* Flash burst on each new correct answer in streak */}
            {!isOff && (
                <motion.div
                    key={streak}
                    className="fixed inset-0 pointer-events-none"
                    style={{ zIndex: 200 }}
                    initial={{
                        boxShadow: makeFlame(tier as Exclude<Tier, "off">, justIncremented ? 2.8 : 1),
                        opacity: justIncremented ? 1 : 0,
                    }}
                    animate={{ boxShadow: makeFlame(tier as Exclude<Tier, "off">, 1), opacity: 0 }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                />
            )}
        </>
    );
};
