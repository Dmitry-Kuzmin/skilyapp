import { memo } from 'react';
import { BlitzGameCard } from "@/components/blitz";
import { cn } from "@/lib/utils";

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
        <div className="space-y-2">
            {sortedOptions.map((option, index) => {
                const isSelected = selectedOption === option.id;
                const showResult = selectedOption !== null;
                const isCorrect = option.is_correct;

                return (
                    <button
                        key={option.id}
                        onClick={() => onOptionClick(option.id)}
                        disabled={!!selectedOption}
                        className={cn(
                            "w-full p-4 rounded-xl text-left transition-all duration-200",
                            "bg-slate-100 dark:bg-slate-800/80 backdrop-blur border",
                            !selectedOption && "hover:bg-slate-200 dark:hover:bg-slate-700/80 hover:border-cyan-500/50 cursor-pointer",
                            !selectedOption && "border-slate-200 dark:border-white/10",
                            isSelected && isCorrect && "border-emerald-500 bg-emerald-500/20",
                            isSelected && !isCorrect && "border-red-500 bg-red-500/20",
                            showResult && !isSelected && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                            showResult && !isSelected && !isCorrect && "opacity-50"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                                "bg-white/10",
                                isSelected && isCorrect && "bg-emerald-500 text-white",
                                isSelected && !isCorrect && "bg-red-500 text-white"
                            )}>
                                {String.fromCharCode(65 + index)}
                            </span>
                            <span className={cn(
                                "text-base font-medium flex-1",
                                isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-white/80"
                            )}>
                                {testLanguage === 'ru' ? option.text_ru : (testLanguage === 'en' ? option.text_en : option.text_es)}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );

    return (
        <BlitzGameCard isShaking={blitzShaking} className="mt-2">
            {currentQuestion.image_url ? (
                // Blitz Vertical Layout (Image on top)
                <div className="space-y-4">
                    <div className="w-full relative aspect-video bg-slate-900/10 dark:bg-black/40 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 shadow-inner">
                        {/* Blurred background for empty sides */}
                        <div
                            className="absolute inset-0 z-0 bg-center bg-cover blur-2xl opacity-30 scale-110"
                            style={{ backgroundImage: `url(${currentQuestion.image_url})` }}
                        />
                        {/* Main image */}
                        <img
                            src={currentQuestion.image_url}
                            alt="Question"
                            className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="mb-4">
                            <h2 className={cn(
                                fontSizeClasses[fontSize],
                                "font-medium text-slate-900 dark:text-white whitespace-pre-line"
                            )}>
                                {displayQuestion}
                            </h2>
                        </div>
                        {renderOptions()}
                    </div>
                </div>
            ) : (
                // No image layout for Blitz
                <div className="space-y-4 text-center">
                    <div className="py-2">
                        <h2 className={cn(
                            fontSizeClasses[fontSize],
                            "font-medium text-slate-900 dark:text-white whitespace-pre-line"
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
