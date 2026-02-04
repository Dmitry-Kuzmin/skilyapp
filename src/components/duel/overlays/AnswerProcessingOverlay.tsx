// ============================================================================
// AnswerProcessingOverlay - Premium waiting animation after answer selection
// ============================================================================
// Shows elegant pulsing animation while waiting for server response
// Designed to be subtle, aesthetic, and non-intrusive

import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';

interface AnswerProcessingOverlayProps {
    isVisible: boolean;
}

export const AnswerProcessingOverlay = memo(({ isVisible }: AnswerProcessingOverlayProps) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
                >
                    {/* Subtle gradient backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"
                    />

                    {/* Central processing indicator */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="relative"
                    >
                        {/* Outer glow ring */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                            className="absolute inset-0 w-16 h-16 rounded-full bg-primary/20 blur-xl"
                            style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}
                        />

                        {/* Middle pulse ring */}
                        <motion.div
                            animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.5, 0, 0.5],
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: 'easeOut',
                            }}
                            className="absolute w-12 h-12 rounded-full border-2 border-primary/40"
                            style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}
                        />

                        {/* Inner spinning indicator */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            className="relative w-10 h-10"
                        >
                            <svg
                                className="w-10 h-10"
                                viewBox="0 0 40 40"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                {/* Gradient arc */}
                                <defs>
                                    <linearGradient id="processingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <circle
                                    cx="20"
                                    cy="20"
                                    r="16"
                                    stroke="url(#processingGradient)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    fill="none"
                                    strokeDasharray="75 25"
                                />
                            </svg>
                        </motion.div>

                        {/* Central dot */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                            className="absolute w-2 h-2 bg-primary rounded-full"
                            style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}
                        />
                    </motion.div>

                    {/* Subtle text label */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.7, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                        className="absolute bottom-1/3 text-sm text-muted-foreground font-medium tracking-wide"
                    >
                        <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            Проверяем...
                        </motion.span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

AnswerProcessingOverlay.displayName = 'AnswerProcessingOverlay';
