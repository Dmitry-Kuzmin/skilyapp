import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
 * Premium Compact Streak Block - Concept 1: The Compact Jewel
 * A status-symbol style streak indicator with rich aesthetics.
 */
export const CompactStreakJewel: React.FC<CompactStreakJewelProps> = ({
    streak,
    label = "СЕРИЯ ДНЕЙ",
    className,
    size = 'lg',
    hasClaimedToday = true,
    onClaim,
    isClaiming = false,
}) => {
    if (streak <= 0 && hasClaimedToday) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`streak-${streak}-${hasClaimedToday}`}
            className={cn(
                "relative flex items-center overflow-hidden transition-all duration-500",
                "bg-slate-950/40 backdrop-blur-2xl border border-orange-500/20 shadow-2xl",
                size === 'lg' ? "h-20 w-full px-4 sm:px-8 rounded-[2rem]" : "h-14 px-4 rounded-2xl",
                className
            )}
        >
            {/* Dynamic Background Glows */}
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-40 h-40 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-40 h-40 bg-orange-600/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Moving Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-shimmer pointer-events-none" />

            <div className="flex items-center justify-between w-full relative z-10 gap-2 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                    {/* Premium Icon Container */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-full animate-pulse" />
                        <div className={cn(
                            "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 shadow-inner",
                            size === 'lg' ? "w-12 h-12" : "w-10 h-10"
                        )}>
                            <Flame className={cn("text-orange-500 fill-orange-500/10", size === 'lg' ? "w-7 h-7" : "w-6 h-6")} />

                            <svg width="0" height="0" className="absolute">
                                <linearGradient id="streak-jewel-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f97316" />
                                    <stop offset="50%" stopColor="#fb923c" />
                                    <stop offset="100%" stopColor="#ea580c" />
                                </linearGradient>
                            </svg>
                            <Flame
                                className={cn("absolute transition-transform duration-500", size === 'lg' ? "w-7 h-7" : "w-6 h-6", !hasClaimedToday && "scale-110")}
                                style={{
                                    fill: streak > 0 ? 'url(#streak-jewel-gradient)' : 'none',
                                    stroke: 'url(#streak-jewel-gradient)',
                                    strokeWidth: 2.5
                                }}
                            />
                        </div>
                    </div>

                    {/* Streak Number & Label Group */}
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex flex-col leading-none">
                            <span className={cn(
                                "font-black tracking-tighter bg-gradient-to-br from-orange-200 via-orange-500 to-orange-700 bg-clip-text text-transparent drop-shadow-xl",
                                size === 'lg' ? "text-4xl" : "text-3xl"
                            )}>
                                {streak}
                            </span>
                        </div>

                        <div className="h-8 w-px bg-slate-700/50 block" />

                        <div className="flex flex-col leading-tight min-w-0 uppercase">
                            <span className="text-[10px] sm:text-[11px] font-black text-slate-300 tracking-[0.2em] whitespace-nowrap truncate">
                                {label}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-bold text-orange-500/70 tracking-widest mt-1">
                                Active Legend
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Button Segment */}
                <div className="flex items-center gap-3 shrink-0">
                    <AnimatePresence mode="wait">
                        {!hasClaimedToday && onClaim ? (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <Button
                                    onClick={onClaim}
                                    disabled={isClaiming}
                                    className={cn(
                                        "relative overflow-hidden group font-black uppercase tracking-widest text-[10px] sm:text-xs",
                                        "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500",
                                        "text-white shadow-[0_4px_20px_rgba(249,115,22,0.4)] border-t border-white/20",
                                        size === 'lg' ? "h-12 px-6 rounded-xl" : "h-10 px-4 rounded-lg"
                                    )}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isClaiming ? <Sparkles className="animate-spin w-4 h-4" /> : <Gift className="w-4 h-4" />}
                                        {isClaiming ? 'Claiming...' : 'Get Bonus'}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-slate-900/50 border border-white/5"
                            >
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                    Safely Synced
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
