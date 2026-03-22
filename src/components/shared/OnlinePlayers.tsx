import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface OnlinePlayer {
    id: string;
    name: string;
    photoUrl: string | null;
    initials: string;
    isBot?: boolean;
}

interface OnlinePlayersProps {
    baseCount?: number;
    players?: OnlinePlayer[];
    currentUserPhoto?: string | null;
    currentUserId?: string | null;
    className?: string;
}

export const OnlinePlayers: React.FC<OnlinePlayersProps> = ({
    baseCount = 1240,
    players = [],
    currentUserPhoto,
    currentUserId,
    className
}) => {
    const [count, setCount] = useState(baseCount);

    useEffect(() => {
        const updateCount = () => {
            setCount(prev => {
                const fluctuation = Math.floor(Math.random() * 11) - 5; // -5 to +5
                const newCount = prev + fluctuation;
                if (newCount > baseCount + 100) return prev - 3;
                if (newCount < baseCount - 100) return prev + 3;
                return newCount;
            });
        };

        const timeout = setTimeout(updateCount, 1500 + Math.random() * 3000);
        return () => clearTimeout(timeout);
    }, [count, baseCount]);

    // Комбинируем игроков: Текущий пользователь + Реальные игроки + Боты (если нужно)
    const combinedPlayers = useMemo(() => {
        const list: OnlinePlayer[] = [];

        // 1. Текущий пользователь - ВСЕГДА ПЕРВЫЙ если фото есть
        if (currentUserPhoto) {
            list.push({
                id: 'current-user',
                name: 'You',
                photoUrl: currentUserPhoto,
                initials: 'ME'
            });
        }

        // 2. Реальные игроки (те, у кого есть фото и это не боты)
        const realPlayers = players
            .filter(p => !p.isBot && p.photoUrl && p.id !== 'current-user' && p.id !== currentUserId)
            .sort(() => Math.random() - 0.5) // Перемешиваем реальных
            .slice(0, 4 - list.length);

        list.push(...realPlayers);

        // 3. Fallback боты (если мало реальных)
        if (list.length < 4) {
            const bots = players
                .filter(p => p.isBot)
                .sort(() => Math.random() - 0.5)
                .slice(0, 4 - list.length);
            list.push(...bots);
        }

        // 4. PLACEHOLDERS (только если совсем пусто)
        if (list.length < 4) {
            const placeholders = [
                { id: 'p1', name: 'A', photoUrl: 'https://i.pravatar.cc/100?u=1', initials: 'A' },
                { id: 'p2', name: 'B', photoUrl: 'https://i.pravatar.cc/100?u=2', initials: 'B' },
                { id: 'p3', name: 'C', photoUrl: 'https://i.pravatar.cc/100?u=3', initials: 'C' },
                { id: 'p4', name: 'D', photoUrl: 'https://i.pravatar.cc/100?u=4', initials: 'D' },
            ].slice(0, 4 - list.length);
            list.push(...placeholders);
        }

        return list.slice(0, 4);
    }, [players, currentUserPhoto, currentUserId]);

    return (
        <div className={cn("flex flex-row items-center gap-3", className)}>
            {/* Аватарки в один ряд с наложением */}
            <div className="flex -space-x-2.5 items-center">
                {combinedPlayers.map((player, i) => (
                    <motion.div
                        key={player.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative"
                    >
                        <Avatar className="h-8 w-8 ring-[1px] ring-white/5 border-none shadow-2xl transition-transform hover:scale-110">
                            <AvatarImage src={player.photoUrl || undefined} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-[10px] text-white font-bold">
                                {player.initials}
                            </AvatarFallback>
                        </Avatar>
                    </motion.div>
                ))}
            </div>

            {/* Счетчик в том же ряду */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)] h-9 relative group">
                {/* Анимированный индикатор "Live" */}
                <div className="flex items-center gap-1.5">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <NumberTicker
                            value={count}
                            useSeparator={false}
                            className="text-[14px] font-black text-indigo-100 dark:text-white"
                        />
                        <span className="text-[9px] font-black text-indigo-400/80 dark:text-indigo-300/60 tracking-[0.1em] uppercase ml-1">
                            В СЕТИ
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
