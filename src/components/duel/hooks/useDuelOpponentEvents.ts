import { useEffect, useRef } from 'react';
import { useDuelStore } from '@/store/duelStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sounds } from '@/lib/sounds';

interface UseDuelOpponentEventsProps {
    duelId: string;
    profileId: string | null;
    state: any; // Realtime state
    finishDuel: (callerHasFinished?: boolean) => Promise<void>;
    transitionToResults: () => void;
    myPlayerId: string | null;
}

export function useDuelOpponentEvents({
    duelId,
    profileId,
    state,
    finishDuel,
    transitionToResults,
    myPlayerId
}: UseDuelOpponentEventsProps) {
    const players = useDuelStore(state => state.players);
    const isWaitingForOpponent = useDuelStore(state => state.isWaitingForOpponent);
    const hasFinishedMyQuestions = useDuelStore(state => state.hasFinishedMyQuestions);
    const duelStarted = useDuelStore(state => state.duelStarted); // Assuming this is in store, or we check state.duelStarted

    // Opponent State from Store
    const opponentName = useDuelStore(state => state.opponentName);
    const opponentScore = useDuelStore(state => state.opponentScore);
    const opponentActivityStatus = useDuelStore(state => state.opponentActivityStatus);
    const opponentLastSeen = useDuelStore(state => state.opponentLastSeen);

    // Actions
    const setOpponentScore = useDuelStore(state => state.setOpponentScore);
    const setOpponentActivityStatus = useDuelStore(state => state.setOpponentActivityStatus);

    const previousActivityStatusRef = useRef('online');
    const isVerifyingRef = useRef(false);
    const hasTransitionedRef = useRef(false);
    const lastRealtimeUpdateRef = useRef<number>(0);

    // 0. Update last realtime timestamp
    useEffect(() => {
        if (typeof state.opponentScore === 'number') {
            lastRealtimeUpdateRef.current = Date.now();
        }
    }, [state.opponentScore]);

    // 1. Polling for Bot Completion (Fallback)
    useEffect(() => {
        let pollingInterval: NodeJS.Timeout | null = null;
        if (isWaitingForOpponent && duelId && profileId) {
            const isBotDuel = players.some((p: any) => p.is_bot);
            if (isBotDuel) {
                pollingInterval = setInterval(() => {
                    finishDuel(true);
                }, 3000);
            }
        }
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [isWaitingForOpponent, duelId, profileId, players, finishDuel]);

    // 2. Opponent Status Notifications
    useEffect(() => {
        if (!opponentName || opponentActivityStatus === previousActivityStatusRef.current) return;

        const statusMessages: Record<string, { title: string; description: string; icon: string; duration: number }> = {
            online: {
                title: `${opponentName} вернулся`,
                description: 'Соперник снова онлайн',
                icon: '🟢',
                duration: 2000
            },
            thinking: {
                title: `${opponentName} думает`,
                description: 'Читает вопрос...',
                icon: '💭',
                duration: 1500
            },
            answering: {
                title: `${opponentName} отвечает!`,
                description: 'Торопится!',
                icon: '⚡',
                duration: 2000
            },
            reconnecting: {
                title: `${opponentName} переподключается`,
                description: 'Проблемы с соединением',
                icon: '🔄',
                duration: 3000
            },
            offline: {
                title: `${opponentName} офлайн`,
                description: 'Потеряно соединение',
                icon: '⚠️',
                duration: 3000
            }
        };

        const message = statusMessages[opponentActivityStatus];
        if (message && previousActivityStatusRef.current !== 'online') {
            toast.info(message.title, {
                description: message.description,
                duration: message.duration,
                icon: message.icon
            });
        }
        previousActivityStatusRef.current = opponentActivityStatus;
    }, [opponentActivityStatus, opponentName]);

    // 3. Opponent Reconnection Detection
    useEffect(() => {
        if (!opponentLastSeen || opponentActivityStatus !== 'online') return;

        const checkReconnection = () => {
            if (!opponentLastSeen) return;
            const now = Date.now();
            const lastSeen = opponentLastSeen ? new Date(opponentLastSeen).getTime() : 0;
            if (!lastSeen) return;

            const timeSinceLastSeen = now - lastSeen;
            if (timeSinceLastSeen > 5000 && previousActivityStatusRef.current === 'offline') {
                setOpponentActivityStatus('reconnecting');
                setTimeout(() => setOpponentActivityStatus('online'), 2000);
            }
        };

        const interval = setInterval(checkReconnection, 1000);
        return () => clearInterval(interval);
    }, [opponentLastSeen, opponentActivityStatus, setOpponentActivityStatus]);

    // 4. Opponent Answer Reaction (Immediate Score Update) & Finished Check
    useEffect(() => {
        // If score updated via Realtime
        if (state.opponentAnswered && state.opponentAnswerData) {
            if (state.opponentScore !== opponentScore) {
                setOpponentScore(state.opponentScore);
            }
        }

        // Check if this update signifies the end of the game (Emergency Check)
        // Если мы ждем соперника и счет обновился - возможно он закончил
        if (isWaitingForOpponent && hasFinishedMyQuestions) {
            const statusCheckTimeout = setTimeout(async () => {
                // ... logic to check status ...
                // This logic from original file seemed redundant with "Finish Verification" (#5)
                // But it included a "duel status check" specifically.
                try {
                    const { data: duel } = await supabase
                        .from('duels')
                        .select('status')
                        .eq('id', duelId)
                        .single();

                    if (duel?.status === 'finished' && !hasTransitionedRef.current) {
                        hasTransitionedRef.current = true;
                        try { if (sounds?.victory) sounds.victory(); } catch (e) { }
                        toast.info('🏁 Финиш! Подводим итоги...', { duration: 2000 });
                        transitionToResults();
                    }
                } catch (e) { console.error(e); }
            }, 1000);
            return () => clearTimeout(statusCheckTimeout);
        }

    }, [state.opponentAnswered, state.opponentAnswerData, state.opponentScore, opponentScore, setOpponentScore, isWaitingForOpponent, hasFinishedMyQuestions, duelId, transitionToResults]);


    // 5. Opponent Finish Verification (Realtime Trigger)
    useEffect(() => {
        if (state.duelFinished && isWaitingForOpponent && !isVerifyingRef.current) {
            console.log('[useDuelOpponentEvents] Verifying opponent completion...');
            isVerifyingRef.current = true;

            const verifyAndTransition = async () => {
                try {
                    const { data: playersList } = await supabase
                        .from('duel_players')
                        .select('id, user_id')
                        .eq('duel_id', duelId);

                    if (!playersList || playersList.length < 2) return;
                    const opponent = playersList.find((p: any) => p.user_id !== profileId);
                    if (!opponent) return;

                    const { data: duelInfo } = await supabase
                        .from('duels')
                        .select('num_questions')
                        .eq('id', duelId)
                        .single();
                    const requiredAnswers = duelInfo?.num_questions || 10;

                    const { count: opponentAnswers } = await supabase
                        .from('duel_answers')
                        .select('*', { count: 'exact', head: true })
                        .eq('player_id', opponent.id)
                        .eq('duel_id', duelId);

                    if ((opponentAnswers || 0) >= requiredAnswers) {
                        finishDuel(true);
                    } else {
                        isVerifyingRef.current = false;
                    }
                } catch (e) {
                    console.error(e);
                    isVerifyingRef.current = false;
                }
            };

            verifyAndTransition();
        }
    }, [state.duelFinished, isWaitingForOpponent, duelId, profileId, finishDuel]);

    // 6. Score Polling Fallback
    useEffect(() => {
        if (!duelId || !myPlayerId || !state.duelStarted || isWaitingForOpponent) return;

        const scoreCheckInterval = setInterval(async () => {
            try {
                // Если realtime обновлялся менее 5 секунд назад - пропускаем fallback
                const timeSinceRealtimeUpdate = Date.now() - lastRealtimeUpdateRef.current;
                if (timeSinceRealtimeUpdate < 5000) return;

                const { data: players, error } = await supabase
                    .from('duel_players')
                    .select('id, score, user_id')
                    .eq('duel_id', duelId);

                if (error || !players) return;

                const opponent = players.find((p: any) => p.user_id !== profileId);
                if (opponent && opponent.score > opponentScore) {
                    console.log('[useDuelOpponentEvents] Fallback score update', opponent.score);
                    setOpponentScore(opponent.score);
                }
            } catch (error) {
                console.error('[useDuelOpponentEvents] Error checking opponent score (fallback):', error);
            }
        }, 3000);

        return () => clearInterval(scoreCheckInterval);
    }, [duelId, myPlayerId, state.duelStarted, isWaitingForOpponent, opponentScore, setOpponentScore, profileId]);
}
