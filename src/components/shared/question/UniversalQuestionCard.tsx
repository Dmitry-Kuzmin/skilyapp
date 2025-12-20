/**
 * Универсальная карточка вопроса для ВСЕХ режимов
 * Используется в: экзаменах РФ, тестах DGT, дуэлях, играх, обучении
 * 
 * Единый дизайн, настраиваемый через props
 */

import { ReactNode } from 'react';
import { QuestionCard } from '@/components/test/QuestionCard';
import { QuestionImage } from '@/components/test/QuestionImage';
import { QuestionText } from '@/components/test/QuestionText';
import { AnswerButton } from '@/components/test/AnswerButton';
import { LumiCharacter } from '@/components/lumi/LumiCharacter';
import { cn } from '@/lib/utils';

export type QuestionMode = 'exam' | 'practice' | 'duel' | 'learning' | 'exam-russia';

interface UniversalQuestionCardProps {
  // Данные вопроса
  question: string;
  image?: string | null;
  imageAspectRatio?: number | null; // Для адаптивного layout
  explanation?: string | null; // Объяснение к вопросу
  answers: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;

  // Состояние
  selectedAnswerId?: string | null;
  showResult?: boolean; // показывать ли правильность ответа
  disabled?: boolean;

  // Обработчики
  onAnswerClick: (answerId: string) => void;
  onShowExplanation?: () => void; // Для открытия Lumi/Skily

  // Настройки режима
  mode?: QuestionMode;
  showTimer?: boolean;
  showExplanationButton?: boolean;
  showTranslationButton?: boolean;
  onToggleTranslation?: () => void;
  translationLabel?: string;

  // Настройки внешнего вида
  fontSize?: number;
  compact?: boolean;
  className?: string;

  // Дополнительный контент (для дуэлей, подсказок и т.д.)
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function UniversalQuestionCard({
  question,
  image,
  imageAspectRatio,
  explanation,
  answers,
  selectedAnswerId,
  showResult = false,
  disabled = false,
  onAnswerClick,
  onShowExplanation,
  mode = 'practice',
  showTimer = false,
  showExplanationButton = false,
  showTranslationButton = false,
  onToggleTranslation,
  translationLabel,
  fontSize = 1,
  compact = false,
  className,
  header,
  footer,
  children,
}: UniversalQuestionCardProps) {
  // Определяем стиль в зависимости от режима
  const isCompact = compact || mode === 'duel';
  const isExam = mode === 'exam' || mode === 'exam-russia';
  const showTranslation = showTranslationButton && mode !== 'exam' && mode !== 'exam-russia';

  // Определяем, горизонтальное ли изображение (aspectRatio > 1.2)
  // Для горизонтальных изображений используем вертикальный layout (изображение сверху)
  const isLandscapeImage = imageAspectRatio !== null && imageAspectRatio > 1.2;

  return (
    <QuestionCard compact={isCompact} className={className}>
      {/* Header (для таймера, счетчика и т.д.) */}
      {header && (
        <div className="mb-4">
          {header}
        </div>
      )}

      {/* Вертикальный layout: Изображение -> Текст -> Ответы */}
      <div className="space-y-4 md:space-y-6">
        {/* Изображение сверху (если есть) */}
        {image && (
          <div className="w-full">
            <QuestionImage imageUrl={image} compact={isCompact} />
          </div>
        )}

        {/* Текст вопроса и ответы снизу */}
        <div className="flex flex-col">
          <QuestionText
            text={question}
            fontSize={fontSize}
            showTranslation={showTranslation}
            onToggleTranslation={onToggleTranslation}
            translationLabel={translationLabel}
            className="mb-4 sm:mb-6"
          />

          {/* Ответы */}
          <div className={cn(
            "space-y-2 sm:space-y-3 mb-4 sm:mb-6",
            isCompact && "space-y-2"
          )}>
            {answers.map((answer, index) => (
              <div key={answer.id} className="relative group">
                <div className="absolute left-[-2rem] top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {index + 1}
                </div>
                <AnswerButton
                  id={answer.id}
                  text={answer.text}
                  isCorrect={answer.isCorrect}
                  isSelected={selectedAnswerId === answer.id}
                  showResult={showResult}
                  disabled={disabled}
                  onClick={() => onAnswerClick(answer.id)}
                  fontSize={fontSize}
                  variant={isCompact ? 'compact' : 'standard'}
                />
              </div>
            ))}
          </div>

          {/* Объяснение или кнопка Lumi - показываем после ответа */}
          {selectedAnswerId && (
            <div className="mt-2 flex justify-end">
              {explanation && !onShowExplanation ? (
                // Простое объяснение, если нет кнопки Lumi
                <div className="w-full p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💡 Объяснение:
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed whitespace-pre-line">
                    {explanation}
                  </p>
                </div>
              ) : onShowExplanation ? (
                // Компактная кнопка Lumi для открытия объяснения
                <button
                  onClick={onShowExplanation}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all duration-300"
                >
                  <div className="relative w-6 h-6 shrink-0">
                    <LumiCharacter size="sm" mood="happy" animate={false} className="relative z-10" />
                  </div>
                  <span className="text-sm font-semibold">Спросить Skily</span>
                </button>
              ) : null}
            </div>
          )}

          {/* Дополнительный контент */}
          {children}
        </div>
      </div>

      {/* Footer (для кнопок навигации, подсказок и т.д.) */}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
    </QuestionCard>
  );
}

