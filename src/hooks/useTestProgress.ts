import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { saveTestProgress, loadTestProgress, clearTestProgress } from '@/utils/testStorage';
import { TestMode } from '@/types/pdd';

interface Answer {
    questionId: string;
    selectedAnswerId: string;
    isCorrect: boolean;
}

interface UseTestProgressProps {
    testId: string | undefined;
    mode: TestMode;
    questionsLoaded: boolean;
    answers: Answer[];
    currentIndex: number;
    startTime: number;

    // Actions для восстановления прогресса
    answerQuestion: (answerId: string, isCorrect: boolean) => void;
    jumpToQuestion: (index: number) => void;
    resetExam: () => void;
}

/**
 * Хук для управления сохранением и восстановлением прогресса теста
 * 
 * Функции:
 * 1. Автоматическое восстановление прогресса при загрузке теста
 * 2. Сохранение прогресса при каждом ответе
 * 3. Очистка прогресса при завершении теста
 */
export const useTestProgress = ({
    testId,
    mode,
    questionsLoaded,
    answers,
    currentIndex,
    startTime,
    answerQuestion,
    jumpToQuestion,
    resetExam
}: UseTestProgressProps) => {
    const hasLoadedProgressRef = useRef<string | null>(null);
    const previousTestIdRef = useRef<string | null>(null);

    // === RESET EXAM WHEN TEST ID CHANGES ===
    useEffect(() => {
        if (testId) {
            if (previousTestIdRef.current && previousTestIdRef.current !== testId) {
                console.log(`[TestProgress] 🔄 Test ID changed from ${previousTestIdRef.current} to ${testId}`);
                resetExam();
                hasLoadedProgressRef.current = null;
                previousTestIdRef.current = testId;
            } else {
                console.log(`[TestProgress] ⏭️ Skipping reset - same test ID: ${testId}`);
            }
        }
    }, [testId, resetExam]);

    // === LOAD PROGRESS EFFECT ===
    useEffect(() => {
        if (testId && questionsLoaded && hasLoadedProgressRef.current !== testId) {
            // Mark as loading immediately to prevent duplicate calls
            hasLoadedProgressRef.current = testId;

            const restoreProgress = async () => {
                try {
                    const savedProgress = await loadTestProgress(testId);
                    if (savedProgress && savedProgress.answers.length > 0) {
                        console.log(`[TestProgress] Restoring progress for ${testId} at index ${savedProgress.currentIndex}`);

                        // Восстанавливаем ответы
                        savedProgress.answers.forEach(ans => {
                            answerQuestion(ans.selectedAnswerId || '', ans.isCorrect);
                        });

                        // Переходим на сохраненный вопрос
                        jumpToQuestion(savedProgress.currentIndex);

                        // Сообщаем пользователю
                        toast.dismiss();
                        toast.info("Прогресс восстановлен", { icon: "↩️", id: `restore-${testId}` });
                    }
                } catch (error) {
                    console.error('[TestProgress] Error restoring progress:', error);
                }
            };

            restoreProgress();
        }
    }, [testId, questionsLoaded, answerQuestion, jumpToQuestion]);

    // === SAVE PROGRESS HELPER ===
    const saveProgress = async () => {
        if (!testId || answers.length === 0) return;

        try {
            await saveTestProgress(
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
            );
            console.log(`[TestProgress] ✅ Progress saved for ${testId}`);
        } catch (error) {
            console.error('[TestProgress] Error saving progress:', error);
            throw error;
        }
    };

    // === CLEAR PROGRESS HELPER ===
    const clearProgress = async () => {
        if (!testId) return;

        try {
            await clearTestProgress(testId);
            console.log(`[TestProgress] 🗑️ Progress cleared for ${testId}`);
        } catch (error) {
            console.error('[TestProgress] Error clearing progress:', error);
        }
    };

    return {
        saveProgress,
        clearProgress
    };
};
