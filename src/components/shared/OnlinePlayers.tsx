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
    className?: string;
}

export const OnlinePlayers: React.FC<OnlinePlayersProps> = ({
    baseCount = 1240,
    players = [],
    currentUserPhoto,
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
            .filter(p => !p.isBot && p.photoUrl && p.id !== 'current-user')
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
    }, [players, currentUserPhoto]);

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
                        <Avatar className="h-8 w-8 ring-2 ring-[#a855f7] border-2 border-[#1a1c2e] shadow-xl">
                            <AvatarImage src={player.photoUrl || undefined} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-[10px] text-white font-bold">
                                {player.initials}
                            </AvatarFallback>
                        </Avatar>
                        {/* Индикатор онлайна на последнем аватаре или просто точка */}
                        {i === 0 && (
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-[#1a1c2e]" />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Счетчик в том же ряду */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg h-9">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <div className="flex items-baseline gap-1">
                    <NumberTicker
                        value={count}
                        className="text-[11px] font-black text-white tracking-widest"
                    />
                    <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                        Online
                    </span>
                </div>
            </div>
        </div>
    );
};
