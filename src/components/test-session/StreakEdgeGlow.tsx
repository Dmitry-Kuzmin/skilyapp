import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface StreakEdgeGlowProps {
    streak: number;
}

type Tier = "off" | "low" | "mid" | "high" | "ultra";

const MILESTONES: Record<number, { emoji: string; text: string; color: string }> = {
    3:  { emoji: "🔥", text: "Серия ×3",     color: "from-orange-500 to-amber-400" },
    5:  { emoji: "⚡", text: "Серия ×5!",    color: "from-orange-600 to-red-400" },
    7:  { emoji: "💥", text: "×7 Горишь!",   color: "from-red-500 to-orange-400" },
    10: { emoji: "🏆", text: "×10 Легенда!", color: "from-red-600 to-yellow-400" },
};

// Three shadow layers: outer (red halo) · mid (orange body) · inner (yellow core)
// boost scales all blur/spread values for the flash burst effect
function makeFlame(tier: Tier, boost = 1): string {
    if (tier === "off") return "inset 0 0 0px 0px rgba(251,146,60,0)";

    type FlameLevel = { outer: [number, number, string]; mid: [number, number, string]; core: [number, number, string] };
    const levels: Record<Exclude<Tier, "off">, FlameLevel> = {
        low:   {
            outer: [75,   9, "rgba(239,68,68,0.20)"],
            mid:   [30,   5, "rgba(249,115,22,0.32)"],
            core:  [13,   2, "rgba(253,186,36,0.36)"],
        },
        mid:   {
            outer: [85,  11, "rgba(234,56,56,0.26)"],
            mid:   [34,   6, "rgba(249,115,22,0.40)"],
            core:  [15,   3, "rgba(253,186,36,0.46)"],
        },
        high:  {
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

// Irregular flicker keyframes for flame feel (non-uniform spacing)
function flameKeyframes(tier: Exclude<Tier, "off">): string[] {
    // Soft breathing — ±10% variance max
    const boosts = [1.0, 1.10, 0.90, 1.08, 0.92, 1.10, 0.94, 1.0];
    return boosts.map((b) => makeFlame(tier, b));
}

export const StreakEdgeGlow = ({ streak }: StreakEdgeGlowProps) => {
    const prevStreakRef = useRef(streak);
    const justIncremented = streak > prevStreakRef.current;
    prevStreakRef.current = streak;

    const [milestone, setMilestone] = useState<{ key: number; data: typeof MILESTONES[number] } | null>(null);

    useEffect(() => {
        if (justIncremented && MILESTONES[streak]) {
            setMilestone({ key: streak, data: MILESTONES[streak] });
            const t = setTimeout(() => setMilestone(null), 1600);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streak]);

    const tier = useMemo((): Tier => {
        if (streak >= 10) return "ultra";
        if (streak >= 7)  return "high";
        if (streak >= 4)  return "mid";
        if (streak >= 2)  return "low";
        return "off";
    }, [streak]);

    const isOff = tier === "off";

    const flickerDuration = tier === "ultra" ? 4.0 : tier === "high" ? 5.0 : tier === "mid" ? 6.0 : 7.5;

    return (
        <>
            {/* Flickering flame glow */}
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

            {/* Flash burst when new correct answer added to streak */}
            {!isOff && (
                <motion.div
                    key={streak}
                    className="fixed inset-0 pointer-events-none"
                    style={{ zIndex: 200 }}
                    initial={{
                        boxShadow: makeFlame(tier as Exclude<Tier, "off">, justIncremented ? 2.6 : 1),
                        opacity: justIncremented ? 1 : 0,
                    }}
                    animate={{ boxShadow: makeFlame(tier as Exclude<Tier, "off">, 1), opacity: 0 }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                />
            )}

            {/* Milestone celebration banner */}
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
                        <div className={`bg-gradient-to-r ${milestone.data.color} px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5`}>
                            <motion.span
                                className="text-2xl"
                                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                {milestone.data.emoji}
                            </motion.span>
                            <span className="text-white font-black text-lg tracking-tight drop-shadow">
                                {milestone.data.text}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
