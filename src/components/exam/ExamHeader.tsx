import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState, memo } from 'react';

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
    onClose?: () => void;
    onOpenSettings?: () => void;
}

/**
 * Compact "Apple-Style" ExamHeader
 * Timer as pure text, block-grouped progress bar
 */
export const ExamHeader = memo(function ExamHeader({
    timeLeft,
    totalQuestions,
    currentQuestionIndex,
    questionsPerBlock = 5,
    extraQuestionsCount = 0,
    answers,
    errorsCount,
    maxErrors,
    mode,
    onClose,
    onOpenSettings
}: ExamHeaderProps) {
    const [isTimeAdded, setIsTimeAdded] = useState(false);
    const [prevTimeLeft, setPrevTimeLeft] = useState(timeLeft);

    // Detect sudden time jump (penalty added) to trigger animation
    useEffect(() => {
        if (timeLeft > prevTimeLeft + 2) {
            setIsTimeAdded(true);
            setTimeout(() => setIsTimeAdded(false), 2000);
        }
        setPrevTimeLeft(timeLeft);
    }, [timeLeft, prevTimeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(Math.max(0, seconds) / 60);
        const s = Math.max(0, seconds) % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isCriticalTime = timeLeft <= 300 && timeLeft > 0; // 5 min warning
    const isCriticalError = errorsCount >= maxErrors;
    const isWarningError = errorsCount > 0 && !isCriticalError;
    const isNearLimit = errorsCount >= maxErrors - 1;

    const totalSlots = totalQuestions + extraQuestionsCount;

    return (
        <div className="w-full space-y-2 mb-3">
            {/* Row 1: Close | Timer (pure text) | Errors */}
            <div className="flex items-center justify-between">
                {/* Left: Close Button - Glass Bubble */}
                {onClose ? (
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-10" />
                )}

                {/* Center: Timer - Pure Text, no container */}
                <span className={cn(
                    "font-mono text-base tabular-nums transition-colors",
                    isTimeAdded && "text-emerald-400 font-bold",
                    isCriticalTime && !isTimeAdded && "text-red-400 animate-pulse",
                    !isCriticalTime && !isTimeAdded && "text-slate-300"
                )}>
                    {formatTime(timeLeft)}
                </span>

                {/* Right: Errors Counter - Minimal Pill */}
                <div
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold tabular-nums transition-colors",
                        isCriticalError
                            ? "bg-red-500/20 text-red-400"
                            : isNearLimit
                                ? "bg-red-500/10 text-red-400"
                                : isWarningError
                                    ? "bg-orange-500/10 text-orange-400"
                                    : "bg-white/5 text-slate-400"
                    )}
                >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{errorsCount}/{maxErrors}</span>
                </div>
            </div>

            {/* Row 2: Block-Grouped Progress Bar */}
            <div className="flex items-center">
                {Array.from({ length: totalSlots }, (_, i) => {
                    const answer = answers[i];
                    const isCurrent = i === currentQuestionIndex;
                    const isPassed = i < currentQuestionIndex;
                    const isError = answer && !answer.isCorrect;
                    const isCorrect = answer && answer.isCorrect;
                    const isExtraQuestion = i >= totalQuestions;

                    // Block grouping: add visible gap after every 5th question
                    const isBlockEnd = (i + 1) % questionsPerBlock === 0 && i < totalQuestions - 1;

                    return (
                        <div
                            key={i}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-all duration-300",
                                // Visible gap between blocks (increased for visibility)
                                isBlockEnd && "mr-4",
                                // Visible gap before extra questions
                                i === totalQuestions - 1 && extraQuestionsCount > 0 && "mr-4",
                                // Current question: white glow
                                isCurrent && "bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]",
                                // Error: red
                                !isCurrent && isError && "bg-red-500",
                                // Correct: green
                                !isCurrent && isCorrect && "bg-emerald-500",
                                // Passed but no answer yet
                                !isCurrent && isPassed && !answer && "bg-slate-500",
                                // Future questions: dim
                                !isCurrent && !isPassed && !isExtraQuestion && "bg-slate-700/50",
                                // Extra penalty questions
                                isExtraQuestion && !isCurrent && !answer && "bg-orange-500/30"
                            )}
                            style={{
                                // Small gap between segments (except block gaps)
                                marginRight: isBlockEnd ? undefined : (i < totalSlots - 1 ? '2px' : '0')
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
});

export default ExamHeader;
