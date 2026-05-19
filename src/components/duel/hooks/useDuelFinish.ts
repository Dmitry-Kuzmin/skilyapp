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

        // Защита от двойного перехода — если Realtime/другой источник уже инициировал переход,
        // ничего не делаем.
        const alreadyTransitioning = !!(hasTransitionedRef && hasTransitionedRef.current);

        try {
            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: { action: 'finish_duel', duel_id: duelId, profile_id: profileId },
            });

            if (error) throw error;

            log('[DuelFinish] Finish duel response:', {
                finished: data?.finished,
                reason: data?.reason,
                success: data?.success,
            });

            if (data?.finished === true) {
                if (alreadyTransitioning) {
                    log('[DuelFinish] ⏭️ Already transitioning, skipping');
                    return;
                }
                if (hasTransitionedRef) hasTransitionedRef.current = true;

                sounds.victory();
                toast.success('🏁 Финиш! Подводим итоги...', { duration: 2000 });
                // Переход синхронный — без setTimeout, чтобы не было "флэша" битвы.
                // setIsWaitingForOpponent(false) НЕ вызываем здесь: transitionToResults
                // приведёт к смене mode на 'result' и размонтирует battle-вью целиком.
                transitionToResults(data);
                return;
            }

            // Сервер ещё не считает дуэль законченной
            if (callerHasFinished) {
                log('[DuelFinish] ⏳ Opponent still playing - showing waiting screen');
                setIsWaitingForOpponent(true);
                const firstName = opponentName.split(' ')[0];
                toast.info(`⏳ Ждём соперника (${firstName})...`, { duration: 3000 });
            } else {
                log('[DuelFinish] ⚠️ finish_duel returned not finished, ignoring (still have questions)');
            }
        } catch (err) {
            logError('[DuelFinish] ❌ Error finishing duel:', err);
            toast.error('Ошибка завершения дуэли, переходим к результатам');

            // КРИТИЧНО: даже при ошибке переходим к результатам, иначе пользователь
            // навсегда застрянет на экране ожидания. transitionToResults упадёт
            // обратно на fetch снапшота из БД.
            if (callerHasFinished && !alreadyTransitioning) {
                if (hasTransitionedRef) hasTransitionedRef.current = true;
                transitionToResults();
            }
        }
    }, [duelId, profileId, opponentName, setIsWaitingForOpponent, transitionToResults, hasTransitionedRef]);

    return { finishDuel };
}
