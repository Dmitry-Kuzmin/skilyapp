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
    const players = useDuelStore(s => s.players);
    const isWaitingForOpponent = useDuelStore(s => s.isWaitingForOpponent);
    const hasFinishedMyQuestions = useDuelStore(s => s.hasFinishedMyQuestions);

    const opponentName = useDuelStore(s => s.opponentName);
    const opponentScore = useDuelStore(s => s.opponentScore);
    const opponentActivityStatus = useDuelStore(s => s.opponentActivityStatus);

    const setOpponentScore = useDuelStore(s => s.setOpponentScore);
    const setOpponentActivityStatus = useDuelStore(s => s.setOpponentActivityStatus);

    // ─── 2 critical refs ──────────────────────────────────────────────────────
    const isVerifyingRef = useRef(false);
    const hasTransitionedRef = useRef(false);

    // ─── Effect 1: Polling for completion when waiting ────────────────────────
    // Bot: 3s (fast), PvP: 8s (fallback if Realtime missed the finish event)
    useEffect(() => {
        if (!isWaitingForOpponent || !duelId || !profileId) return;
        const isBotDuel = players.some((p: any) => p.is_bot);
        const interval = setInterval(() => {
            finishDuel(true);
        }, isBotDuel ? 3000 : 8000);
        return () => clearInterval(interval);
    }, [isWaitingForOpponent, duelId, profileId, players, finishDuel]);

    // ─── Effect 2: Realtime-driven events ────────────────────────────────────
    // Handles: score updates, status notifications, finish verification,
    // score polling fallback (every 5s when duel active)
    useEffect(() => {
        // 2a. Score update from realtime
        if (typeof state.opponentScore === 'number' && state.opponentScore !== opponentScore) {
            setOpponentScore(state.opponentScore);
        }

        // 2b. Finish verification triggered by realtime duelFinished event
        if (state.duelFinished && isWaitingForOpponent && !isVerifyingRef.current) {
            isVerifyingRef.current = true;

            (async () => {
                try {
                    const { data: playersList } = await supabase
                        .from('duel_players')
                        .select('id, user_id')
                        .eq('duel_id', duelId);

                    if (!playersList || playersList.length < 2) {
                        isVerifyingRef.current = false;
                        return;
                    }
                    const opponent = playersList.find((p: any) => p.user_id !== profileId);
                    if (!opponent) { isVerifyingRef.current = false; return; }

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
                } catch {
                    isVerifyingRef.current = false;
                }
            })();
        }

        // 2c. Emergency check: if waiting and opponent score arrived, check if duel finished
        if (isWaitingForOpponent && hasFinishedMyQuestions && state.opponentAnswered) {
            const timer = setTimeout(async () => {
                if (hasTransitionedRef.current) return;
                try {
                    const { data: duel } = await supabase
                        .from('duels')
                        .select('status')
                        .eq('id', duelId)
                        .single();
                    if (duel?.status === 'finished' && !hasTransitionedRef.current) {
                        hasTransitionedRef.current = true;
                        try { sounds.victory(); } catch { /* ignore */ }
                        toast.info('🏁 Финиш! Подводим итоги...', { duration: 2000 });
                        transitionToResults();
                    }
                } catch { /* ignore */ }
            }, 1000);
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.opponentScore, state.duelFinished, state.opponentAnswered, isWaitingForOpponent, hasFinishedMyQuestions]);

    // ─── Status notification (separate small effect — reads single store field) ─
    // Kept separate so it only re-runs when opponentActivityStatus changes,
    // not on every realtime event. Tracks previous via closure-local variable.
    const prevStatusRef = useRef<string>('online');
    useEffect(() => {
        if (!opponentName || opponentActivityStatus === prevStatusRef.current) return;

        const statusMessages: Record<string, { title: string; description: string; icon: string; duration: number }> = {
            online: { title: `${opponentName} вернулся`, description: 'Соперник снова онлайн', icon: '🟢', duration: 2000 },
            thinking: { title: `${opponentName} думает`, description: 'Читает вопрос...', icon: '💭', duration: 1500 },
            answering: { title: `${opponentName} отвечает!`, description: 'Торопится!', icon: '⚡', duration: 2000 },
            reconnecting: { title: `${opponentName} переподключается`, description: 'Проблемы с соединением', icon: '🔄', duration: 3000 },
            offline: { title: `${opponentName} офлайн`, description: 'Потеряно соединение', icon: '⚠️', duration: 3000 },
        };

        const message = statusMessages[opponentActivityStatus];
        // Show notification only when transitioning FROM non-online status
        if (message && prevStatusRef.current !== 'online') {
            toast.info(message.title, { description: message.description, duration: message.duration, icon: message.icon });
        }
        prevStatusRef.current = opponentActivityStatus;
    }, [opponentActivityStatus, opponentName]);

    // ─── Score polling fallback ────────────────────────────────────────────────
    // Polls every 5s when duel is active (not waiting) as a safety net for Realtime misses
    useEffect(() => {
        if (!duelId || !myPlayerId || isWaitingForOpponent) return;

        const interval = setInterval(async () => {
            try {
                const { data: playersList } = await supabase
                    .from('duel_players')
                    .select('id, score, user_id')
                    .eq('duel_id', duelId);

                if (!playersList) return;
                const opponent = playersList.find((p: any) => p.user_id !== profileId);
                if (opponent && typeof opponent.score === 'number' && opponent.score > opponentScore) {
                    setOpponentScore(opponent.score);
                }
            } catch { /* ignore */ }
        }, 5000);

        return () => clearInterval(interval);
    }, [duelId, myPlayerId, isWaitingForOpponent, opponentScore, setOpponentScore, profileId]);
}
