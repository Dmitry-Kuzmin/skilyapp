import { useEffect, useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';
import { useDuelTimeout } from '@/hooks/useDuelTimeout';
import { useServerTimer } from '@/hooks/useServerTimer';
import { DuelQuestion } from '@/types/duel';
import { useDuelStore } from '@/store/duelStore';

// Константы
const TIME_LIMIT_MS = 60000; // 60 секунд — должно совпадать с БД

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

    const { markQuestionStarted } = useServerTimer();

    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevTimerSecondsRef = useRef<number | null>(null);
    const currentIndexRef = useRef<number>(-1);
    const handleTimeoutRef = useRef(handleTimeout);
    const isInitializingRef = useRef(false);

    useEffect(() => {
        handleTimeoutRef.current = handleTimeout;
    }, [handleTimeout]);

    // ─────────────────────────────────────────────────────────────────────────
    // Основная логика: запускается при смене вопроса
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        // Не перезапускаем таймер, если вопрос не изменился и таймер уже тикает
        if (currentIndexRef.current === currentIndex && timerIntervalRef.current && questionEndTimeRef.current) {
            return;
        }

        currentIndexRef.current = currentIndex;

        // Чистим старый интервал
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

        const currentQuestion = questions[currentIndex];
        if (!currentQuestion?.id) {
            questionEndTimeRef.current = null;
            setTimeLeft(TIME_LIMIT_MS);
            return;
        }

        // Получаем myPlayerId из store для RPC
        const myPlayerId = useDuelStore.getState().myPlayerId;

        // Немедленно ставим 60 сек как placeholder до ответа сервера
        questionEndTimeRef.current = Date.now() + TIME_LIMIT_MS;
        setTimeLeft(TIME_LIMIT_MS);

        if (refreshExploits) {
            refreshExploits().catch(console.error);
        }

        // ── Инициализация авторитетного таймера с сервера ────────────────────
        const initServerTimer = async () => {
            if (isInitializingRef.current) return;
            isInitializingRef.current = true;

            try {
                const serverResult = await markQuestionStarted(duelId, myPlayerId, currentQuestion.id);

                if (serverResult && serverResult.remainingMs > 0) {
                    // КЛЮЧЕВАЯ ЛОГИКА: устанавливаем endTime на основе серверного оставшегося времени
                    const newEndTime = Date.now() + serverResult.remainingMs;
                    questionEndTimeRef.current = newEndTime;
                    setTimeLeft(serverResult.remainingMs);

                    // Если уже истекло по серверу — сразу таймаут
                    if (serverResult.remainingMs < 500) {
                        questionEndTimeRef.current = null;
                        setTimeLeft(0);
                        handleTimeoutRef.current?.().catch(console.error);
                        return;
                    }
                } else if (serverResult && serverResult.remainingMs <= 0) {
                    // Время вопроса уже истекло на сервере
                    questionEndTimeRef.current = null;
                    setTimeLeft(0);
                    handleTimeoutRef.current?.().catch(console.error);
                    return;
                }
                // Если RPC упал — остаётся локальный placeholder (деградация)
            } catch (err) {
                console.warn('[useDuelTimer] Server timer init failed, using local fallback:', err);
            } finally {
                isInitializingRef.current = false;
            }
        };

        initServerTimer();

        // ── Тиковый интервал (работает с questionEndTimeRef, который уже обновлён) ──
        const updateTimer = () => {
            if (!questionEndTimeRef.current) {
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }
                return;
            }

            const now = Date.now();
            const msRemaining = questionEndTimeRef.current - now;
            const secondsRemaining = Math.ceil(msRemaining / 1000) * 1000;
            const seconds = Math.ceil(msRemaining / 1000);

            // Haptics при последних секундах
            if (seconds <= 5 && seconds > 0 && seconds !== prevTimerSecondsRef.current) {
                if (seconds <= 2) {
                    haptics.timerCritical();
                } else {
                    haptics.timerPulse();
                }
                prevTimerSecondsRef.current = seconds;
            }

            if (msRemaining <= 0) {
                setTimeLeft(0);
                questionEndTimeRef.current = null;
                prevTimerSecondsRef.current = null;
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }
                handleTimeoutRef.current?.().catch(console.error);
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
    }, [currentIndex, questions.length, isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, duelId, setTimeLeft, refreshExploits, questionEndTimeRef, markQuestionStarted]);

    // ─────────────────────────────────────────────────────────────────────────
    // Обработка Visibility Change (компьютер заблокировался, вкладка скрылась)
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (
                document.visibilityState === 'visible' &&
                questionEndTimeRef.current &&
                !isAnswered &&
                !isWaitingForOpponent &&
                !hasFinishedMyQuestions
            ) {
                // КЛЮЧЕВАЯ ЛОГИКА: при возвращении считаем от сервера (questionEndTimeRef уже задан),
                // не сбрасываем таймер в 60 сек
                const now = Date.now();
                const msRemaining = questionEndTimeRef.current - now;

                if (msRemaining <= 0) {
                    setTimeLeft(0);
                    questionEndTimeRef.current = null;
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                    handleTimeoutRef.current?.();
                } else {
                    // Просто пересчитываем display — интервал уже тикает
                    setTimeLeft(Math.ceil(msRemaining / 1000) * 1000);

                    // Перезапускаем интервал если он остановился (браузер мог его заморозить)
                    if (!timerIntervalRef.current) {
                        timerIntervalRef.current = setInterval(() => {
                            if (!questionEndTimeRef.current) {
                                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                                return;
                            }
                            const n = Date.now();
                            const rem = questionEndTimeRef.current - n;
                            if (rem <= 0) {
                                setTimeLeft(0);
                                questionEndTimeRef.current = null;
                                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                                handleTimeoutRef.current?.();
                            } else {
                                setTimeLeft(Math.ceil(rem / 1000) * 1000);
                            }
                        }, 250);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, setTimeLeft, questionEndTimeRef]);

    return { handleTimeout };
}
