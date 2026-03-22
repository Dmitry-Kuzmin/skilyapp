import { useCallback } from 'react';
import type React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';

const getIsDev = () => Boolean(import.meta.env.DEV);
const log = (...args: any[]) => { if (getIsDev()) console.log(...args); };
const logError = (...args: any[]) => { if (getIsDev()) console.error(...args); };

interface UseDuelFinishProps {
    duelId: string;
    profileId: string | null;
    opponentName: string;
    setIsWaitingForOpponent: (waiting: boolean) => void;
    transitionToResults: (serverData?: any) => void;
    hasTransitionedRef?: React.MutableRefObject<boolean>;
}

export function useDuelFinish({
    duelId,
    profileId,
    opponentName,
    setIsWaitingForOpponent,
    transitionToResults,
    hasTransitionedRef,
}: UseDuelFinishProps) {

    const finishDuel = useCallback(async (callerHasFinished?: boolean) => {
        log('[DuelFinish] Finishing duel - I completed all questions');

        // Artificial delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: { action: 'finish_duel', duel_id: duelId, profile_id: profileId },
            });

            if (error) throw error;

            log('[DuelFinish] Finish duel response:', {
                finished: data?.finished,
                reason: data?.reason,
                message: data?.message,
                success: data?.success
            });

            // If both players finished (server says so)
            if (data?.finished === true) {
                log('[DuelFinish] ✅ Both players finished, going to results');

                // FIX: Защита от двойного перехода — Realtime может также вызвать transitionToResults
                if (hasTransitionedRef && hasTransitionedRef.current) {
                    log('[DuelFinish] ⏭️ Already transitioning (Realtime beat us), skipping');
                    return;
                }
                if (hasTransitionedRef) hasTransitionedRef.current = true;

                setIsWaitingForOpponent(false);
                sounds.victory();
                toast.success('🏁 Финиш! Подводим итоги...', { duration: 2000 });

                setTimeout(() => {
                    transitionToResults(data);
                }, 300);
            } else {
                // If opponent is still playing
                if (callerHasFinished) {
                    log('[DuelFinish] ⏳ Opponent still playing - showing waiting screen');

                    setIsWaitingForOpponent(true);
                    const getFirstName = (fullName: string) => fullName.split(' ')[0];
                    toast.info(`⏳ Ждём соперника (${getFirstName(opponentName)})...`, { duration: 3000 });
                } else {
                    log('[DuelFinish] ⚠️ finish_duel returned not finished, but I still have questions. Ignoring.');
                }
            }
        } catch (error) {
            logError('[DuelFinish] ❌ Error finishing duel:', error);
            toast.error('Ошибка завершения дуэли');
            // On error, we keep the user on the waiting screen (if they were waiting) or current screen
        }
    }, [duelId, profileId, opponentName, setIsWaitingForOpponent, transitionToResults]);

    return { finishDuel };
}
