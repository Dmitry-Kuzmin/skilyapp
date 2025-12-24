import { useState, useCallback, useMemo } from 'react';

export interface Answer {
    questionId: string;
    selectedAnswerId: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    [key: string]: any;
}

interface UseTestEngineProps {
    questions: Question[];
    initialAnswers?: Answer[];
    initialIndex?: number;
}

interface UseTestEngineResult {
    // State
    currentIndex: number;
    answers: Answer[];
    selectedOption: string | null;
    isTransitioning: boolean;

    // Setters
    setCurrentIndex: (index: number) => void;
    setSelectedOption: (id: string | null) => void;
    setAnswers: React.Dispatch<React.SetStateAction<Answer[]>>;
    setIsTransitioning: (value: boolean) => void;

    // Actions
    recordAnswer: (answer: Answer) => void;
    jumpToQuestion: (index: number, resetState?: boolean) => void;
    nextQuestion: () => boolean; // returns false if at end
    prevQuestion: () => boolean; // returns false if at start
    resetEngine: () => void;

    // Computed
    currentQuestion: Question | null;
    progress: {
        answered: number;
        total: number;
        correct: number;
        incorrect: number;
        percentage: number;
    };
    isFinished: boolean;
    isFirstQuestion: boolean;
    isLastQuestion: boolean;
}

export const useTestEngine = ({
    questions,
    initialAnswers = [],
    initialIndex = 0,
}: UseTestEngineProps): UseTestEngineResult => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const currentQuestion = useMemo(() => {
        return questions[currentIndex] || null;
    }, [questions, currentIndex]);

    const progress = useMemo(() => {
        const answered = answers.length;
        const total = questions.length;
        const correct = answers.filter(a => a.isCorrect).length;
        const incorrect = answers.filter(a => !a.isCorrect).length;
        const percentage = total > 0 ? (answered / total) * 100 : 0;

        return { answered, total, correct, incorrect, percentage };
    }, [answers, questions.length]);

    const isFinished = useMemo(() => {
        return answers.length >= questions.length && questions.length > 0;
    }, [answers.length, questions.length]);

    const isFirstQuestion = currentIndex === 0;
    const isLastQuestion = currentIndex === questions.length - 1;

    const recordAnswer = useCallback((answer: Answer) => {
        setAnswers(prev => {
            // Prevent duplicate answers for same question
            const existingIndex = prev.findIndex(a => a.questionId === answer.questionId);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = answer;
                return updated;
            }
            return [...prev, answer];
        });
    }, []);

    const jumpToQuestion = useCallback((index: number, resetState: boolean = true) => {
        if (index < 0 || index >= questions.length || index === currentIndex) return;

        setCurrentIndex(index);
        if (resetState) {
            setSelectedOption(null);
        }

        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 300);
    }, [questions.length, currentIndex]);

    const nextQuestion = useCallback((): boolean => {
        if (currentIndex >= questions.length - 1) return false;

        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 300);
        return true;
    }, [currentIndex, questions.length]);

    /**
     * Navigate to next question with optional UI resets and finish callback.
     * This is the main method to use when advancing through the test.
     */
    const navigateNext = useCallback((options?: {
        onFinish?: () => void | Promise<void>;
        resetUI?: () => void;
    }): void => {
        // Reset UI state if provided
        options?.resetUI?.();

        // Try to go to next question
        const hasNext = currentIndex < questions.length - 1;
        if (hasNext) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsTransitioning(true);
            setTimeout(() => setIsTransitioning(false), 300);
        } else {
            // At last question - call finish callback
            options?.onFinish?.();
        }
    }, [currentIndex, questions.length]);

    const prevQuestion = useCallback((): boolean => {
        if (currentIndex <= 0) return false;

        setCurrentIndex(prev => prev - 1);
        setSelectedOption(null);
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 300);
        return true;
    }, [currentIndex]);

    const resetEngine = useCallback(() => {
        setCurrentIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        setIsTransitioning(false);
    }, []);

    return {
        // State
        currentIndex,
        answers,
        selectedOption,
        isTransitioning,

        // Setters
        setCurrentIndex,
        setSelectedOption,
        setAnswers,
        setIsTransitioning,

        // Actions
        recordAnswer,
        jumpToQuestion,
        nextQuestion,
        prevQuestion,
        resetEngine,

        // Computed
        currentQuestion,
        progress,
        isFinished,
        isFirstQuestion,
        isLastQuestion,
    };
};
