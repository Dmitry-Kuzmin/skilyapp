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
import { Languages, Sparkles, Bot, Wand2 } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionTextProps {
  text: string;
  fontSize?: number; // 0, 1, 2
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  translationLabel?: string;
  className?: string;
  isTransitioning?: boolean;
  hintsEnabled?: boolean; // Ручное перекрытие настроек
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

// Premium Tooltip Content Component - Absolute Perfection (Obsidian Monolith)
const TooltipContent: React.FC<TooltipContentProps> = ({ word, translation, explanation }) => (
  <div className="relative flex flex-col items-center">
    {/* Main Container: Obsidian Monolith */}
    <div className="relative w-64 overflow-hidden rounded-xl bg-[#09090b] shadow-2xl ring-1 ring-white/10 transition-all">

      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative p-3.5">

        {/* HEADER: Title + Badge */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-white tracking-wide antialiased">
            {translation}
          </h3>

          {/* BADGE: Code Style (Electric Indigo) */}
          <div className="flex items-center rounded-[6px] bg-indigo-500/10 px-2 py-0.5 ring-1 ring-inset ring-indigo-500/20">
            <span className="font-mono text-[10px] font-medium text-indigo-300 tracking-tight">
              {word}
            </span>
          </div>
        </div>

        {/* BODY: Icon + Text */}
        <div className="flex gap-3 items-start">
          {/* Icon: Electric Blue Glow */}
          <div className="mt-0.5 shrink-0 relative">
            <div className="absolute inset-0 bg-blue-500 blur-[6px] opacity-20 rounded-full" />
            <Sparkles className="relative w-3.5 h-3.5 text-blue-400" />
          </div>

          <p className="text-[11px] leading-[1.6] text-zinc-300 font-medium tracking-wide select-none">
            {explanation}
          </p>
        </div>
      </div>

      {/* FOOTER: Integrated Status Bar */}
      <div className="relative px-3.5 py-2 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
        <span className="text-[9px] font-bold text-zinc-600 tracking-[0.2em] uppercase">
          AI Explanation
        </span>
        <Bot className="w-3 h-3 text-zinc-700 group-hover:text-blue-500 transition-colors duration-300" />
      </div>
    </div>

    {/* PERFECT ARROW: Custom SVG for total fusion */}
    <svg
      width="16"
      height="8"
      viewBox="0 0 16 8"
      className="relative -mt-[1px] drop-shadow-md"
      style={{ fill: '#09090b' }}
    >
      <path d="M8 8L0 0H16L8 8Z" />
      <path d="M0 0L8 8L16 0" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    </svg>
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
  hintsEnabled,
}: QuestionTextProps) {
  const settingsSmartVocabulary = useSettingsStore((state) => state.smartVocabularyEnabled);
  const isHintsActive = hintsEnabled !== undefined ? hintsEnabled : settingsSmartVocabulary;

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

      // 1. Ключевые слова-ловушки (только если подсказки включены)
      const isKeyword = keywords.some(k => k.toLowerCase() === lowerPart);
      if (isKeyword && isHintsActive) {
        return (
          <span key={i} className="text-amber-500 dark:text-amber-400 font-black underline decoration-amber-500/30 underline-offset-4">
            {part}
          </span>
        );
      }

      // 2. Слова из словаря - используем Tippy (только если подсказки включены)
      const dictEntry = PDD_DICTIONARY_ES[lowerPart as keyof typeof PDD_DICTIONARY_ES];
      if (dictEntry && isHintsActive) {
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
            placement="top"
            arrow={false}
            delay={[0, 0]}
            duration={[150, 100]}
            maxWidth={320}
            zIndex={2147483647}
            appendTo={() => document.body}
            popperOptions={{
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: {
                    boundary: 'viewport',
                    padding: 12,
                  },
                },
                {
                  name: 'flip',
                  options: {
                    fallbackPlacements: ['bottom', 'left', 'right'],
                  },
                },
              ],
            }}
          >
            <span className="cursor-help border-b-2 border-dashed border-blue-500/30 hover:border-blue-500 text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-all duration-150">
              {part}
            </span>
          </Tippy>
        );
      }

      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={cn("relative group/qtext w-full", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          initial={{ opacity: 0, filter: 'blur(8px)', y: 2 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, filter: 'blur(4px)', y: -2 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn("relative w-full", onToggleTranslation ? "pb-1" : "")}
        >
          <h2
            className={cn(
              fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses[1],
              "font-bold leading-tight tracking-tight text-slate-900 dark:text-white/95 whitespace-pre-line m-0",
            )}
          >
            {renderSmartText(text)}

            {/* Translation Button - Inline at the end of the last line, pushed to the right */}
            {onToggleTranslation && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTranslation();
                }}
                className={cn(
                  "inline-flex items-center align-middle float-right ml-4 p-1 mt-1 transition-all duration-500 active:scale-75 select-none",
                  showTranslation
                    ? "text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                    : "text-slate-400/50 hover:text-blue-500/80 hover:scale-110"
                )}
                title={showTranslation ? "Показать оригинал" : "Перевести"}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M5 8l6 6" />
                  <path d="M4 14l6-6 2-3" />
                  <path d="M2 8h12" />
                  <path d="M7 2h1" />
                  <path d="M22 22l-5-10-5 10" />
                  <path d="M14 18h6" />
                </svg>
              </button>
            )}
          </h2>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
