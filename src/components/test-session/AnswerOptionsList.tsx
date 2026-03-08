import { memo, useCallback, useMemo } from 'react';
import { motion } from "@/components/optimized/Motion";
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnswerOption {
    id: string;
    text_ru?: string;
    text_es?: string;
    text_en?: string;
    text?: string;
    is_correct: boolean;
}

interface AnswerButtonProps {
    option: AnswerOption;
    index: number;
    isSelected: boolean;
    showResult: boolean;
    displayText: string;
    fontSize: 'small' | 'medium' | 'large';
    isTransitioning: boolean;
    answerPopularity: boolean;
    popularityValue: number;
    disabled: boolean;
    onClick: () => void;
}

// Swiss Design font config - refined, not gigantic
const fontSizeConfig = {
    small: 'text-sm leading-relaxed',
    medium: 'text-[15px] leading-relaxed',
    large: 'text-base leading-relaxed',
};

// Keycap labels (1, 2, 3 style)
const answerLabels = ['1', '2', '3', '4', '5', '6'];

/**
 * Premium Answer Button Component
 * "Premium Dark" style: clean, tactile, high readability
 */
export const AnswerButton = memo(function AnswerButton({
    option,
    index,
    isSelected,
    showResult,
    displayText,
    fontSize,
    isTransitioning,
    answerPopularity,
    popularityValue,
    disabled,
    onClick,
}: AnswerButtonProps) {
    const isCorrect = option.is_correct;
    const label = answerLabels[index] || String(index + 1);

    // Determine visual state classes
    const getStateStyles = () => {
        // Result states (after answering)
        if (showResult) {
            if (isCorrect) {
                return cn(
                    'border-emerald-500/70 bg-emerald-500/10',
                    'dark:border-emerald-400/60 dark:bg-emerald-500/15',
                    'ring-1 ring-emerald-500/20'
                );
            }
            if (isSelected) {
                return cn(
                    'border-red-500/70 bg-red-500/10',
                    'dark:border-red-400/60 dark:bg-red-500/15',
                    'ring-1 ring-red-500/20'
                );
            }
            // Not selected, not correct
            return 'border-transparent bg-muted/30 opacity-40 dark:bg-slate-800/20';
        }

        // Selected state (before answering)
        if (isSelected) {
            return cn(
                'border-primary bg-primary/5',
                'dark:border-blue-400 dark:bg-blue-500/10',
                'ring-2 ring-primary/20 dark:ring-blue-400/20',
                'shadow-sm'
            );
        }

        // Default state - clean surface buttons
        return cn(
            'border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/80',
            // Hover styles strictly for monitors (fixes mobile double-tap bugs)
            'lg:hover:border-slate-300 dark:lg:hover:border-white/10 lg:hover:bg-slate-50 dark:lg:hover:bg-slate-700',
            // Active press - tactile feel for all devices
            'active:scale-[0.98] active:bg-slate-100 dark:active:bg-slate-600'
        );
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                // Swiss Design - refined padding
                "group w-full text-left py-3.5 px-4 sm:py-4 sm:px-5",
                // Shape
                "rounded-2xl border",
                // Transitions
                "transition-all duration-200 ease-out",
                // Overflow
                "relative overflow-hidden",
                // Focus
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                // State styles
                getStateStyles(),
                // Cursor
                disabled ? "cursor-default" : "cursor-pointer"
            )}
        >
            <div className="flex items-center gap-4 relative z-10">
                {/* Keycap Badge (1, 2, 3...) */}
                <div className={cn(
                    "shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center",
                    "text-sm font-black",
                    "transition-all duration-200",
                    showResult
                        ? isCorrect
                            ? "bg-emerald-500 text-white shadow-md"
                            : isSelected
                                ? "bg-red-500 text-white shadow-md"
                                : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                        : isSelected
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-white/15"
                )}>
                    {showResult && (isCorrect || isSelected) ? (
                        isCorrect
                            ? (
                                <>
                                    <Check className="w-4 h-4 relative z-10" strokeWidth={2.5} />
                                    {/* Correct Answer Particles */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {[...Array(6)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ scale: 0, x: 0, y: 0 }}
                                                animate={{
                                                    scale: [0, 1, 0],
                                                    x: (Math.random() - 0.5) * 50,
                                                    y: (Math.random() - 0.5) * 50
                                                }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-emerald-300"
                                            />
                                        ))}
                                    </div>
                                </>
                            )
                            : <X className="w-4 h-4" strokeWidth={2.5} />
                    ) : (
                        label
                    )}
                </div>

                {/* Answer Text - Swiss Design */}
                <span className={cn(
                    "flex-1",
                    "text-slate-800 dark:text-slate-200 font-normal",
                    "transition-opacity duration-200",
                    fontSizeConfig[fontSize],
                    isTransitioning && 'opacity-0',
                    showResult && !isCorrect && !isSelected && 'text-slate-500 dark:text-slate-500'
                )}>
                    {displayText}
                </span>

                {/* Popularity Badge */}
                {answerPopularity && showResult && (
                    <span className={cn(
                        "shrink-0 self-center",
                        "text-[11px] font-medium px-2.5 py-1 rounded-lg",
                        "bg-muted/60 text-muted-foreground",
                        "dark:bg-slate-700/60 dark:text-slate-400"
                    )}>
                        {popularityValue}%
                    </span>
                )}
            </div>

            {/* Correct Answer Subtle Gradient Overlay */}
            {showResult && isCorrect && (
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            )}
        </button>
    );
});

