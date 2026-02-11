import { memo } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GameBackgroundProps {
    mode: string;
    timeLeft?: number;
    maxTime?: number;
    streak?: number;
}

export const GameBackground = memo(({ mode, timeLeft, maxTime = 300, streak = 0 }: GameBackgroundProps) => {
    // Only render for specific game modes
    if (mode !== 'blitz' && mode !== 'time-attack' && mode !== 'survival') return null;

    const isCritical = timeLeft !== undefined && timeLeft <= 10 && timeLeft > 0;
    // Calculate urgency based on time left (0 to 1)
    const urgency = timeLeft !== undefined ? Math.max(0, 1 - (timeLeft / maxTime)) : 0;

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            {/* Base Dark Background */}
            <div className="absolute inset-0 bg-slate-950" />

            {/* Dynamic Gradient Mesh */}
            <motion.div
                className="absolute inset-0 opacity-40"
                animate={{
                    background: [
                        "radial-gradient(circle at 15% 50%, rgba(76, 29, 149, 0.4), transparent 50%), radial-gradient(circle at 85% 30%, rgba(15, 23, 42, 0.4), transparent 50%)",
                        "radial-gradient(circle at 85% 50%, rgba(76, 29, 149, 0.4), transparent 50%), radial-gradient(circle at 15% 30%, rgba(15, 23, 42, 0.4), transparent 50%)",
                        "radial-gradient(circle at 15% 50%, rgba(76, 29, 149, 0.4), transparent 50%), radial-gradient(circle at 85% 30%, rgba(15, 23, 42, 0.4), transparent 50%)",
                    ]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />

            {/* Speed Lines / Particles effect for high streak */}
            <AnimatePresence>
                {streak > 5 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[url('/effects/speed-lines.png')] bg-cover bg-center mix-blend-overlay"
                    />
                )}
            </AnimatePresence>

            {/* Critical State - Red Pulse Overlay */}
            <motion.div
                className="absolute inset-0 bg-red-900/20 mix-blend-overlay"
                animate={{
                    opacity: isCritical ? [0, 0.4, 0] : 0
                }}
                transition={{
                    duration: 0.5,
                    repeat: isCritical ? Infinity : 0
                }}
            />

            {/* Urgency Vignette - Darkens edges as time runs out */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at center, transparent ${60 - (urgency * 40)}%, #000 100%)`
                }}
            />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-20" />

            {/* Floating Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>
    );
});

GameBackground.displayName = "GameBackground";
