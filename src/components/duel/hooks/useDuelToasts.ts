import { useCallback, useEffect, useRef } from 'react';

export interface DuelToastEntry {
    id: string;
    type: 'opponent-correct' | 'opponent-wrong' | 'opponent-skip' | 'points' | 'combo' | 'info';
    title: string;
    message: string;
    icon?: string;
    ttlMs: number;
    createdAt: number;
}

export type ToastNotification = {
    id: string;
    type?: DuelToastEntry['type'];
    title: string;
    message: string;
    icon?: string;
};

interface UseDuelToastsProps {
    toastNotifications: ToastNotification[];
    setToastNotifications: (updater: ToastNotification[] | ((prev: ToastNotification[]) => ToastNotification[])) => void;
}

const MAX_STACK = 2;

/**
 * Owns the lifecycle of duel toasts.
 *
 * Why a dedicated hook + ref-based timers:
 *   The previous inline implementation registered the dismiss setTimeout inside a
 *   useEffect that depended on rapidly-changing values (myScore, opponentScore...).
 *   Every re-run triggered the effect cleanup, which called clearTimeout — so the
 *   toasts never auto-dismissed and stacked up forever. Storing timers in a ref
 *   that's only cleared on unmount fixes the race.
 */
export function useDuelToasts({ toastNotifications, setToastNotifications }: UseDuelToastsProps) {
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const seenKeysRef = useRef<Set<string>>(new Set());

    // Cleanup all timers on unmount
    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach(t => clearTimeout(t));
            timers.clear();
        };
    }, []);

    const dismissToast = useCallback((id: string) => {
        const t = timersRef.current.get(id);
        if (t) {
            clearTimeout(t);
            timersRef.current.delete(id);
        }
        setToastNotifications((prev: ToastNotification[]) => prev.filter((n: ToastNotification) => n.id !== id));
    }, [setToastNotifications]);

    const pushToast = useCallback((entry: Omit<DuelToastEntry, 'createdAt'>) => {
        const fullEntry: ToastNotification = {
            id: entry.id,
            type: entry.type,
            title: entry.title,
            message: entry.message,
            icon: entry.icon,
        };

        setToastNotifications((prev: ToastNotification[]) => {
            // Cap stack: dismiss oldest if at capacity
            let next = [...prev];
            while (next.length >= MAX_STACK) {
                const evicted = next.shift();
                if (evicted) {
                    const handle = timersRef.current.get(evicted.id);
                    if (handle) {
                        clearTimeout(handle);
                        timersRef.current.delete(evicted.id);
                    }
                }
            }
            next.push(fullEntry);
            return next;
        });

        const handle = setTimeout(() => {
            timersRef.current.delete(entry.id);
            setToastNotifications((prev: ToastNotification[]) => prev.filter((n: ToastNotification) => n.id !== entry.id));
        }, entry.ttlMs);
        timersRef.current.set(entry.id, handle);
    }, [setToastNotifications]);

    /**
     * Dedup helper: returns true if this key has been seen and registers it.
     * Used to prevent duplicate toasts when both duel_notifications and
     * duel_answers channels fire for the same logical opponent answer.
     */
    const claimKey = useCallback((key: string): boolean => {
        if (seenKeysRef.current.has(key)) return false;
        seenKeysRef.current.add(key);
        // Prevent unbounded growth — cap to last 200 keys
        if (seenKeysRef.current.size > 200) {
            const first = seenKeysRef.current.values().next().value;
            if (first) seenKeysRef.current.delete(first);
        }
        return true;
    }, []);

    return { pushToast, dismissToast, claimKey };
}

// ─── Message composition ──────────────────────────────────────────────────────

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface ComposeOpponentArgs {
    isCorrect: boolean;
    isSkipped: boolean;
    name: string;
    points: number;
    gap: number; // opponentScore - myScore
    combo: number;
    errorStreak: number;
}

