import { useState } from 'react';

/**
 * Универсальный хук для режимов с повтором ошибок (Mastery, Marathon).
 *
 * Логика:
 * - Собираем ошибочные вопросы в массив
 * - При завершении раунда (finishTest) запускаем раунд 2 только из ошибок
 * - Продолжаем пока ошибок не останется — тогда победа
 */

interface UseRoundRetryModeProps {
    isEnabled: boolean;
}

export const useRoundRetryMode = ({ isEnabled }: UseRoundRetryModeProps) => {
    const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([]);
    const [round, setRound] = useState(1);

    const addWrongQuestion = (questionId: string) => {
        if (!isEnabled) return;
        setWrongQuestionIds(prev =>
            prev.includes(questionId) ? prev : [...prev, questionId]
        );
    };

    const resetRound = () => {
        setWrongQuestionIds([]);
        setRound(prev => prev + 1);
    };

    const reset = () => {
        setWrongQuestionIds([]);
        setRound(1);
    };

    return {
        wrongQuestionIds,
        setWrongQuestionIds,
        round,
        setRound,
        addWrongQuestion,
        resetRound,
        reset,
    };
};
