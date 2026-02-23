import React from "react";
import { Zap, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface AchievementsHeaderProps {
    xp: number;
    level: number;
    unlockedCount: number;
    totalCount: number;
    completionPercent: number;
}

const XP_PER_LEVEL = 225;

export const AchievementsHeader = ({
    xp,
    level,
    unlockedCount,
    totalCount,
    completionPercent
}: AchievementsHeaderProps) => {
    return (
        <div className="flex flex-col sm:flex-row gap-3 p-3 sm:px-8 sm:pt-6 sm:pb-2">
            <div className="flex-1 flex items-center justify-between gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group shadow-xl">
                <div className="z-10 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] group-hover:scale-110 transition-transform duration-500">
                        <Zap size={16} className="fill-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] leading-none mb-1">Lvl {level}</p>
                        <p className="text-sm font-black tabular-nums leading-none tracking-tight">{xp.toLocaleString()} <span className="text-[10px] opacity-40 font-bold ml-1">XP</span></p>
                    </div>
                </div>
                <div className="z-10 text-right">
                    <p className="text-[10px] font-black text-primary mb-1.5 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">{Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)}%</p>
                    <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-between gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group shadow-xl">
                <div className="z-10 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-500">
                        <Trophy size={16} className="fill-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] leading-none mb-1">Достижения</p>
                        <p className="text-sm font-black tabular-nums leading-none tracking-tight">{unlockedCount} <span className="text-[10px] opacity-40 font-bold ml-1">/ {totalCount}</span></p>
                    </div>
                </div>
                <div className="z-10 text-right">
                    <p className="text-[10px] font-black text-emerald-500 mb-1.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{Math.round(completionPercent)}%</p>
                    <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
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
