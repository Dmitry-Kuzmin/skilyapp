import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useDuelTimeout } from '@/hooks/useDuelTimeout';
import { DuelQuestion } from '@/types/duel';

// Константы
const TIME_LIMIT_MS = 60000; // 60 seconds

interface UseDuelTimerProps {
    duelId: string;
    profileId: string | null;
    questions: DuelQuestion[];
    currentIndex: number;
    isAnswered: boolean;
    isWaitingForOpponent: boolean;
    hasFinishedMyQuestions: boolean;
    setTimeLeft: (time: number) => void;
    setMyScore: (score: number) => void;
    setCombo: (combo: number) => void;
    setIsAnswered: (isAnswered: boolean) => void;
    setHasFinishedMyQuestions: (finished: boolean) => void;
    isFinishingRef: React.MutableRefObject<boolean>;
    moveToNextQuestion: () => void;
    finishDuel: (callerHasFinished?: boolean) => Promise<void>;
    refreshExploits?: () => Promise<any>;
    questionEndTimeRef: React.MutableRefObject<number | null>;
}

export function useDuelTimer({
    duelId,
    profileId,
    questions,
    currentIndex,
    isAnswered,
    isWaitingForOpponent,
    hasFinishedMyQuestions,
    setTimeLeft,
    setMyScore,
    setCombo,
    setIsAnswered,
    setHasFinishedMyQuestions,
    isFinishingRef,
    moveToNextQuestion,
    finishDuel,
    refreshExploits,
    questionEndTimeRef
}: UseDuelTimerProps) {

    // Внутренний хук для обработки таймаута
    const { handleTimeout } = useDuelTimeout({
        duelId,
        profileId,
        questions,
        currentIndex,
        isAnswered,
        setMyScore,
        setCombo,
        setIsAnswered,
        setHasFinishedMyQuestions,
        isFinishingRef,
        moveToNextQuestion,
        finishDuel,
    });

    // Локальные рефы
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevTimerSecondsRef = useRef<number | null>(null);
    const currentIndexRef = useRef<number>(-1);
    const handleTimeoutRef = useRef(handleTimeout);

    // Обновляем ref при изменении handleTimeout
    useEffect(() => {
        handleTimeoutRef.current = handleTimeout;
    }, [handleTimeout]);

    // Основная логика таймера
    useEffect(() => {
        // Проверяем смену вопроса
        if (currentIndexRef.current === currentIndex && timerIntervalRef.current && questionEndTimeRef.current) {
            return;
        }

        currentIndexRef.current = currentIndex;

        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        // Проверяем условия запуска
        if (!questions.length || isAnswered || isWaitingForOpponent || hasFinishedMyQuestions) {
            questionEndTimeRef.current = null;
            setTimeLeft(TIME_LIMIT_MS);
            return;
        }

        if (currentIndex < 0 || currentIndex >= questions.length) {
            questionEndTimeRef.current = null;
            setTimeLeft(TIME_LIMIT_MS);
            return;
        }

        // Устанавливаем время
        const targetTime = Date.now() + TIME_LIMIT_MS;
        questionEndTimeRef.current = targetTime;
        setTimeLeft(TIME_LIMIT_MS);

        // Принудительно обновляем эксплойты
        if (refreshExploits) {
            refreshExploits().catch(console.error);
        }

        const updateTimer = () => {
            if (!questionEndTimeRef.current) {
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }
                return;
            }

            const now = Date.now();
            const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000;
            const seconds = Math.ceil(secondsRemaining / 1000);

            // Haptics
            if (seconds <= 5 && seconds > 0 && seconds !== prevTimerSecondsRef.current) {
                if (seconds <= 2) {
                    haptics.timerCritical();
                } else {
                    haptics.timerPulse();
                }
                prevTimerSecondsRef.current = seconds;
            }

            if (secondsRemaining <= 0) {
                setTimeLeft(0);
                questionEndTimeRef.current = null;
                prevTimerSecondsRef.current = null;
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }

                if (handleTimeoutRef.current) {
                    handleTimeoutRef.current().catch(console.error);
                }
            } else {
                setTimeLeft(secondsRemaining);
            }
        };

        timerIntervalRef.current = setInterval(updateTimer, 250);
        updateTimer();

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [currentIndex, questions.length, isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, setTimeLeft, refreshExploits, questionEndTimeRef]);


    // Обработка Visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && questionEndTimeRef.current && !isAnswered && !isWaitingForOpponent && !hasFinishedMyQuestions) {
                const now = Date.now();
                const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000;

                if (secondsRemaining <= 0) {
                    setTimeLeft(0);
                    questionEndTimeRef.current = null;
                    if (timerIntervalRef.current) {
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null;
                    }
                    if (handleTimeoutRef.current) handleTimeoutRef.current();
                } else {
                    setTimeLeft(secondsRemaining);
                    if (timerIntervalRef.current) {
                        clearInterval(timerIntervalRef.current);
                    }
                    timerIntervalRef.current = setInterval(() => {
                        // Simplified inner logic for restart (reusing updateTimer logic would be cleaner but this works)
                        if (!questionEndTimeRef.current) {
                            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                            return;
                        }
                        const n = Date.now();
                        const rem = Math.ceil((questionEndTimeRef.current - n) / 1000) * 1000;
                        if (rem <= 0) {
                            setTimeLeft(0);
                            questionEndTimeRef.current = null;
                            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                            if (handleTimeoutRef.current) handleTimeoutRef.current();
                        } else {
                            setTimeLeft(rem);
                        }
                    }, 250);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, setTimeLeft, questionEndTimeRef]);

    return { handleTimeout };
}
