/**
 * Универсальный компонент текста вопроса
 */

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
    const regex = new RegExp(`\\b(${allPatterns.join('|')}) \\b`, 'gi');

    const parts = rawText.split(regex);

    return parts.map((part, i) => {
      const lowerPart = part.toLowerCase();

      // 1. Проверяем, является ли часть ключевым словом-ловушкой (Solo, Siempre...)
      const isKeyword = keywords.some(k => k.toLowerCase() === lowerPart);
      if (isKeyword) {
        return (
          <span key={i} className="text-orange-400 font-black underline decoration-orange-400/30 underline-offset-4">
            {part}
          </span>
        );
      }

      // 2. Проверяем, есть ли слово в словаре
      const dictEntry = PDD_DICTIONARY_ES[lowerPart];
      if (dictEntry && !showTranslation) {
        return (
          <TooltipProvider key={i}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b-2 border-dashed border-blue-400/50 hover:border-blue-400 text-blue-200 transition-colors">
                  {part}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 border-slate-800 p-3 max-w-[250px] shadow-2xl">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-blue-400 uppercase tracking-tighter">🇷🇺 {dictEntry.ru}</div>
                  <div className="text-[11px] leading-relaxed text-slate-400 italic font-medium">{dictEntry.explanation}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return part;
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Свитч языков над вопросом (если доступен перевод) */}
      {onToggleTranslation && (
        <div className="flex justify-start mb-4">
          <div className="flex p-1 bg-slate-900/50 border border-white/5 rounded-xl backdrop-blur-sm self-start">
            <button
              onClick={() => showTranslation && onToggleTranslation()}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300",
                !showTranslation
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              🇪🇸 ES
            </button>
            <button
              onClick={() => !showTranslation && onToggleTranslation()}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300",
                showTranslation
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
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
            "font-semibold leading-snug text-white/95 whitespace-pre-line transition-all duration-300",
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
          )}
        >
          {renderSmartText(text)}
        </h2>
      </div>
    </div>
  );
}
