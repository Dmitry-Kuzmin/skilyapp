import { useEffect } from 'react';
import { saveTestProgress, clearTestProgress } from '@/utils/testStorage';
import { TestMode } from '@/store/examStore';

interface Answer {
    questionId: string;
    selectedAnswerId: string;
    isCorrect: boolean;
}

interface UseTestProgressProps {
    testId: string | undefined;
    mode: TestMode;
    answers: Answer[];
    currentIndex: number;
    startTime: number;
}

/**
 * Хук для авто-сохранения прогресса теста.
 * Восстановление прогресса происходит атомарно в initializeExam (useTestLifecycle).
 */
export const useTestProgress = ({
    testId,
    mode,
    answers,
    currentIndex,
    startTime,
}: UseTestProgressProps) => {
    // === AUTO-SAVE PROGRESS ===
    useEffect(() => {
        if (!testId || (answers.length === 0 && currentIndex === 0)) return;

        const timeoutId = setTimeout(() => {
            saveTestProgress(
                testId,
                mode,
                answers.map(a => ({
                    questionId: a.questionId,
                    selectedAnswerId: a.selectedAnswerId,
                    isCorrect: a.isCorrect,
                    timestamp: Date.now(),
                })),
                currentIndex,
                startTime
            ).catch(error => {
                console.error('[TestProgress] Error saving progress:', error);
            });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [testId, answers, currentIndex, mode, startTime]);

    // === CLEAR PROGRESS HELPER ===
    const clearProgress = async () => {
        if (!testId) return;
        try {
            await clearTestProgress(testId);
        } catch (error) {
            console.error('[TestProgress] Error clearing progress:', error);
        }
    };

    return { clearProgress };
};
