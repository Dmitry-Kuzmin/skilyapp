import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnswerOptionsList } from "./AnswerOptionsList";
import { QuestionImage } from "@/components/test/QuestionImage";
import { QuestionText } from "@/components/test/QuestionText";
import { SubmitButton } from "@/components/test/SubmitButton";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { ChevronRight, Keyboard, CornerDownLeft } from "lucide-react";

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
}: QuestionCardProps) => {
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
            {currentQuestion.image_url ? (
                isRussia ? (
                    // Russia Vertical Layout (Image on top)
                    <div className="space-y-6">
                        <div className="w-full">
                            <QuestionImage imageUrl={currentQuestion.image_url} className="w-full h-auto max-h-[350px] md:max-h-[450px] object-contain bg-muted/30 rounded-[2.5rem] border border-border/50 mb-4 shadow-sm" />
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
                                    <button
                                        onClick={handleOpenAIChat}
                                        className="group w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 shrink-0 xl:hidden shadow-sm"
                                    >
                                        <LumiCharacter size="sm" mood="happy" animate={true} />
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
                                        <button onClick={handleOpenAIChat} className="group w-12 h-12 rounded-xl flex items-center justify-center active:scale-95 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0 xl:hidden hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shadow-sm">
                                            <LumiCharacter size="sm" mood="happy" animate={true} />
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
                                className="group w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 shrink-0 xl:hidden shadow-sm"
                            >
                                <LumiCharacter size="sm" mood="happy" animate={true} />
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