interface AnswerOptionsListProps {
    options: AnswerOption[];
    selectedOption: string | null;
    showResult: boolean;
    showTranslation: boolean;
    testLanguage: 'es' | 'en' | 'ru';
    fontSize: 'small' | 'medium' | 'large';
    isTransitioning: boolean;
    answerPopularity: boolean;
    onSelect: (optionId: string) => void;
    onAnswer?: (optionId: string) => void;
}

/**
 * Premium Answer Options List
 * "Premium Dark" style with optimal spacing and readability
 */
export const AnswerOptionsList = memo(function AnswerOptionsList({
    options,
    selectedOption,
    showResult,
    showTranslation,
    testLanguage,
    fontSize,
    isTransitioning,
    answerPopularity,
    onSelect,
    onAnswer,
}: AnswerOptionsListProps) {
    // Memoize popularity values to prevent flickering
    const popularityValues = useMemo(() =>
        options.map(opt =>
            opt.is_correct
                ? Math.floor(72 + Math.random() * 18)
                : Math.floor(8 + Math.random() * 15)
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [options.map(o => o.id).join(',')]
    );

    const handleClick = useCallback((optionId: string) => {
        if (selectedOption) return; // Already answered

        onSelect(optionId);
        onAnswer?.(optionId);
    }, [selectedOption, onSelect, onAnswer]);

    return (
        <div className="flex flex-col gap-3 sm:gap-4">
            {options.map((option, index) => {
                const isSelected = selectedOption === option.id;
                const displayText = (showTranslation || testLanguage === 'ru')
                    ? (option.text_ru || option.text_es || option.text || '')
                    : (testLanguage === 'en' ? (option.text_en || option.text_es || option.text || '') : (option.text_es || option.text || ''));

                return (
                    <AnswerButton
                        key={option.id}
                        option={option}
                        index={index}
                        isSelected={isSelected}
                        showResult={showResult}
                        displayText={displayText}
                        fontSize={fontSize}
                        isTransitioning={isTransitioning}
                        answerPopularity={answerPopularity}
                        popularityValue={popularityValues[index]}
                        disabled={showResult}
                        onClick={() => handleClick(option.id)}
                    />
                );
            })}
        </div>
    );
});

export default AnswerOptionsList;
