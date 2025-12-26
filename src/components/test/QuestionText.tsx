/**
 * Универсальный компонент текста вопроса
 */

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PDD_DICTIONARY_ES, PDD_KEYWORDS, PDD_KEYWORDS_RU } from "@/utils/pddDictionary";
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

// Typography Hierarchy: Question should be "Boss" - larger & bolder than answers
const fontSizeClasses = {
  0: 'text-base sm:text-lg',
  1: 'text-lg sm:text-xl',
  2: 'text-xl sm:text-2xl',
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

  // Функция для обработки текста: подсветка ключевых слов и добавление тултипов
  const renderSmartText = (rawText: string) => {
    if (!rawText) return null;

    // Регулярное выражение для поиска ключевых слов и терминов словаря
    // Ищем слова целиком (границы слов \b)
    const dictionaryTerms = Object.keys(PDD_DICTIONARY_ES);
    const keywords = showTranslation ? PDD_KEYWORDS_RU : PDD_KEYWORDS;

    // Комбинируем все интересные нам слова
    const allPatterns = [...dictionaryTerms, ...keywords];
    const regex = new RegExp(`\\b(${allPatterns.join('|')})\\b`, 'gi');

    const parts = rawText.split(regex);

    return parts.map((part, i) => {
      const lowerPart = part.toLowerCase();

      // 1. Проверяем, является ли часть ключевым словом-ловушкой (Solo, Siempre...)
      const isKeyword = keywords.some(k => k.toLowerCase() === lowerPart);
      if (isKeyword) {
        return (
          <React.Fragment key={i}>
            <span className="text-orange-400 font-black underline decoration-orange-400/30 underline-offset-4">
              {part}
            </span>
          </React.Fragment>
        );
      }

      // 2. Проверяем, есть ли слово в словаре
      const dictEntry = PDD_DICTIONARY_ES[lowerPart];
      if (dictEntry && !showTranslation) {
        return (
          <React.Fragment key={i}>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span className="cursor-help border-b-2 border-dashed border-blue-500 hover:border-blue-400 text-blue-600 dark:text-blue-300 transition-colors">
                    {part}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-white dark:bg-slate-900 border-2 border-blue-500/30 dark:border-blue-400/30 p-4 max-w-[280px] shadow-2xl rounded-xl backdrop-blur-xl z-[9999]"
                >
                  <div className="space-y-2">
                    <div className="text-base font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">🇷🇺 {dictEntry.ru}</div>
                    <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">{dictEntry.explanation}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </React.Fragment>
        );
      }

      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Переключатель языков - кнопки ES/RU */}
      {onToggleTranslation && (
        <div className="flex justify-start mb-4">
          <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl backdrop-blur-sm">
            <button
              onClick={() => showTranslation && onToggleTranslation()}
              className={cn(
                "px-5 py-2.5 text-sm font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                !showTranslation
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              🇪🇸 ES
            </button>
            <button
              onClick={() => !showTranslation && onToggleTranslation()}
              className={cn(
                "px-5 py-2.5 text-sm font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                showTranslation
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              🇷🇺 RU
            </button>
          </div>
        </div>
      )}

      <div className="relative group">
        <h2
          className={cn(
            fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses[1],
            "font-semibold leading-snug text-slate-900 dark:text-white/95 whitespace-pre-line transition-all duration-300",
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
          )}
        >
          {renderSmartText(text)}
        </h2>
      </div>
    </div>
  );
}
