import { useEffect } from 'react';
import { TestMode } from '@/types/pdd';

interface UseKeyboardNavigationProps {
    // State
    mode: TestMode;
    selectedOption: string | null;
    isAnswerLocked: boolean;
    currentIndex: number;
    isRussia: boolean;

    // Modal states (для блокировки клавиш)
    showQuestionMap: boolean;
    showExitConfirm: boolean;
    showReportModal: boolean;
    showTestSettings: boolean;

    // Data
    currentQuestion: any; // Текущий вопрос (для exam-russia или standard)
    russiaExamCurrentQuestion?: any; // Для режима exam-russia

    // Actions
    selectOption: (optionId: string) => void;
    handleAnswer: (answerId?: string) => void;
    nextQuestion: () => void;
    setIsEnterPressed: (pressed: boolean) => void;
}

/**
 * Хук для управления навигацией с клавиатуры
 * 
 * Поддерживает:
 * - Цифры 1-9: выбор варианта ответа
 * - Enter/Space: подтверждение ответа или переход к следующему вопросу
 * 
 * Блокируется когда:
 * - Фокус в input/textarea
 * - Открыта любая модалка
 */
export const useKeyboardNavigation = ({
    mode,
    selectedOption,
    isAnswerLocked,
    currentIndex,
    isRussia,
    showQuestionMap,
    showExitConfirm,
    showReportModal,
    showTestSettings,
    currentQuestion,
    russiaExamCurrentQuestion,
    selectOption,
    handleAnswer,
    nextQuestion,
    setIsEnterPressed
}: UseKeyboardNavigationProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Игнорируем, если фокус в инпуте
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Игнорируем, если открыты модалки
            if (showQuestionMap || showExitConfirm || showReportModal || showTestSettings) return;

            const currentQ = mode === 'exam-russia' ? russiaExamCurrentQuestion : currentQuestion;

            // === ВЫБОР ОПЦИЙ 1-9 ===
            if (/^[1-9]$/.test(e.key) && currentQ) {
                const currentAnswers = mode === 'exam-russia'
                    ? russiaExamCurrentQuestion?.answers
                    : currentQ.answer_options;

                if (currentAnswers) {
                    const index = parseInt(e.key) - 1;
                    if (index < currentAnswers.length) {
                        const answerId = currentAnswers[index].id;
                        if (!isAnswerLocked) {
                            selectOption(answerId);

                            // Автоматически отвечаем только в режимах, где нет кнопки "Подтвердить"
                            // (например, в обычной практике РФ)
                            const hasConfirmButton = mode === 'exam-russia' || !isRussia;
                            if (!hasConfirmButton && !selectedOption) {
                                handleAnswer(answerId);
                            }
                        }
                    }
                }
            }

            // === ПОДТВЕРЖДЕНИЕ/ПЕРЕХОД С ENTER ИЛИ SPACE ===
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();

                // Визуальная анимация нажатия
                if (e.key === 'Enter') {
                    setIsEnterPressed(true);
                    setTimeout(() => setIsEnterPressed(false), 200);
                }

                // Определяем isPracticeLikeMode локально для правильной работы
                const practiceModes = ['practice', 'pdd-topic', 'pdd-ticket', 'by-topic', 'traps', 'mastery', 'hardest', 'sequential', 'challenge-bank'];
                const isPractice = practiceModes.includes(mode);

                // Сначала отвечаем, если еще не ответили
                if (selectedOption && !isAnswerLocked) {
                    handleAnswer();
                }
                // Затем переходим дальше, если уже ответили (показывается результат)
                else if (isAnswerLocked && isPractice) {
                    nextQuestion();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        selectedOption,
        showQuestionMap,
        showExitConfirm,
        showReportModal,
        showTestSettings,
        mode,
        russiaExamCurrentQuestion,
        currentQuestion,
        currentIndex,
        isAnswerLocked,
        isRussia,
        selectOption,
        handleAnswer,
        nextQuestion,
        setIsEnterPressed
    ]);
};
