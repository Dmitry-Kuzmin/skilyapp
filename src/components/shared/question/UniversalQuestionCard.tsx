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
import { cn } from '@/lib/utils';

export type QuestionMode = 'exam' | 'practice' | 'duel' | 'learning' | 'exam-russia';

interface UniversalQuestionCardProps {
  // Данные вопроса
  question: string;
  image?: string | null;
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
  answers,
  selectedAnswerId,
  showResult = false,
  disabled = false,
  onAnswerClick,
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

  return (
    <QuestionCard compact={isCompact} className={className}>
      {/* Header (для таймера, счетчика и т.д.) */}
      {header && (
        <div className="mb-4">
          {header}
        </div>
      )}

      {/* Двухколоночный layout: изображение слева, вопрос справа */}
      {image ? (
        <div className={cn(
          "grid gap-4 md:gap-6",
          isCompact 
            ? "grid-cols-1 md:grid-cols-[280px_1fr]" 
            : "grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[350px_1fr]"
        )}>
          {/* Левая колонка: Изображение */}
          <div className="w-full md:sticky md:top-4 md:self-start">
            <QuestionImage imageUrl={image} compact={isCompact} />
          </div>

          {/* Правая колонка: Текст вопроса и ответы */}
          <div className="flex flex-col">
            <QuestionText
              text={question}
              fontSize={fontSize}
              showTranslation={showTranslation}
              onToggleTranslation={onToggleTranslation}
              translationLabel={translationLabel}
            />

            {/* Ответы */}
            <div className={cn(
              "space-y-2 sm:space-y-2.5 mb-4 sm:mb-6",
              isCompact && "space-y-2"
            )}>
              {answers.map((answer) => (
                <AnswerButton
                  key={answer.id}
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
              ))}
            </div>

            {/* Дополнительный контент */}
            {children}
          </div>
        </div>
      ) : (
        // Layout без изображения (вертикальный)
        <>
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
            "space-y-2 sm:space-y-2.5 mb-4 sm:mb-6",
            isCompact && "space-y-2"
          )}>
            {answers.map((answer) => (
              <AnswerButton
                key={answer.id}
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
            ))}
          </div>

          {/* Дополнительный контент */}
          {children}
        </>
      )}

      {/* Footer (для кнопок навигации, подсказок и т.д.) */}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
    </QuestionCard>
  );
}

