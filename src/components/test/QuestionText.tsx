/**
 * Универсальный компонент текста вопроса
 * Использует Tippy.js для умных подсказок-переводов
 */

import React from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';
import { PDD_DICTIONARY_ES, PDD_KEYWORDS, PDD_KEYWORDS_RU } from "@/utils/pddDictionary";
import { cn } from '@/lib/utils';
import { Languages, Sparkles } from 'lucide-react';

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
  0: 'text-lg sm:text-xl',
  1: 'text-xl sm:text-2xl',
  2: 'text-2xl sm:text-3xl',
};

// Premium Tooltip Content Component
interface TooltipContentProps {
  word: string;
  translation: string;
  explanation: string;
}

const TooltipContent: React.FC<TooltipContentProps> = ({ word, translation, explanation }) => (
  <div className="w-72 overflow-hidden rounded-2xl bg-slate-950 border border-white/10 shadow-2xl">
    {/* Header Glow */}
    <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />

    <div className="p-4 space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/20 flex items-center justify-center border border-blue-500/20">
          <Languages className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-bold">Перевод</span>
          <span className="text-lg font-black text-white tracking-tight">{translation}</span>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <p className="text-sm leading-relaxed text-slate-300 font-medium">
        💡 {explanation}
      </p>

      {/* Premium Badge */}
      <div className="pt-0.5 flex justify-between items-center">
        <span className="text-[9px] text-slate-500 font-medium italic">«{word}»</span>
        <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-blue-400" />
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">Skily</span>
        </div>
      </div>
    </div>
  </div>
);

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

    const dictionaryTerms = Object.keys(PDD_DICTIONARY_ES);
    const keywords = showTranslation ? PDD_KEYWORDS_RU : PDD_KEYWORDS;
    const allPatterns = [...dictionaryTerms, ...keywords];
    // Use capturing group to split but keep delimiters
    const regex = new RegExp(`(\\b(?:${allPatterns.join('|')})\\b)`, 'gi');
    const parts = rawText.split(regex);

    return parts.map((part, i) => {
      const lowerPart = part.toLowerCase();

      // 1. Ключевые слова-ловушки
      const isKeyword = keywords.some(k => k.toLowerCase() === lowerPart);
      if (isKeyword) {
        return (
          <span key={i} className="text-orange-400 font-black underline decoration-orange-400/30 underline-offset-4">
            {part}
          </span>
        );
      }

      // 2. Слова из словаря - используем Tippy
      const dictEntry = PDD_DICTIONARY_ES[lowerPart as keyof typeof PDD_DICTIONARY_ES];
      if (dictEntry) {
        return (
          <Tippy
            key={i}
            content={
              <TooltipContent
                word={part}
                translation={dictEntry.ru}
                explanation={dictEntry.explanation}
              />
            }
            interactive={true}
            animation="shift-away"
            placement="auto"
            arrow={true}
            delay={[100, 0]}
            duration={[200, 150]}
            maxWidth={320}
            zIndex={2147483647}
            appendTo={() => document.body}
            popperOptions={{
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: {
                    boundary: 'viewport',
                    padding: 8,
                  },
                },
                {
                  name: 'flip',
                  options: {
                    fallbackPlacements: ['top', 'bottom', 'left', 'right'],
                  },
                },
              ],
            }}
          >
            <span className="cursor-help border-b-2 border-dashed border-blue-500/40 hover:border-blue-500 text-blue-500 dark:text-blue-400 hover:text-blue-600 transition-all duration-150">
              {part}
            </span>
          </Tippy>
        );
      }

      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative group">
        <h2
          className={cn(
            fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses[1],
            "font-bold leading-tight tracking-tight text-slate-900 dark:text-white/95 whitespace-pre-line transition-all duration-300",
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
          )}
        >
          {renderSmartText(text)}
        </h2>
      </div>
    </div>
  );
}
