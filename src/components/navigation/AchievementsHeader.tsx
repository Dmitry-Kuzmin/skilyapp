import React from "react";
import { Zap, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AchievementsHeaderProps {
    xp: number;
    level: number;
    unlockedCount: number;
    totalCount: number;
    completionPercent: number;
    isCompact?: boolean;
}

const XP_PER_LEVEL = 225;

export const AchievementsHeader = ({
    xp,
    level,
    unlockedCount,
    totalCount,
    completionPercent,
    isCompact = false
}: AchievementsHeaderProps) => {
    return (
        <div className={cn(
            "flex flex-row gap-2 sm:gap-3",
            isCompact ? "p-0" : "p-3 sm:px-8 sm:pt-6 sm:pb-2"
        )}>
            {/* XP Block */}
            <div className={cn(
                "flex-1 flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group shadow-lg",
                isCompact && "min-w-0"
            )}>
                <div className="z-10 flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="shrink-0 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] group-hover:scale-110 transition-transform duration-500">
                        <Zap size={isCompact ? 14 : 16} className="fill-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] sm:tracking-[0.15em] leading-none mb-0.5 sm:mb-1 truncate">Lvl {level}</p>
                        <p className="text-xs sm:text-sm font-black tabular-nums leading-none tracking-tight truncate">{xp.toLocaleString()} <span className="text-[8px] sm:text-[10px] opacity-40 font-bold ml-0.5 sm:ml-1">XP</span></p>
                    </div>
                </div>
                <div className="z-10 text-right shrink-0 hidden xs:block">
                    <p className="text-[8px] sm:text-[10px] font-black text-primary mb-1 sm:mb-1.5 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">{Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)}%</p>
                    <div className="w-10 sm:w-14 h-1 sm:h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]"
                        />
                    </div>
                </div>
            </div>

            {/* Achievements Block */}
            <div className={cn(
                "flex-1 flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group shadow-lg",
                isCompact && "min-w-0"
            )}>
                <div className="z-10 flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="shrink-0 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-500">
                        <Trophy size={isCompact ? 14 : 16} className="fill-emerald-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] sm:tracking-[0.15em] leading-none mb-0.5 sm:mb-1 truncate italic sm:not-italic">Достижения</p>
                        <p className="text-xs sm:text-sm font-black tabular-nums leading-none tracking-tight truncate">{unlockedCount} <span className="text-[8px] sm:text-[10px] opacity-40 font-bold ml-0.5 sm:ml-1">/ {totalCount}</span></p>
                    </div>
                </div>
                <div className="z-10 text-right shrink-0 hidden xs:block">
                    <p className="text-[8px] sm:text-[10px] font-black text-emerald-500 mb-1 sm:mb-1.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{Math.round(completionPercent)}%</p>
                    <div className="w-10 sm:w-14 h-1 sm:h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completionPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
