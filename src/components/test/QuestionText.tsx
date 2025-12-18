/**
 * Универсальный компонент текста вопроса
 */

import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionTextProps {
  text: string;
  fontSize?: number; // 0, 1, 2
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  translationLabel?: string;
  className?: string;
  isTransitioning?: boolean;
}

const fontSizeClasses = {
  0: 'text-base sm:text-lg',
  1: 'text-lg sm:text-xl md:text-2xl',
  2: 'text-xl sm:text-2xl md:text-3xl',
};

export function QuestionText({
  text,
  fontSize = 1,
  showTranslation = false,
  onToggleTranslation,
  translationLabel,
  className,
  isTransitioning = false,
}: QuestionTextProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="relative p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border-2 border-border/50 shadow-sm">
        <h2 
          className={cn(
            fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses[1],
            "font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300",
            isTransitioning ? 'opacity-0' : 'opacity-100',
            onToggleTranslation && "pr-12"
          )}
        >
          {text}
        </h2>
        
        {/* Кнопка перевода (если нужна) */}
        {onToggleTranslation && (
          <button
            onClick={onToggleTranslation}
            className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors z-10"
            title={translationLabel || (showTranslation ? "Показать оригинал" : "Показать перевод")}
          >
            <Languages className="w-3 h-3" />
            <span>{showTranslation ? "ES" : "RU"}</span>
          </button>
        )}
      </div>
    </div>
  );
}


