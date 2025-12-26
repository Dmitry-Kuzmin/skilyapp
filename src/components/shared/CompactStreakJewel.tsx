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
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            key={`streak-${streak}-${hasClaimedToday}`}
            className={cn(
                "relative flex items-center overflow-hidden transition-all duration-700",
                "bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-orange-500/20 dark:border-orange-500/30",
                "shadow-[0_8px_32px_rgba(249,115,22,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
                size === 'lg' ? "h-20 w-full px-4 sm:px-8 rounded-[2rem]" : "h-14 px-4 rounded-2xl",
                className
            )}
        >
            {/* Dynamic Premium Glows */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-32 h-32 bg-orange-500/20 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-32 h-32 bg-orange-600/10 rounded-full blur-[40px] pointer-events-none" />

            {/* Premium Animated Mesh */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f97316' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")` }} />

            <div className="flex items-center justify-between w-full relative z-10 gap-2 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                    {/* Premium Icon Container */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-orange-500/40 blur-xl rounded-full animate-pulse" />
                        <div className={cn(
                            "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-800 dark:to-slate-950 border border-orange-200 dark:border-white/10 shadow-lg",
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
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="flex flex-col leading-none">
                            <span className={cn(
                                "font-black tracking-tighter bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(249,115,22,0.3)]",
                                size === 'lg' ? "text-5xl" : "text-3xl"
                            )}>
                                {streak}
                            </span>
                        </div>

                        <div className="h-6 w-px bg-orange-200 dark:bg-slate-700 block" />

                        <div className="flex flex-col leading-tight min-w-0 uppercase">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-900 dark:text-slate-100 tracking-[0.25em] whitespace-nowrap truncate">
                                {label}
                            </span>
                            <span className="text-[7px] sm:text-[8px] font-bold text-orange-600 dark:text-orange-500 tracking-widest mt-0.5 opacity-80">
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
                                        "bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300",
                                        "text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] border-none",
                                        size === 'lg' ? "h-12 px-6 rounded-xl" : "h-10 px-4 rounded-lg"
                                    )}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isClaiming ? <Sparkles className="animate-spin w-4 h-4" /> : <Gift className="w-4 h-4" />}
                                        {isClaiming ? 'Claiming...' : 'Get Bonus'}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-orange-500/[0.05] dark:bg-slate-900/50 border border-orange-500/10 dark:border-white/5"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-[8px] sm:text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
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
