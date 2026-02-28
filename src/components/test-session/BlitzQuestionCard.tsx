import { memo } from 'react';
import { BlitzGameCard } from "@/components/blitz";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface BlitzQuestionCardProps {
    blitzShaking: boolean;
    currentQuestion: any;
    displayQuestion: string;
    fontSize: number;
    sortedOptions: any[];
    selectedOption: string | null;
    selectOption: (id: string) => void;
    handleAnswer: (id: string) => void;
    nextQuestion: () => void;
    testLanguage: 'es' | 'ru' | 'en';
}

const fontSizeClasses = [
    "text-base sm:text-lg md:text-xl",
    "text-lg sm:text-xl md:text-2xl",
    "text-xl sm:text-2xl md:text-3xl",
    "text-2xl sm:text-3xl md:text-4xl",
    "text-3xl sm:text-4xl md:text-5xl",
];

export const BlitzQuestionCard = memo(function BlitzQuestionCard({
    blitzShaking,
    currentQuestion,
    displayQuestion,
    fontSize,
    sortedOptions,
    selectedOption,
    selectOption,
    handleAnswer,
    nextQuestion,
    testLanguage
}: BlitzQuestionCardProps) {
    if (!currentQuestion) return null;

    const onOptionClick = (optionId: string) => {
        if (!selectedOption) {
            selectOption(optionId);
            handleAnswer(optionId);
        }
    };

    const renderOptions = () => (
        <div className="space-y-3">
            {sortedOptions.map((option, index) => {
                const isSelected = selectedOption === option.id;
                const showResult = selectedOption !== null;
                const isCorrect = option.is_correct;

                // Animated states
                const isCorrectState = showResult && isCorrect;
                const isWrongState = isSelected && !isCorrect;

                return (
                    <motion.button
                        key={option.id}
                        onClick={() => onOptionClick(option.id)}
                        disabled={!!selectedOption}
                        className={cn(
                            "w-full p-4 rounded-xl text-left relative overflow-hidden group",
                            "border transition-colors duration-200",
                            // Default State
                            !showResult && "bg-slate-100/50 dark:bg-slate-800/60 backdrop-blur-md border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700/80 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10",
                            // Correct State
                            isCorrectState && "bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
                            // Wrong State
                            isWrongState && "bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
                            // Dim other options
                            showResult && !isCorrect && !isSelected && "opacity-40 grayscale"
                        )}
                        whileHover={!selectedOption ? { scale: 1.02 } : {}}
                        whileTap={!selectedOption ? { scale: 0.98 } : {}}
                        animate={
                            isCorrectState ? { scale: [1, 1.03, 1], transition: { duration: 0.3 } } :
                                isWrongState ? { x: [0, -5, 5, -5, 5, 0], transition: { duration: 0.4 } } : {}
                        }
                    >
                        {/* Background Loading Bar Effect on Selection */}
                        {isSelected && !showResult && (
                            <motion.div
                                className="absolute inset-0 bg-blue-500/10 z-0"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                            />
                        )}

                        <div className="relative z-10 flex items-center gap-4">
                            {/* Option Letter / Status Icon */}
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-sm transition-all duration-300",
                                !showResult && "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 group-hover:bg-blue-500 group-hover:text-white",
                                isCorrectState && "bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-500/20",
                                isWrongState && "bg-red-500 text-white shadow-red-500/30 ring-2 ring-red-500/20",
                                showResult && !isSelected && !isCorrect && "bg-slate-200 dark:bg-slate-700 text-slate-400"
                            )}>
                                {showResult && isCorrect ? (
                                    <Check className="w-6 h-6" />
                                ) : showResult && isSelected && !isCorrect ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    index + 1
                                )}
                            </div>

                            {/* Option Text */}
                            <span className={cn(
                                "text-lg font-medium flex-1 transition-colors duration-200",
                                !showResult && "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white",
                                isCorrectState && "text-emerald-700 dark:text-emerald-300 font-bold",
                                isWrongState && "text-red-700 dark:text-red-300 font-bold",
                                showResult && !isSelected && !isCorrect && "text-slate-500 dark:text-slate-400"
                            )}>
                                {testLanguage === 'ru' ? option.text_ru :
                                    (testLanguage === 'en' ? option.text_en : option.text_es)}
                            </span>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );

    return (
        <BlitzGameCard isShaking={blitzShaking} className="mt-4 relative">
            {/* Background Glow Effect behind card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl opacity-50 -z-10 rounded-[30px]" />

            {currentQuestion.image_url ? (
                // Blitz Vertical Layout (Image on top)
                <div className="space-y-6">
                    <div className="w-full relative aspect-video bg-slate-900/50 dark:bg-black/40 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 shadow-2xl">
                        {/* Blurred background for empty sides */}
                        <div
                            className="absolute inset-0 z-0 bg-center bg-cover blur-3xl opacity-40 scale-125 saturate-150"
                            style={{ backgroundImage: `url(${currentQuestion.image_url})` }}
                        />
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Main image */}
                        <motion.img
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            src={currentQuestion.image_url}
                            alt="Question"
                            className="relative z-10 w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] rounded-2xl"
                        />
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="px-1">
                            <h2 className={cn(
                                fontSizeClasses[fontSize],
                                "font-bold text-slate-800 dark:text-white whitespace-pre-line leading-tight drop-shadow-sm"
                            )}>
                                {displayQuestion}
                            </h2>
                        </div>
                        {renderOptions()}
                    </div>
                </div>
            ) : (
                // No image layout for Blitz
                <div className="space-y-8 text-center py-4">
                    <div className="px-2">
                        <h2 className={cn(
                            fontSizeClasses[fontSize],
                            "font-bold text-slate-800 dark:text-white whitespace-pre-line leading-tight drop-shadow-sm"
                        )}>
                            {displayQuestion}
                        </h2>
                    </div>
                    {renderOptions()}
                </div>
            )}
        </BlitzGameCard>
    );
});
