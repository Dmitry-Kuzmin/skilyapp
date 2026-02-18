import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnswerOptionsList } from "./AnswerOptionsList";
import { QuestionImage } from "@/components/test/QuestionImage";
import { QuestionText } from "@/components/test/QuestionText";
import { SubmitButton } from "@/components/test/SubmitButton";
import { SkilyAICharacter } from "@/components/skily-ai/SkilyAICharacter";
import { ChevronRight, Keyboard, CornerDownLeft, Sparkles, Wand2, Lightbulb, Flag } from "lucide-react";
import { getImageUrl } from "@/utils/imageUtils";
import { useState, useEffect } from "react";

const fontSizeClasses = [
    "text-base sm:text-lg md:text-xl",
    "text-lg sm:text-xl md:text-2xl",
    "text-xl sm:text-2xl md:text-3xl",
    "text-2xl sm:text-3xl md:text-4xl",
    "text-3xl sm:text-4xl md:text-5xl",
];

interface QuestionCardProps {
    currentQuestion: {
        id: string;
        image_url?: string | null;
        question_ru?: string;
        question_es?: string;
        question_en?: string;
        topics?: any;
        explanation_ru?: string;
        explanation_es?: string;
        explanation_en?: string;
    };
    displayQuestion: string;
    isRussia: boolean;
    feedbackStatus: 'idle' | 'correct' | 'incorrect';
    fontSize: number;
    isTransitioning: boolean;
    sortedOptions: any[];
    selectedOption: string | null;
    isPracticeLikeMode: boolean;
    mode: string;
    testLanguage: string;
    showTranslation: boolean;
    toggleTranslation: () => void;
    answerPopularity: boolean;
    selectOption: (id: string) => void;
    handleAnswer: (id?: string) => void;
    handleOpenAIChat: () => void;
    nextQuestion: () => void;
    isEnterPressed: boolean;
    onReportProblem?: () => void;
}

