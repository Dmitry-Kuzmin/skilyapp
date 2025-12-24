/**
 * Универсальная кнопка ответа
 * Используется во всех тестах с единым дизайном
 */

import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface AnswerButtonProps {
  id: string;
  text: string;
  isCorrect: boolean;
  isSelected: boolean;
  showResult: boolean; // показывать ли результат (правильно/неправильно)
  disabled?: boolean;
  onClick: () => void;
  fontSize?: number;
  showPopularity?: boolean;
  popularity?: number;
  className?: string;
  variant?: 'standard' | 'compact'; // вариант отображения
}

const fontSizeClasses = {
  0: 'text-base sm:text-lg',
  1: 'text-lg sm:text-xl',
  2: 'text-xl sm:text-2xl',
};

export const AnswerButton = memo(function AnswerButton({
  id,
  text,
  isCorrect,
  isSelected,
  showResult,
  disabled = false,
  onClick,
  fontSize = 1,
  showPopularity = false,
  popularity,
  className,
  variant = 'standard',
}: AnswerButtonProps) {
  const isCompact = variant === 'compact';
  return (
    <button
      key={id}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left border-2 transition-all duration-300 font-medium",
        isCompact
          ? "p-2.5 sm:p-3 rounded-lg"
          : "p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl",
        // Состояния результата
        showResult
          ? isCorrect
            ? "border-emerald-500 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 shadow-xl shadow-emerald-500/25 animate-fade-in"
            : isSelected
              ? "border-red-500 bg-gradient-to-r from-red-500/15 to-red-500/5 shadow-xl shadow-red-500/25 animate-fade-in"
              : "border-border/20 opacity-40"
          : isSelected
            ? "border-accent bg-gradient-to-r from-accent/15 to-accent/5 shadow-xl shadow-accent/30 scale-[1.02] ring-2 ring-accent/20"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:scale-[1.01] hover:shadow-md",
        !disabled && !showResult && "cursor-pointer active:scale-[0.98] active:shadow-inner",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <span className={cn(
          "flex-1",
          fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses[1],
          "leading-relaxed transition-opacity duration-300"
        )}>
          {text}
        </span>

        {/* Популярность ответа */}
        {showPopularity && showResult && (
          <span className={cn(
            "text-xs sm:text-sm font-bold px-2 py-1 rounded-md shrink-0",
            isCorrect
              ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30"
              : "text-muted-foreground"
          )}>
            {popularity || 0}%
          </span>
        )}

        {/* Иконки результата */}
        {showResult && isCorrect && (
          <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500/20 animate-scale-in shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        )}
        {showResult && isSelected && !isCorrect && (
          <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500/20 animate-scale-in shrink-0">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
          </div>
        )}
      </div>
    </button>
  );
});

