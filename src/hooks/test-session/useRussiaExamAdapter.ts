import { useMemo } from 'react';
import { useExamStore } from '@/store/examStore';
import { getExamStats, handleMainQuestionAnswer, handleExtraQuestionAnswer } from '@/utils/russiaExamLogic';

/**
 * Adapter hook to transform the centralized RussiaExamState from Zustand
 * into the format expected by the TestSession UI.
 * 
 * This isolates the complex transformation logic from the main component.
 */
export const useRussiaExamAdapter = () => {
    const activeState = useExamStore(s => s.activeState);
    const examState = activeState?.kind === 'russia' ? activeState.data : null;

    return useMemo(() => {
        if (!examState) return {
            state: null,
            currentQuestion: null,
            questions: [],
            isExtraMode: false,
            progress: { current: 0, total: 0, label: '' },
            currentBlock: null,
            errorsInCurrentBlock: 0,
            stats: null,
            handleAnswer: () => ({ shouldContinue: true }),
            timeRemaining: 0,
            status: 'in-progress'
        };

        const currentQ = examState.isExtraMode
            ? (examState.extraQuestions[examState.currentExtraIndex]?.question || null)
            : (examState.mainQuestions[examState.currentMainIndex] || null);

        const allQ = examState.isExtraMode
            ? examState.extraQuestions.map(eq => eq.question)
            : examState.mainQuestions;

        return {
            state: examState,
            currentQuestion: currentQ,
            questions: allQ,
            isExtraMode: examState.isExtraMode,
            progress: examState.isExtraMode
                ? { current: examState.currentExtraIndex + 1, total: examState.extraQuestions.length, label: 'Доп. вопросы' }
                : { current: examState.currentMainIndex + 1, total: examState.mainQuestions.length, label: 'Основные вопросы' },
            currentBlock: Math.ceil((examState.currentMainIndex + 1) / 5),
            errorsInCurrentBlock: 0, // This logic is internal to standard behavior, can be derived if needed
            stats: getExamStats(examState),
            handleAnswer: (isCorrect: boolean) => {
                let result;
                if (examState.isExtraMode) {
                    result = handleExtraQuestionAnswer(examState, examState.currentExtraIndex, isCorrect);
                } else {
                    result = handleMainQuestionAnswer(examState, examState.currentMainIndex, isCorrect);
                }
                return result;
            },
            timeRemaining: examState.timeRemaining,
            status: examState.status
        };
    }, [examState]);
};