export const QuestionCard = ({
    currentQuestion,
    displayQuestion,
    isRussia,
    feedbackStatus,
    fontSize,
    isTransitioning,
    sortedOptions,
    selectedOption,
    isPracticeLikeMode,
    mode,
    testLanguage,
    showTranslation,
    toggleTranslation,
    answerPopularity,
    selectOption,
    handleAnswer,
    handleOpenAIChat,
    nextQuestion,
    isEnterPressed,
    onReportProblem,
}: QuestionCardProps) => {
    const [showHintPulse, setShowHintPulse] = useState(false);

    useEffect(() => {
        setShowHintPulse(false);
        const timer = setTimeout(() => {
            if (!selectedOption) setShowHintPulse(true);
        }, 10000); // 10 seconds idle trigger
        return () => clearTimeout(timer);
    }, [currentQuestion.id, selectedOption]);

    const explanationText = showTranslation
        ? (currentQuestion.explanation_ru || currentQuestion.explanation_es)
        : (testLanguage === 'en' ? (currentQuestion.explanation_en || currentQuestion.explanation_es) : currentQuestion.explanation_es);

    const imageUrl = getImageUrl(currentQuestion.image_url);

    return (
        <Card
            data-testid="question-card"
            className={cn(
                "p-3 sm:p-4 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm backdrop-blur-sm transition-all duration-300 relative overflow-hidden rounded-3xl",
                feedbackStatus === 'correct' && "border-emerald-500/50 shadow-emerald-500/10",
                feedbackStatus === 'incorrect' && "border-red-500/50 shadow-red-500/10"
            )}
        >
            {/* Layout System */}
            {imageUrl ? (
                isRussia ? (
                    // Russia Vertical Layout (Image on top)
                    <div className="space-y-6">
                        <div className="w-full">
                            <QuestionImage
                                imageUrl={currentQuestion.image_url}
                                country={isRussia ? 'russia' : 'spain'}
                                className="w-full h-auto max-h-[350px] md:max-h-[450px] object-contain bg-muted/30 rounded-[2.5rem] border border-border/50 mb-4 shadow-sm"
                            />
                        </div>
                        <div className="flex flex-col mt-6">
                            {/* Question Card - Swiss Design */}
                            <div className="mb-8">
                                <div className="relative">
                                    <h2 className={cn(
                                        fontSizeClasses[fontSize],
                                        "font-bold text-foreground dark:text-white whitespace-pre-line transition-opacity duration-300 tracking-tight leading-tight",
                                        isTransitioning ? 'opacity-0' : 'opacity-100'
                                    )}>
                                        {displayQuestion}
                                    </h2>
                                </div>
                            </div>

                            {/* Answer Options - Premium Component */}
                            <AnswerOptionsList
                                options={sortedOptions}
                                selectedOption={selectedOption}
                                showResult={selectedOption !== null && isPracticeLikeMode}
                                showTranslation={showTranslation}
                                testLanguage={testLanguage}
                                fontSize={fontSize}
                                isTransitioning={isTransitioning}
                                answerPopularity={answerPopularity}
                                onSelect={(val) => {
                                    selectOption(val);
                                    // Auto-submit logic for non-practice modes or specific settings
                                    if (!isPracticeLikeMode && val) {
                                        setTimeout(() => handleAnswer(val), 200);
                                    }
                                }}
                                onAnswer={handleAnswer}
                            />

                            {/* Navigation */}
                            <div className="flex gap-3 items-center mt-6">
                                {(isPracticeLikeMode || mode === 'by-topic') && !isRussia && (
                                    <div className="relative xl:hidden">
                                        <button
                                            onClick={handleOpenAIChat}
                                            className={cn(
                                                "group relative h-12 w-auto px-3 sm:px-5 rounded-2xl bg-zinc-900/40 dark:bg-black/40 backdrop-blur-md border border-white/10 dark:border-white/5 flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-95 shrink-0 xl:hidden overflow-hidden shadow-lg",
                                                showHintPulse && !selectedOption && "ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                            )}
                                            title={testLanguage === 'ru' ? "Подсказка" : testLanguage === 'en' ? "Hint" : "Pista"}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className={cn("relative transition-transform duration-700", showHintPulse && !selectedOption && "animate-bounce")}>
                                                <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                                            </div>
                                            <span className="font-bold text-yellow-100/90 text-sm hidden sm:inline-block relative z-10 tracking-wide">
                                                {testLanguage === 'ru' ? "Подсказка" : testLanguage === 'en' ? "Hint" : "Pista"}
                                            </span>
                                        </button>
                                        {selectedOption && explanationText && (
                                            <div
                                                onClick={handleOpenAIChat}
                                                className="absolute bottom-full left-0 mb-3 w-64 p-4 bg-zinc-900/95 dark:bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 cursor-pointer ring-1 ring-white/5"
                                            >
                                                <div className="relative">
                                                    <div className="text-[10px] text-purple-400 mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                                        <Sparkles className="w-3 h-3" />
                                                        {testLanguage === 'ru' ? "AI Объяснение" : testLanguage === 'en' ? "AI Explanation" : "Explicación AI"}
                                                    </div>
                                                    <p className="text-xs text-zinc-200 line-clamp-3 leading-relaxed">
                                                        {explanationText}
                                                    </p>
                                                    <div className="absolute -bottom-[22px] left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-zinc-900/95 dark:border-t-black/95" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {onReportProblem && (
                                    <button
                                        onClick={onReportProblem}
                                        className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all active:scale-95 shrink-0"
                                        title={testLanguage === 'ru' ? "Сообщить о проблеме" : "Reportar problema"}
                                    >
                                        <Flag className="w-5 h-5" />
                                    </button>
                                )}

                                {isPracticeLikeMode && selectedOption ? (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    onClick={nextQuestion}
                                                    className={cn(
                                                        "flex-1 font-semibold h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all relative",
                                                        isEnterPressed && "scale-[0.98] brightness-110 shadow-blue-400/50"
                                                    )}
                                                >
                                                    <span className="text-lg sm:text-xl">{isRussia ? 'Следующий' : 'Siguiente'}</span>
                                                    <ChevronRight className="w-6 h-6 ml-2" />
                                                    <span className={cn(
                                                        "hidden sm:inline-flex absolute right-4 text-[10px] items-center gap-1 opacity-50 font-mono transition-all duration-200",
                                                        isEnterPressed && "scale-110 opacity-100 text-yellow-400"
                                                    )}>
                                                        <Keyboard className="w-4 h-4" />
                                                        <span className="border border-white/30 px-1 rounded flex items-center gap-0.5">
                                                            Enter <CornerDownLeft className="w-3 h-3" />
                                                        </span>
                                                    </span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-slate-900 border-white/10 text-white">
                                                <p>Нажмите Enter, чтобы продолжить</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    !(isRussia && isPracticeLikeMode && mode !== "exam-russia") && mode !== "exam-russia" && (
                                        <SubmitButton
                                            label={isRussia ? "Ответить" : "Responder"}
                                            onClick={() => handleAnswer()}
                                            disabled={!selectedOption}
                                            isEnterPressed={isEnterPressed}
                                            variant="practice"
                                            tooltipText={isRussia ? "Нажмите Enter, чтобы ответить" : "Presiona Enter para responder"}
                                            showArrow={!!selectedOption}
                                            showKeyboardHint={true}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // DGT Split Layout (Premium Split) 
                    // Stacks vertically on tablets (md), side-by-side only on large screens (lg+)
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
                        <div className="w-full lg:sticky lg:top-6 lg:self-start">
                            <QuestionImage
                                imageUrl={currentQuestion.image_url}
                                country={isRussia ? 'russia' : 'spain'}
                                className="w-full h-auto object-cover rounded-[2rem] border border-border/50 shadow-md hover:shadow-xl transition-all duration-500 bg-zinc-900/5 dark:bg-zinc-100/5 group-hover:scale-[1.02]"
                            />
                        </div>
                        <div className="flex flex-col">
                            {/* Question Text with Smart Features */}
                            <div className="mb-6">
                                <QuestionText
                                    text={displayQuestion}
                                    fontSize={fontSize}
                                    showTranslation={showTranslation}
                                    onToggleTranslation={toggleTranslation}
                                    isTransitioning={isTransitioning}
                                />
                            </div>

                            <AnswerOptionsList
                                options={sortedOptions}
                                selectedOption={selectedOption}
                                showResult={selectedOption !== null && isPracticeLikeMode}
                                showTranslation={showTranslation}
                                testLanguage={testLanguage}
                                fontSize={fontSize}
                                isTransitioning={isTransitioning}
                                answerPopularity={answerPopularity}
                                onSelect={selectOption}
                                onAnswer={handleAnswer}
                            />

                            {/* Sticky Mobile Navigation */}
                            <div className="sticky bottom-0 left-0 right-0 z-50 pt-6 pb-4 bg-gradient-to-t from-white via-white/80 dark:from-slate-900/60 dark:via-slate-900/20 to-transparent sm:relative sm:bg-none sm:bg-transparent sm:from-transparent sm:via-transparent sm:to-transparent sm:dark:from-transparent sm:pt-0 sm:mt-8 sm:z-10 sm:backdrop-blur-0">
                                <div className="flex gap-3 items-center">
                                    {(isPracticeLikeMode || mode === 'by-topic') && !isRussia && (
                                        <div className="relative xl:hidden">
                                            <button
                                                onClick={handleOpenAIChat}
                                                className={cn(
                                                    "group relative h-12 ml-2 w-auto px-3 sm:px-4 rounded-xl bg-zinc-900/40 dark:bg-black/40 backdrop-blur-md border border-white/10 dark:border-white/5 flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-95 shrink-0 xl:hidden overflow-hidden shadow-lg",
                                                    showHintPulse && !selectedOption && "ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                                )}
                                                title={testLanguage === 'ru' ? "Подсказка" : testLanguage === 'en' ? "Hint" : "Pista"}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <div className={cn("relative transition-transform duration-700", showHintPulse && !selectedOption && "animate-bounce")}>
                                                    <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                                                </div>
                                                <span className="font-bold text-yellow-100/90 text-sm hidden sm:inline-block relative z-10 tracking-wide">
                                                    {testLanguage === 'ru' ? "Подсказка" : testLanguage === 'en' ? "Hint" : "Pista"}
                                                </span>
                                            </button>
                                            {selectedOption && explanationText && (
                                                <div
                                                    onClick={handleOpenAIChat}
                                                    className="absolute bottom-full left-0 mb-3 w-64 p-4 bg-zinc-900/95 dark:bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 cursor-pointer ring-1 ring-white/5"
                                                >
                                                    <div className="relative">
                                                        <div className="text-[10px] text-purple-400 mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                                            <Sparkles className="w-3 h-3" />
                                                            {testLanguage === 'ru' ? "AI Объяснение" : testLanguage === 'en' ? "AI Explanation" : "Explicación AI"}
                                                        </div>
                                                        <p className="text-xs text-zinc-200 line-clamp-3 leading-relaxed">
                                                            {explanationText}
                                                        </p>
                                                        <div className="absolute -bottom-[22px] left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-zinc-900/95 dark:border-t-black/95" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {onReportProblem && (
                                        <button
                                            onClick={onReportProblem}
                                            className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all active:scale-95 shrink-0"
                                            title={testLanguage === 'ru' ? "Сообщить о проблеме" : "Reportar problema"}
                                        >
                                            <Flag className="w-5 h-5" />
                                        </button>
                                    )}

                                    {isPracticeLikeMode && selectedOption ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        onClick={nextQuestion}
                                                        className={cn(
                                                            "flex-1 font-semibold h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all relative",
                                                            isEnterPressed && "scale-[0.98] brightness-110"
                                                        )}
                                                    >
                                                        <span className="text-lg">{isRussia ? 'Следующий' : 'Siguiente'}</span>
                                                        <ChevronRight className="w-5 h-5 ml-2" />
                                                        <span className={cn(
                                                            "hidden sm:inline-flex absolute right-4 text-[10px] items-center gap-1 opacity-50 font-mono transition-all duration-200",
                                                            isEnterPressed && "scale-110 opacity-100 text-yellow-400"
                                                        )}>
                                                            <Keyboard className="w-3.5 h-3.5" />
                                                            <span className="border border-white/30 px-1 rounded flex items-center gap-0.5">
                                                                Enter <CornerDownLeft className="w-2.5 h-2.5" />
                                                            </span>
                                                        </span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-slate-900 border-white/10 text-white">
                                                    <p>Нажмите Enter, чтобы продолжить</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : (
                                        !(isRussia && isPracticeLikeMode && mode !== "exam-russia") && mode !== "exam-russia" && (
                                            <SubmitButton
                                                label={isRussia ? "Ответить" : "Responder"}
                                                onClick={() => handleAnswer()}
                                                disabled={!selectedOption}
                                                isEnterPressed={isEnterPressed}
                                                variant="practice"
                                                tooltipText={isRussia ? "Нажмите Enter, чтобы ответить" : "Presiona Enter para responder"}
                                                showArrow={!!selectedOption}
                                                showKeyboardHint={true}
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                // No image layout -> Just text
                <div className="space-y-6">
                    <div className="mb-6">
                        <h2 className={cn(
                            fontSizeClasses[fontSize],
                            "font-bold text-foreground dark:text-white whitespace-pre-line transition-opacity duration-300 tracking-tight leading-tight",
                            isTransitioning ? 'opacity-0' : 'opacity-100'
                        )}>
                            {displayQuestion}
                        </h2>
                    </div>

                    <AnswerOptionsList
                        options={sortedOptions}
                        selectedOption={selectedOption}
                        showResult={selectedOption !== null && isPracticeLikeMode}
                        showTranslation={showTranslation}
                        testLanguage={testLanguage}
                        fontSize={fontSize}
                        isTransitioning={isTransitioning}
                        answerPopularity={answerPopularity}
                        onSelect={(val) => {
                            selectOption(val);
                            if (!isPracticeLikeMode && val) {
                                setTimeout(() => handleAnswer(val), 200);
                            }
                        }}
                        onAnswer={handleAnswer}
                    />

                    <div className="flex gap-3 items-center mt-6">
                        {(isPracticeLikeMode || mode === 'by-topic') && !isRussia && (
                            <button
                                onClick={handleOpenAIChat}
                                className="group h-12 sm:h-14 pl-2 pr-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1.5 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-95 shrink-0 xl:hidden shadow-sm"
                                title="Спросить AI"
                            >
                                <div className="w-8 h-8 relative flex items-center justify-center">
                                    <SkilyAICharacter size="sm" mood="happy" animate={true} />
                                </div>
                                <span className="font-bold text-indigo-600 dark:text-indigo-300 text-sm leading-none">AI</span>
                            </button>
                        )}

                        {onReportProblem && (
                            <button
                                onClick={onReportProblem}
                                className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all active:scale-95 shrink-0"
                                title={testLanguage === 'ru' ? "Сообщить о проблеме" : "Reportar problema"}
                            >
                                <Flag className="w-5 h-5" />
                            </button>
                        )}

                        {isPracticeLikeMode && selectedOption ? (
                            <Button
                                onClick={nextQuestion}
                                className={cn(
                                    "flex-1 font-semibold h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all relative",
                                    isEnterPressed && "scale-[0.98] brightness-110 shadow-blue-400/50"
                                )}
                            >
                                <span className="text-lg sm:text-xl">{isRussia ? 'Следующий' : 'Siguiente'}</span>
                                <ChevronRight className="w-6 h-6 ml-2" />
                            </Button>
                        ) : (
                            !(isRussia && isPracticeLikeMode && mode !== "exam-russia") && mode !== "exam-russia" && (
                                <SubmitButton
                                    label={isRussia ? "Ответить" : "Responder"}
                                    onClick={() => handleAnswer()}
                                    disabled={!selectedOption}
                                    isEnterPressed={isEnterPressed}
                                    variant="practice"
                                    tooltipText={isRussia ? "Нажмите Enter, чтобы ответить" : "Presiona Enter para responder"}
                                    showArrow={!!selectedOption}
                                    showKeyboardHint={true}
                                />
                            )
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
};
