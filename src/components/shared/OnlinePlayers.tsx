import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { AvatarGroup } from './AvatarGroup';
import { useOnlinePlayers } from '@/hooks/useGamesData';

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
    variant?: 'default' | 'white';
}

export const OnlinePlayers: React.FC<OnlinePlayersProps> = ({
    baseCount = 1240,
    players: playersProp,
    currentUserPhoto,
    currentUserId,
    className,
    variant = 'default'
}) => {
    const [count, setCount] = useState(baseCount);

    // Если players не переданы снаружи — загружаем сами
    const { data: fetchedData } = useOnlinePlayers();
    const players = playersProp ?? fetchedData?.players ?? [];

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

        // No fake placeholders — show only real users

        return list.slice(0, 4);
    }, [players, currentUserPhoto, currentUserId]);

    return (
        <div className={cn(
            "inline-flex items-center gap-3 p-1.5 pr-4 rounded-full transition-all h-11 group",
            variant === 'default' 
                ? "bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/40"
                : "bg-white/10 border border-white/20 backdrop-blur-md hover:bg-white/20 hover:border-white/30 shadow-lg",
            className
        )}>
            {/* Аватарки с наложением */}
            <AvatarGroup 
                avatars={combinedPlayers}
                ringColor={variant === 'default' ? "ring-background" : "ring-blue-600"}
                size="md"
                overlap={-12}
                className="pl-1"
            />

            {/* Счетчик и индикатор Live */}
            <div className="flex items-center gap-2.5">
                {/* Анимированный индикатор "Live" */}
                <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <NumberTicker
                        value={count}
                        useSeparator={false}
                        className={cn(
                            "text-[15px] font-black tabular-nums",
                            variant === 'default' ? "text-blue-700 dark:text-blue-100" : "text-white"
                        )}
                    />
                    <span className={cn(
                        "text-[10px] font-black tracking-wider uppercase",
                        variant === 'default' ? "text-blue-600/70 dark:text-blue-300/50" : "text-white/70"
                    )}>
                        В СЕТИ
                    </span>
                </div>
            </div>
        </div>
    );
};
