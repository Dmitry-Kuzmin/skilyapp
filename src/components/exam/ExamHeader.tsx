
import { cn } from '@/lib/utils';
import { Timer, AlertTriangle } from 'lucide-react';
import { SegmentedExamProgress } from './SegmentedExamProgress';
import { useEffect, useState } from 'react';

interface ExamHeaderProps {
    timeLeft: number; // in seconds
    totalQuestions: number;
    currentQuestionIndex: number; // 0-indexed
    questionsPerBlock?: number;
    extraQuestionsCount?: number;
    answers: Array<{
        questionId: string;
        isCorrect: boolean;
    }>;
    errorsCount: number;
    maxErrors: number;
    mode: 'exam' | 'practice' | 'test' | 'exam-russia';
}

export function ExamHeader({
    timeLeft,
    totalQuestions,
    currentQuestionIndex,
    questionsPerBlock = 5,
    extraQuestionsCount = 0,
    answers,
    errorsCount,
    maxErrors,
    mode
}: ExamHeaderProps) {
    const [isTimeAdded, setIsTimeAdded] = useState(false);
    const [prevTimeLeft, setPrevTimeLeft] = useState(timeLeft);

    // Detect sudden time jump (penalty added) to trigger animation
    useEffect(() => {
        if (timeLeft > prevTimeLeft + 2) { // Allow slight jitter, logic > 1s interval
            setIsTimeAdded(true);
            setTimeout(() => setIsTimeAdded(false), 2000);
        }
        setPrevTimeLeft(timeLeft);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getPenaltyQuestionsCount = () => {
        return extraQuestionsCount;
    };

    const isCriticalError = errorsCount >= maxErrors;
    const isWarningError = errorsCount > 0 && !isCriticalError;

    return (
        <div className="flex items-center justify-between w-full mb-6 px-1 select-none">
            {/* 1. Timer (Left) */}
            <div className={cn(
                "flex items-center gap-2 font-mono text-xl font-medium tabular-nums transition-colors duration-300",
                isTimeAdded ? "text-emerald-500 scale-110" : "text-slate-700 dark:text-slate-200"
            )}>
                <Timer className={cn(
                    "w-5 h-5 opacity-50",
                    timeLeft < 60 && "text-red-500 opacity-100 animate-pulse"
                )} />
                <span className={cn(timeLeft < 60 && "text-red-500")}>
                    {formatTime(timeLeft)}
                </span>
            </div>

            {/* 2. Progress Bar (Center) - Only for Exam mode or similar */}
            <div className="flex-1 mx-4 sm:mx-8 md:mx-12 max-w-2xl">
                <SegmentedExamProgress
                    currentQuestion={currentQuestionIndex + 1}
                    totalMainQuestions={totalQuestions}
                    questionsPerBlock={questionsPerBlock}
                    penaltyQuestions={extraQuestionsCount}
                    answers={answers}
                    className="py-0" // Override padding
                    miniMode={true} // New prop we'll add to SegmentedExamProgress for cleaner look
                />
            </div>

            {/* 3. Error Indicator (Right) */}
            <div className={cn(
                "flex items-center gap-2 font-bold text-lg transition-all duration-300",
                isCriticalError ? "text-red-600 animate-pulse" :
                    isWarningError ? "text-orange-500" : "text-slate-300 dark:text-slate-600"
            )}>
                <AlertTriangle className={cn(
                    "w-5 h-5",
                    isCriticalError ? "fill-red-600/20" :
                        isWarningError ? "fill-orange-500/20" : "opacity-50"
                )} />
                <span>
                    {errorsCount}/{maxErrors}
                </span>
            </div>
        </div>
    );
}
