import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

interface DuelEffectsOverlayProps {
    effect: 'correct' | 'wrong' | null;
}

export function DuelEffectsOverlay({ effect }: DuelEffectsOverlayProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted || typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {effect === 'correct' && (
                <motion.div
                    key="correct-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden"
                >
                    {/* 1. Background Flash (Green) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.2 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-green-500 mix-blend-hard-light"
                    />

                    {/* 2. Radial Burst */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: [0, 0.6, 0] }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute w-[100vw] h-[100vw] rounded-full bg-radial-gradient from-green-400/40 to-transparent blur-3xl "
                    />

                    {/* 3. Central Icon - Big Checkmark */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                        animate={{
                            scale: [0.5, 1.2, 1],
                            opacity: [0, 1, 0],
                            rotate: 0,
                        }}
                        transition={{ duration: 0.6, times: [0, 0.2, 1] }}
                        className="relative z-10 p-8 rounded-full bg-green-500/20 backdrop-blur-sm border-2 border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.5)]"
                    >
                        <Check className="w-24 h-24 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.9)]" strokeWidth={3} />
                    </motion.div>

                    {/* 4. Text - "GENIUS!" or similar (Optional, keeping it simple iconic for now) */}
                </motion.div>
            )}

            {effect === 'wrong' && (
                <motion.div
                    key="wrong-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden"
                >
                    {/* 1. Background Red Tint/Vignette */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-red-600 mix-blend-multiply"
                    />

                    {/* 2. Intense Flash */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-red-500 mix-blend-overlay"
                    />

                    {/* 3. Central Icon - Big X */}
                    <motion.div
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{
                            scale: [1.5, 0.9, 1],
                            opacity: [0, 1, 0],
                            rotate: [0, -10, 10, 0]
                        }}
                        transition={{ duration: 0.5, times: [0, 0.2, 1] }}
                        className="relative z-10 p-8 rounded-full bg-red-500/20 backdrop-blur-sm border-2 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.5)]"
                    >
                        <X className="w-24 h-24 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]" strokeWidth={3} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
