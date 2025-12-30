import React from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Flame, Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CompactStreakJewelProps {
    streak: number;
    label?: string;
    className?: string;
    size?: 'sm' | 'lg';
    hasClaimedToday?: boolean;
    onClaim?: () => void;
    isClaiming?: boolean;
}

/**
 * Premium Compact Streak Block - Refactored for Minimalism
 * Concept: "Compact Pill" [ 🔥 3 ]
 */
export const CompactStreakJewel: React.FC<CompactStreakJewelProps> = ({
    streak,
    label = "СЕРИЯ",
    className,
    size = 'lg',
    hasClaimedToday = true,
    onClaim,
    isClaiming = false,
}) => {
    // Hide if no streak and already claimed (nothing to show)
    if (streak <= 0 && hasClaimedToday) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            key={`streak-${streak}-${hasClaimedToday}`}
            className={cn(
                "relative flex items-center justify-center gap-3 overflow-hidden transition-all",
                // Glassmorphism pill background
                "bg-orange-500/10 dark:bg-orange-950/30 backdrop-blur-md border border-orange-500/20",
                "shadow-[0_4px_12px_rgba(249,115,22,0.15)]",
                // Compact sizing (auto width, not full width)
                size === 'lg' ? "h-11 px-4 rounded-full" : "h-9 px-3 rounded-full",
                className
            )}
        >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-50 pointer-events-none" />

            {/* Content Group: Icon + Number */}
            <div className="relative z-10 flex items-center gap-2.5">
                {/* Fire Icon with Pulse */}
                <div className="relative flex items-center justify-center">
                    <Flame
                        className={cn(
                            "text-orange-500 fill-orange-500 transition-all",
                            "drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]",
                            size === 'lg' ? "w-5 h-5" : "w-4 h-4",
                            !hasClaimedToday && "animate-pulse scale-110"
                        )}
                    />
                </div>

                {/* Streak Number */}
                <span className={cn(
                    "font-black leading-none text-orange-600 dark:text-orange-400 font-mono tracking-tight",
                    "drop-shadow-sm",
                    size === 'lg' ? "text-xl" : "text-lg"
                )}>
                    {streak}
                </span>
            </div>

            {/* Optional "Claim" Action (Compact) */}
            <AnimatePresence>
                {!hasClaimedToday && onClaim && (
                    <motion.div
                        initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                        animate={{ width: 'auto', opacity: 1, marginLeft: 8 }}
                        exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                        className="flex items-center overflow-hidden h-full"
                    >
                        {/* Divider */}
                        <div className="w-px h-3 bg-orange-500/30 mr-3" />

                        <button
                            onClick={onClaim}
                            disabled={isClaiming}
                            className={cn(
                                "flex items-center gap-1.5 font-bold uppercase tracking-wider text-orange-600 dark:text-orange-300 hover:text-orange-500 transition-colors whitespace-nowrap",
                                size === 'lg' ? "text-[10px]" : "text-[9px]"
                            )}
                        >
                            {isClaiming ? <Sparkles className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                            {isClaiming ? '...' : '!'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