export function composeOpponentMessage(args: ComposeOpponentArgs): { title: string; message: string; icon: string } {
    const { isCorrect, isSkipped, name, points, gap, combo, errorStreak } = args;

    // Skipped — clear cue, no ambiguity
    if (isSkipped) {
        return {
            icon: '⏭️',
            title: `${name} пропустил`,
            message: pick([
                'Вопрос ушёл без ответа — твой бонус',
                'Соперник сдался. Ускоряйся',
                'Пропуск! Не повторяй за ним',
            ]),
        };
    }

    // Special: combo streak
    if (isCorrect && combo >= 3) {
        return {
            icon: '🔥',
            title: `${name}: серия ${combo}!`,
            message: pick([
                'Опасный темп — нужно ломать',
                'Соперник в потоке. Сбей ритм',
                'Серия растёт. Атакуй',
            ]),
        };
    }

    // Special: error streak
    if (!isCorrect && errorStreak >= 2) {
        return {
            icon: '💥',
            title: `${name}: ${errorStreak} промаха подряд`,
            message: pick([
                'Лови момент — забирай очки',
                'Соперник плывёт. Дави',
                'Идеальный шанс оторваться',
            ]),
        };
    }

    if (isCorrect) {
        const pts = points > 0 ? ` +${points}` : '';
        if (gap > 0) {
            // Opponent ahead
            return {
                icon: '⚡',
                title: `${name}${pts}`,
                message: pick([
                    `Впереди на ${gap}. Не сдавайся!`,
                    `Разрыв ${gap}. Поджимай`,
                    `${name} в отрыве на ${gap}. Подтягивайся`,
                ]),
            };
        }
        if (gap === 0) {
            return {
                icon: '⚖️',
                title: `${name}${pts}`,
                message: pick([
                    'Равный счёт. Кто первый сорвётся?',
                    'Очко в очко — момент истины',
                    'Ничья. Рви вперёд',
                ]),
            };
        }
        // You ahead
        return {
            icon: '🛡️',
            title: `${name}${pts}`,
            message: pick([
                `Ты ведёшь на ${-gap}. Держи темп`,
                `Преимущество ${-gap}. Не расслабляйся`,
                `${name} пытается догнать. Не дай`,
            ]),
        };
    }

    // Wrong answer
    if (gap > 0) {
        return {
            icon: '🎯',
            title: `${name} промахнулся!`,
            message: pick([
                'Сокращай разрыв — твой шанс',
                'Ошибка соперника. Лови момент',
                `Разрыв ${gap}. Сейчас или никогда`,
            ]),
        };
    }
    if (gap === 0) {
        return {
            icon: '🎯',
            title: `${name} ошибся!`,
            message: pick([
                'Выйди вперёд',
                'Твой момент — рви',
                'Бери лидерство',
            ]),
        };
    }
    return {
        icon: '👑',
        title: `${name} ошибся!`,
        message: pick([
            `Отрывайся ещё — ведёшь на ${-gap}`,
            `Лидерство ${-gap}. Закрепляй`,
            'Соперник плывёт. Используй',
        ]),
    };
}

interface ComposeMyPointsArgs {
    points: number;
    combo: number;
}

export function composeMyPointsMessage({ points, combo }: ComposeMyPointsArgs): { title: string; message: string; icon: string } {
    if (combo >= 5) {
        return {
            icon: '🔥',
            title: `+${points} • серия ${combo}!`,
            message: pick(['Огонь! Не сбавляй', 'Идеальный поток', 'Так держать']),
        };
    }
    if (combo >= 3) {
        return {
            icon: '⚡',
            title: `+${points} • x${combo}`,
            message: pick(['Серия растёт', 'Темп взят', 'Продолжай']),
        };
    }
    return {
        icon: '✅',
        title: `+${points}`,
        message: pick(['Верный ответ!', 'Точно в цель', 'Так держать']),
    };
}
