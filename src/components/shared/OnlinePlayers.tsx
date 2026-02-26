import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OnlinePlayersProps {
    baseCount?: number;
    className?: string;
}

export const OnlinePlayers: React.FC<OnlinePlayersProps> = ({
    baseCount = 1240,
    className
}) => {
    const [count, setCount] = useState(baseCount);

    useEffect(() => {
        // Smartly changing online count
        const updateCount = () => {
            setCount(prev => {
                const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
                const newCount = prev + fluctuation;

                // Keep it within a reasonable range from baseCount
                if (newCount > baseCount + 50) return prev - Math.abs(fluctuation);
                if (newCount < baseCount - 50) return prev + Math.abs(fluctuation);

                return newCount;
            });
        };

        // Update every 3-8 seconds
        const timeout = setTimeout(updateCount, 3000 + Math.random() * 5000);
        return () => clearTimeout(timeout);
    }, [count, baseCount]);

    return (
        <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3", className)}>
            <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-[#1a1c2e] overflow-hidden bg-slate-800 shadow-xl">
                        <img src={`https://i.pravatar.cc/100?u=${i + 20}`} alt="" className="h-full w-full object-cover" />
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                <AnimatePresence mode="popLayout">
                    <motion.span
                        key={count}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.2 }}
                        className="text-[10px] font-black text-white tracking-widest uppercase inline-block drop-shadow-sm"
                    >
                        {count.toLocaleString()} Online
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
};
