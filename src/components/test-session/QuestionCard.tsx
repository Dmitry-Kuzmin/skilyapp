import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnswerOptionsList } from "./AnswerOptionsList";
import { QuestionImage } from "@/components/test/QuestionImage";
import { QuestionText } from "@/components/test/QuestionText";
import { SubmitButton } from "@/components/test/SubmitButton";
import { X, Sparkles, AlertTriangle, Languages, ChevronRight, Share2, Lightbulb, Clock, BookOpen, Crown, Trophy, Target, TrendingUp, Info, Keyboard, CornerDownLeft, Flag } from "lucide-react";
import { getImageUrl } from "@/utils/imageUtils";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Popover from "@radix-ui/react-popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { isTelegramMiniApp } from "@/lib/telegram";

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
    fontSize: 0 | 1 | 2 | 3 | 4;
    isTransitioning: boolean;
    sortedOptions: any[];
    selectedOption: string | null;
    isPracticeLikeMode: boolean;
    mode: string;
    testLanguage: 'es' | 'en' | 'ru';
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
    const [showExplanation, setShowExplanation] = useState(false);
    const [explanationKey, setExplanationKey] = useState(0);

    const explanationText = showTranslation
        ? (currentQuestion.explanation_ru || currentQuestion.explanation_es)
        : (testLanguage === 'en' ? (currentQuestion.explanation_en || currentQuestion.explanation_es) : currentQuestion.explanation_es);

    const handleShowExplanation = useCallback(() => {
        if (explanationText) {
            setShowExplanation(true);
            setExplanationKey(prev => prev + 1);
            // The timer for auto-closing is now handled by the Popover's internal state or a separate mechanism if desired.
            // For now, we'll let the user close it or rely on the Popover's default behavior.
        } else {
            handleOpenAIChat(); // If no explanation text, open chat directly
        }
    }, [explanationText, handleOpenAIChat]);

    useEffect(() => {
        setShowHintPulse(false);
        const timer = setTimeout(() => {
            if (!selectedOption) setShowHintPulse(true);
        }, 10000); // 10 seconds idle trigger
        return () => clearTimeout(timer);
    }, [currentQuestion.id, selectedOption]);

    // Magic Evolution: Auto-show explanation with timer
    useEffect(() => {
        if (selectedOption && explanationText) {
            setShowExplanation(true);
            setExplanationKey(prev => prev + 1);
            const timer = setTimeout(() => setShowExplanation(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [selectedOption, explanationText]);


    const imageUrl = getImageUrl(currentQuestion.image_url);
    const isExam = mode === 'exam' || mode === 'exam-russia';

    return (
        <Card
            data-testid="question-card"
            className={cn(
                "p-3 sm:p-4 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-sm backdrop-blur-sm transition-all duration-300 relative overflow-hidden rounded-3xl",
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
                                imageUrl={currentQuestion.image_url || null}
                                country={isRussia ? 'russia' : 'spain'}
                                className="w-full h-auto max-h-[300px] md:max-h-[400px] object-contain bg-muted/10 rounded-2xl mb-4 border border-white/5"
                            />
                        </div>
                        <div className="flex flex-col mt-6">
                            {/* Question Card - Uni Layout with Translation button support */}
                            <div className="mb-8">
                                <QuestionText
                                    text={displayQuestion}
                                    fontSize={fontSize}
                                    showTranslation={showTranslation}
                                    onToggleTranslation={!isExam ? toggleTranslation : undefined}
                                    isTransitioning={isTransitioning}
                                    hintsEnabled={false} // Disable smart hints for Russia mode
                                />
                            </div>

                            {/* Answer Options - Premium Component */}
                            <AnswerOptionsList
                                options={sortedOptions}
                                selectedOption={selectedOption}
                                showResult={selectedOption !== null && isPracticeLikeMode}
                                showTranslation={showTranslation}
                                testLanguage={testLanguage}
                                fontSize={fontSize === 0 ? 'small' : fontSize >= 3 ? 'large' : 'medium'}
                                isTransitioning={isTransitioning}
                                answerPopularity={answerPopularity}
                                onSelect={(val) => {
                                    if (selectedOption) return; // Prevent interaction if already answered
                                    selectOption(val);

                                    // В режимах "практики" (где ответы подсвечиваются сразу и кнопка "Ответить" прячется),
                                    // мы должны отправлять ответ (сохранять прогресс) автоматически при выборе
                                    if (val && (isPracticeLikeMode || isRussia)) {
                                        setTimeout(() => handleAnswer(val), 100);
                                    }
                                }}
                            />

                            {/* Navigation */}
                            <div className="flex gap-3 items-center mt-6">
                                {(isPracticeLikeMode || mode === 'by-topic') && (
                                    <div className={cn(
                                        "relative group",
                                        (!isRussia && !isTelegramMiniApp() && isPracticeLikeMode && mode !== 'blitz' && mode !== 'exam' && mode !== 'exam-russia') && "lg:hidden"
                                    )}>
                                        <Popover.Root open={showExplanation} onOpenChange={setShowExplanation}>
                                            <Popover.Trigger asChild>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShowExplanation();
                                                    }}
                                                    className={cn(
                                                        "group relative h-12 w-auto px-3 sm:px-4 rounded-xl bg-zinc-900/40 dark:bg-black/40 backdrop-blur-md border border-white/10 dark:border-white/5 flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-95 shrink-0 overflow-hidden shadow-lg",
                                                        showHintPulse && !selectedOption && "ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                                    )}
                                                    title={testLanguage === 'ru' ? "Подсказка" : testLanguage === 'en' ? "Hint" : "Pista"}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                    <div className={cn("relative transition-transform duration-700", showHintPulse && !selectedOption && "animate-bounce")}>
                                                        <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                                                    </div>
                                                    <span className="font-bold text-yellow-100/90 text-sm hidden sm:inline-block relative z-10 tracking-wide">
                                                        {testLanguage === 'ru' ? "Подсказка" : (testLanguage === 'en' ? "Hint" : "Pista")}
                                                    </span>
                                                </button>
                                            </Popover.Trigger>

                                            <Popover.Content
                                                side="top"
                                                align="start"
                                                sideOffset={16}
                                                onOpenAutoFocus={(e) => e.preventDefault()}
                                                className="z-50 w-64 p-0 outline-none select-none"
                                            >
                                                <AnimatePresence>
                                                    {showExplanation && (
                                                        <motion.div
                                                            key={explanationKey}
                                                            initial={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(10px)" }}
                                                            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                                                            exit={{
                                                                opacity: 0,
                                                                scale: 0,
                                                                x: -110,
                                                                y: 40,
                                                                filter: "blur(20px)",
                                                                transition: { duration: 0.4, ease: "circIn" }
                                                            }}
                                                            drag="y"
                                                            dragConstraints={{ top: 0, bottom: 100 }}
                                                            dragElastic={0.1}
                                                            onDragEnd={(_, info) => { if (info.offset.y > 40) setShowExplanation(false); }}
                                                            onClick={handleOpenAIChat}
                                                            className="relative p-[1.5px] bg-gradient-to-tr from-purple-500/40 via-blue-500/40 to-emerald-500/40 rounded-2xl drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] overflow-visible cursor-grab active:cursor-grabbing"
                                                        >
                                                            <div className="relative p-4 bg-zinc-950 dark:bg-black border border-white/5 backdrop-blur-3xl rounded-[15px] overflow-hidden">
                                                                <div className="text-[10px] text-purple-400 mb-2 flex items-center justify-between font-bold uppercase tracking-wider">
                                                                    <div className="flex items-center gap-1.5 font-black">
                                                                        <motion.div
                                                                            animate={{
                                                                                rotate: [0, 15, -15, 0],
                                                                                scale: [1, 1.2, 1]
                                                                            }}
                                                                            transition={{ duration: 2, repeat: Infinity }}
                                                                        >
                                                                            <Sparkles className="w-3.5 h-3.5" />
                                                                        </motion.div>
                                                                        {testLanguage === 'ru' ? "AI Объяснение" : (testLanguage === 'en' ? "AI Explanation" : "Explicación AI")}
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setShowExplanation(false); }}
                                                                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                                                    >
                                                                        <X className="w-3.5 h-3.5 text-zinc-500" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-zinc-200 line-clamp-4 leading-relaxed font-medium">
                                                                    {explanationText}
                                                                </p>

                                                                <motion.div
                                                                    key={explanationKey}
                                                                    initial={{ scaleX: 1 }}
                                                                    animate={{ scaleX: 0 }}
                                                                    transition={{ duration: 3, ease: "linear" }}
                                                                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-blue-500 to-transparent origin-left opacity-80"
                                                                />
                                                            </div>
                                                            <Popover.Arrow className="fill-zinc-950 stroke-purple-500/30 stroke-1" width={20} height={10} />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </Popover.Content>
                                        </Popover.Root>
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
                                            onClick={() => handleAnswer(selectedOption || undefined)}
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
                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-6 items-start">
                        <div className="w-full lg:sticky lg:top-6 lg:self-start">
                            <QuestionImage
                                imageUrl={currentQuestion.image_url || null}
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
                                    onToggleTranslation={!isExam ? toggleTranslation : undefined}
                                    isTransitioning={isTransitioning}
                                    hintsEnabled={!isExam}
                                />
                            </div>

                            <AnswerOptionsList
                                options={sortedOptions}
                                selectedOption={selectedOption}
                                showResult={selectedOption !== null && isPracticeLikeMode}
                                showTranslation={showTranslation}
                                testLanguage={testLanguage}
                                fontSize={fontSize === 0 ? 'small' : fontSize >= 3 ? 'large' : 'medium'}
                                isTransitioning={isTransitioning}
                                answerPopularity={answerPopularity}
                                onSelect={(val) => {
                                    if (selectedOption) return;
                                    selectOption(val);
                                    if (val && (isPracticeLikeMode || isRussia)) {
                                        setTimeout(() => handleAnswer(val), 100);
                                    }
                                }}
                            />

                            {/* Sticky Mobile Navigation */}
                            <div className="sticky bottom-0 left-0 right-0 z-50 pt-6 pb-4 bg-gradient-to-t from-white via-white/80 dark:from-slate-900/60 dark:via-slate-900/20 to-transparent sm:relative sm:bg-none sm:bg-transparent sm:from-transparent sm:via-transparent sm:to-transparent sm:dark:from-transparent sm:pt-0 sm:mt-8 sm:z-10 sm:backdrop-blur-0">
                                <div className="flex gap-3 items-center">
                                    {(isPracticeLikeMode || mode === 'by-topic') && (
                                        <div className={cn(
                                            "relative group",
                                            (!isRussia && !isTelegramMiniApp() && isPracticeLikeMode && mode !== 'blitz' && mode !== 'exam' && mode !== 'exam-russia') && "lg:hidden"
                                        )}>
                                            <Popover.Root open={showExplanation} onOpenChange={setShowExplanation}>
                                                <Popover.Trigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleShowExplanation();
                                                        }}
                                                        className={cn(
                                                            "group relative h-12 w-auto px-3 sm:px-4 rounded-xl bg-zinc-900/40 dark:bg-black/40 backdrop-blur-md border border-white/10 dark:border-white/5 flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-95 shrink-0 overflow-hidden shadow-lg",
                                                            showHintPulse && !selectedOption && "ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                                        )}
                                                        title={testLanguage === 'ru' ? "Подсказка" : testLanguage === 'en' ? "Hint" : "Pista"}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                        <div className={cn("relative transition-transform duration-700", showHintPulse && !selectedOption && "animate-bounce")}>
                                                            <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                                                        </div>
                                                        <span className="font-bold text-yellow-100/90 text-sm hidden sm:inline-block relative z-10 tracking-wide">
                                                            {testLanguage === 'ru' ? "Подсказка" : (testLanguage === 'en' ? "Hint" : "Pista")}
                                                        </span>
                                                    </button>
                                                </Popover.Trigger>

                                                <Popover.Content
                                                    side="top"
                                                    align="start"
                                                    sideOffset={16}
                                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                                    className="z-50 w-64 p-0 outline-none select-none"
                                                >
                                                    <AnimatePresence>
                                                        {showExplanation && (
                                                            <motion.div
                                                                key={explanationKey}
                                                                initial={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(10px)" }}
                                                                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                                                                exit={{
                                                                    opacity: 0,
                                                                    scale: 0,
                                                                    x: -110,
                                                                    y: 40,
                                                                    filter: "blur(20px)",
                                                                    transition: { duration: 0.4, ease: "circIn" }
                                                                }}
                                                                drag="y"
                                                                dragConstraints={{ top: 0, bottom: 100 }}
                                                                dragElastic={0.1}
                                                                onDragEnd={(_, info) => { if (info.offset.y > 40) setShowExplanation(false); }}
                                                                onClick={handleOpenAIChat}
                                                                className="relative p-[1.5px] bg-gradient-to-tr from-purple-500/40 via-blue-500/40 to-emerald-500/40 rounded-2xl drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] overflow-visible cursor-grab active:cursor-grabbing"
                                                            >
                                                                <div className="relative p-4 bg-zinc-950 dark:bg-black border border-white/5 backdrop-blur-3xl rounded-[15px] overflow-hidden">
                                                                    <div className="text-[10px] text-purple-400 mb-2 flex items-center justify-between font-bold uppercase tracking-wider">
                                                                        <div className="flex items-center gap-1.5 font-black">
                                                                            <motion.div
                                                                                animate={{
                                                                                    rotate: [0, 15, -15, 0],
                                                                                    scale: [1, 1.2, 1]
                                                                                }}
                                                                                transition={{ duration: 2, repeat: Infinity }}
                                                                            >
                                                                                <Sparkles className="w-3.5 h-3.5" />
                                                                            </motion.div>
                                                                            {testLanguage === 'ru' ? "AI Объяснение" : (testLanguage === 'en' ? "AI Explanation" : "Explicación AI")}
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setShowExplanation(false); }}
                                                                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                                                        >
                                                                            <X className="w-3.5 h-3.5 text-zinc-500" />
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-xs text-zinc-200 line-clamp-4 leading-relaxed font-medium">
                                                                        {explanationText}
                                                                    </p>

                                                                    <motion.div
                                                                        key={explanationKey}
                                                                        initial={{ scaleX: 1 }}
                                                                        animate={{ scaleX: 0 }}
                                                                        transition={{ duration: 3, ease: "linear" }}
                                                                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-blue-500 to-transparent origin-left opacity-80"
                                                                    />
                                                                </div>
                                                                <Popover.Arrow className="fill-zinc-950 stroke-purple-500/30 stroke-1" width={20} height={10} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </Popover.Content>
                                            </Popover.Root>
                                        </div>
                                    )}

                                    {onReportProblem && (
                                        <button
                                            onClick={onReportProblem}
                                            className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all active:scale-95 shrink-0"
                                            title={testLanguage === 'ru' ? "Сообщить о проблеме" : "Reportar проблема"}
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
                                                onClick={() => handleAnswer(selectedOption || undefined)}
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
                        <QuestionText
                            text={displayQuestion}
                            fontSize={fontSize}
                            showTranslation={showTranslation}
                            onToggleTranslation={!isExam ? toggleTranslation : undefined}
                            isTransitioning={isTransitioning}
                            hintsEnabled={!isExam}
                        />
                    </div>

                    <AnswerOptionsList
                        options={sortedOptions}
                        selectedOption={selectedOption}
                        showResult={selectedOption !== null && isPracticeLikeMode}
                        showTranslation={showTranslation}
                        testLanguage={testLanguage}
                        fontSize={fontSize === 0 ? 'small' : fontSize >= 3 ? 'large' : 'medium'}
                        isTransitioning={isTransitioning}
                        answerPopularity={answerPopularity}
                        onSelect={(val) => {
                            if (selectedOption) return;
                            selectOption(val);
                            if (val && (isPracticeLikeMode || isRussia)) {
                                setTimeout(() => handleAnswer(val), 100);
                            }
                        }}
                    />
                    <div className="flex gap-3 items-center mt-6">
                        {(isPracticeLikeMode || mode === 'by-topic') && (
                            <div className={cn(
                                "relative group",
                                (!isRussia && !isTelegramMiniApp() && isPracticeLikeMode && mode !== 'blitz' && mode !== 'exam' && mode !== 'exam-russia') && "lg:hidden"
                            )}>
                                <Popover.Root open={showExplanation} onOpenChange={setShowExplanation}>
                                    <Popover.Trigger asChild>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleShowExplanation();
                                            }}
                                            className={cn(
                                                "group relative h-12 w-auto px-3 sm:px-4 rounded-xl bg-zinc-900/40 dark:bg-black/40 backdrop-blur-md border border-white/10 dark:border-white/5 flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-95 shrink-0 overflow-hidden shadow-lg",
                                                showHintPulse && !selectedOption && "ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                            )}
                                            title={testLanguage === 'ru' ? "Подсказка" : testLanguage === 'en' ? "Hint" : "Pista"}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className={cn("relative transition-transform duration-700", showHintPulse && !selectedOption && "animate-bounce")}>
                                                <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                                            </div>
                                            <span className="font-bold text-yellow-100/90 text-sm hidden sm:inline-block relative z-10 tracking-wide">
                                                {testLanguage === 'ru' ? "Подсказка" : (testLanguage === 'en' ? "Hint" : "Pista")}
                                            </span>
                                        </button>
                                    </Popover.Trigger>

                                    <Popover.Content
                                        side="top"
                                        align="start"
                                        sideOffset={16}
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                        className="z-50 w-64 p-0 outline-none select-none"
                                    >
                                        <AnimatePresence>
                                            {showExplanation && (
                                                <motion.div
                                                    key={explanationKey}
                                                    initial={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(10px)" }}
                                                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                                                    exit={{
                                                        opacity: 0,
                                                        scale: 0,
                                                        x: -110,
                                                        y: 40,
                                                        filter: "blur(20px)",
                                                        transition: { duration: 0.4, ease: "circIn" }
                                                    }}
                                                    drag="y"
                                                    dragConstraints={{ top: 0, bottom: 100 }}
                                                    dragElastic={0.1}
                                                    onDragEnd={(_, info) => { if (info.offset.y > 40) setShowExplanation(false); }}
                                                    onClick={handleOpenAIChat}
                                                    className="relative p-[1.5px] bg-gradient-to-tr from-purple-500/40 via-blue-500/40 to-emerald-500/40 rounded-2xl drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] overflow-visible cursor-grab active:cursor-grabbing"
                                                >
                                                    <div className="relative p-4 bg-zinc-950 dark:bg-black border border-white/5 backdrop-blur-3xl rounded-[15px] overflow-hidden">
                                                        <div className="text-[10px] text-purple-400 mb-2 flex items-center justify-between font-bold uppercase tracking-wider">
                                                            <div className="flex items-center gap-1.5 font-black">
                                                                <motion.div
                                                                    animate={{
                                                                        rotate: [0, 15, -15, 0],
                                                                        scale: [1, 1.2, 1]
                                                                    }}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                >
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                </motion.div>
                                                                {testLanguage === 'ru' ? "AI Объяснение" : (testLanguage === 'en' ? "AI Explanation" : "Explicación AI")}
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowExplanation(false); }}
                                                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                                            >
                                                                <X className="w-3.5 h-3.5 text-zinc-500" />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-zinc-200 line-clamp-4 leading-relaxed font-medium">
                                                            {explanationText}
                                                        </p>

                                                        <motion.div
                                                            key={explanationKey}
                                                            initial={{ scaleX: 1 }}
                                                            animate={{ scaleX: 0 }}
                                                            transition={{ duration: 3, ease: "linear" }}
                                                            className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-blue-500 to-transparent origin-left opacity-80"
                                                        />
                                                    </div>
                                                    <Popover.Arrow className="fill-zinc-950 stroke-purple-500/30 stroke-1" width={20} height={10} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Popover.Content>
                                </Popover.Root>
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
                                    onClick={() => handleAnswer(selectedOption || undefined)}
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
