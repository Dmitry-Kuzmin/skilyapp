import { useState } from 'react';

type RedemptionStep = 'reflection' | 'drill' | 'completed';

interface UseRedemptionModeProps {
    isEnabled: boolean;
    failedQuestions: any[];
}

/**
 * Хук для управления режимом Redemption (восстановление навыков)
 * 
 * Логика:
 * 1. Reflection: повторное изучение ошибок
 * 2. Drill: контрольные вопросы
 */
export const useRedemptionMode = ({ isEnabled, failedQuestions }: UseRedemptionModeProps) => {
    const [redemptionStep, setRedemptionStep] = useState<RedemptionStep>('reflection');
    const [showReflectionOverlay, setShowReflectionOverlay] = useState(false);
    const [redemptionOriginalCount] = useState(failedQuestions.length);
    const [lastRedemptionAnswerTimestamp, setLastRedemptionAnswerTimestamp] = useState(0);

    const handleReflectionAnswer = (isCorrect: boolean, currentIndex: number) => {
        if (!isEnabled) return null;

        if (redemptionStep === 'reflection') {
            if (!isCorrect) {
                // Deep Dive Loop: show theory again
                setShowReflectionOverlay(true);
                return { action: 'show-overlay' };
            } else {
                // Correct! Proceed to next or drill
                const isLastOriginal = (currentIndex + 1) === redemptionOriginalCount;
                if (isLastOriginal) {
                    setRedemptionStep('drill');
                    return { action: 'transition-to-drill' };
                } else {
                    return { action: 'next-question' };
                }
            }
        }

        if (redemptionStep === 'drill') {
            if (!isCorrect) {
                return { action: 'fail-redemption' };
            } else {
                return { action: 'continue-drill' };
            }
        }

        return null;
    };

    return {
        redemptionStep,
        setRedemptionStep,
        showReflectionOverlay,
        setShowReflectionOverlay,
        redemptionOriginalCount,
        lastRedemptionAnswerTimestamp,
        setLastRedemptionAnswerTimestamp,
        handleReflectionAnswer
    };
};
