import { useState } from 'react';

interface UseMasteryModeProps {
    isEnabled: boolean;
    totalQuestions: number;
}

/**
 * Хук для управления режимом Mastery (многораундовая практика)
 * 
 * Логика:
 * - Собираем ошибки в раунде
 * - Начинаем новый раунд с ошибками из предыдущего
 * - Продолжаем пока не будет 0 ошибок
 */
export const useMasteryMode = ({ isEnabled, totalQuestions }: UseMasteryModeProps) => {
    const [masteryWrongQuestions, setMasteryWrongQuestions] = useState<string[]>([]);
    const [masteryRound, setMasteryRound] = useState(1);

    const addWrongQuestion = (questionId: string) => {
        if (!isEnabled) return;

        if (!masteryWrongQuestions.includes(questionId)) {
            setMasteryWrongQuestions(prev => [...prev, questionId]);
        }
    };

    const startNextRound = () => {
        if (!isEnabled || masteryWrongQuestions.length === 0) return false;

        setMasteryRound(prev => prev + 1);
        return true; // Indicates new round started
    };

    const resetMastery = () => {
        setMasteryWrongQuestions([]);
        setMasteryRound(1);
    };

    const isRoundComplete = (currentIndex: number) => {
        return currentIndex >= totalQuestions - 1;
    };

    const shouldContinue = () => {
        return masteryWrongQuestions.length > 0;
    };

    return {
        masteryWrongQuestions,
        setMasteryWrongQuestions,
        masteryRound,
        setMasteryRound,
        addWrongQuestion,
        startNextRound,
        resetMastery,
        isRoundComplete,
        shouldContinue
    };
};
