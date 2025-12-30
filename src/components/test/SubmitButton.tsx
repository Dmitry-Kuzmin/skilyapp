/**
 * Универсальная кнопка подтверждения ответа
 * Используется во ВСЕХ тестах: РФ, Испания, DGT, экзамены, практика
 * 
 * Фичи:
 * - Поддержка клавиатуры (Enter/Space)
 * - Анимации при нажатии
 * - Tooltip с подсказками
 * - Адаптивный текст
 */

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, CornerDownLeft, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmitButtonProps {
    /** Текст кнопки */
    label: string;
    /** Флаг нажатия Enter для анимации */
    isEnterPressed?: boolean;
    /** Кнопка активна */
    disabled?: boolean;
    /** Обработчик клика */
    onClick: () => void;
    /** Текст подсказки в тултипе */
    tooltipText?: string;
    /** Показывать иконку стрелки */
    showArrow?: boolean;
    /** Показывать подсказку клавиатуры */
    showKeyboardHint?: boolean;
    /** Дополнительные классы */
    className?: string;
    /** Вариант стиля */
    variant?: 'default' | 'exam' | 'practice';
}

export function SubmitButton({
    label,
    isEnterPressed = false,
    disabled = false,
    onClick,
    tooltipText,
    showArrow = true,
    showKeyboardHint = true,
    className,
    variant = 'default',
}: SubmitButtonProps) {
    // Определяем стиль в зависимости от варианта
    const getVariantStyles = () => {
        switch (variant) {
            case 'exam':
                return cn(
                    'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600',
                    'text-white',
                    'shadow-[0_4px_20px_rgba(59,130,246,0.4)]',
                    'hover:shadow-[0_8px_25px_rgba(59,130,246,0.5)]',
                    'hover:-translate-y-0.5'
                );
            case 'practice':
                return 'variant-brand';
            default:
                return 'variant-brand';
        }
    };

    const buttonContent = (
        <Button
            variant={variant === 'exam' ? undefined : 'brand'}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex-1 font-semibold h-12 sm:h-14 rounded-2xl transition-all duration-200 relative',
                variant === 'exam' && getVariantStyles(),
                disabled && 'opacity-50 cursor-not-allowed',
                isEnterPressed && !disabled && 'scale-[0.98] brightness-110 shadow-blue-400/50',
                'active:scale-[0.98]',
                className
            )}
        >
            <span className="text-lg sm:text-xl">{label}</span>

            {/* Иконка стрелки */}
            {showArrow && !disabled && (
                <ArrowRight className="w-5 h-5 ml-2" />
            )}

            {/* Подсказка клавиатуры (только на desktop) */}
            {showKeyboardHint && !disabled && (
                <span
                    className={cn(
                        'hidden sm:inline-flex absolute right-4 text-[10px] items-center gap-1 opacity-50 font-mono transition-all duration-200',
                        isEnterPressed && 'scale-110 opacity-100 text-yellow-400'
                    )}
                >
                    <Keyboard className="w-4 h-4" />
                    <span className="border border-white/30 px-1 rounded flex items-center gap-0.5">
                        Enter <CornerDownLeft className="w-3 h-3" />
                    </span>
                </span>
            )}
        </Button>
    );

    // Если есть tooltip, оборачиваем
    if (tooltipText) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {buttonContent}
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-900 border-white/10 text-white">
                        <p>{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return buttonContent;
}
