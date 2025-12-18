import { motion } from 'framer-motion';
import { memo, lazy, Suspense } from 'react';
import { getImageUrl } from '@/utils/imageUtils';
import { Scrambler } from '@/utils/scramble';
import { haptics } from '@/lib/haptics';

// КРИТИЧНО: Lazy loading для компонентов атак
// Это предотвращает циклические зависимости и TDZ ошибки при сборке
const InputLagWrapper = lazy(() => import('./attacks/InputLagWrapper').then(m => ({ default: m.InputLagWrapper })));
const EncryptionFlashlight = lazy(() => import('./attacks/EncryptionFlashlight').then(m => ({ default: m.EncryptionFlashlight })));

interface QuestionOption {
  id: string;
  text_es: string;
  text_ru?: string;
  text_en?: string;
  position: number;
}

interface Question {
  id: string;
  question_snapshot: {
    question_es: string;
    question_ru?: string;
    question_en?: string;
    image_url?: string;
    answer_options?: QuestionOption[];
  };
  correct_option_ids: string[];
}

interface DuelQuestionCardProps {
  question: Question;
  selectedAnswer: string | null;
  isAnswered: boolean;
  eliminatedOptions: string[];
  translationLanguage: 'ru' | 'en' | null;
  onAnswer: (optionId: string) => void;
  inputLagActive?: boolean;
  inputLagDelay?: number;
  cryptolockerActive?: boolean;
}

export const DuelQuestionCard = memo(({
  question,
  selectedAnswer,
  isAnswered,
  eliminatedOptions,
  translationLanguage,
  onAnswer,
  inputLagActive = false,
  inputLagDelay = 1500,
  cryptolockerActive = false,
}: DuelQuestionCardProps) => {
  if (!question || !question.question_snapshot) {
    return null;
  }

  const questionText = translationLanguage === 'ru' && question.question_snapshot.question_ru
    ? question.question_snapshot.question_ru
    : translationLanguage === 'en' && question.question_snapshot.question_en
      ? question.question_snapshot.question_en
      : question.question_snapshot.question_es;

  const answerOptions = (question.question_snapshot.answer_options || [])
    .sort((a, b) => a.position - b.position);

  // Контент карточки
  const cardContent = (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-3xl p-4 md:p-6 lg:p-8 shadow-2xl flex-1 flex flex-col overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Question Image */}
      {question.question_snapshot.image_url && getImageUrl(question.question_snapshot.image_url) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-2xl overflow-hidden bg-muted/50"
        >
          <img
            src={getImageUrl(question.question_snapshot.image_url) || ''}
            alt="Question"
            className="w-full h-48 md:h-56 object-contain"
          />
        </motion.div>
      )}

      {/* Question Text */}
      <h2 className="text-xl md:text-2xl font-bold mb-6 leading-relaxed text-foreground break-words min-h-[60px] md:min-h-[80px]">
        {cryptolockerActive && !isAnswered ? <Scrambler>{questionText}</Scrambler> : questionText}
      </h2>

      {/* Answer Options */}
      <div className="grid gap-3">
        {answerOptions.map((option, idx) => {
          const isSelected = selectedAnswer === option.id;
          const isCorrect = question.correct_option_ids.includes(option.id);
          const showResult = isAnswered;
          const isEliminated = eliminatedOptions.includes(option.id);

          if (isEliminated && !showResult) {
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
              />
            );
          }

          const optionText = translationLanguage === 'ru' && option.text_ru
            ? option.text_ru
            : translationLanguage === 'en' && option.text_en
              ? option.text_en
              : option.text_es;

          const buttonElement = (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => {
                if (!isAnswered && !isEliminated) {
                  // Haptic feedback при клике на кнопку ответа
                  haptics.answerClick();
                  onAnswer(option.id);
                }
              }}
              disabled={isAnswered || isEliminated}
              whileHover={!isAnswered && !isEliminated ? { scale: 1.02 } : {}}
              whileTap={!isAnswered && !isEliminated ? { scale: 0.98 } : {}}
              className={`p-3 md:p-4 rounded-2xl border-2 text-left transition-all font-semibold text-sm md:text-base leading-snug relative overflow-hidden min-h-[48px] md:min-h-[60px] break-words hyphens-auto w-full ${
                showResult
                  ? isCorrect
                    ? 'bg-green-500/20 border-green-500 text-foreground shadow-lg'
                    : isSelected
                      ? 'bg-red-500/20 border-red-500 text-foreground shadow-lg'
                      : 'bg-muted/30 border-border/30 opacity-50'
                  : isSelected
                    ? 'bg-primary/20 border-primary shadow-lg'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-primary/10 hover:shadow-md'
              }`}
            >
              {showResult && (isCorrect || isSelected) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-2 md:top-3 right-2 md:right-3 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-white ${
                    isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  {isCorrect ? '✓' : '✗'}
                </motion.div>
              )}
              <span className="block pr-10 text-base break-words hyphens-auto">
                {cryptolockerActive && !isAnswered ? <Scrambler>{optionText}</Scrambler> : optionText}
              </span>
            </motion.button>
          );

          // 🆕 Обертываем в InputLagWrapper если лаг активен
          if (inputLagActive && !isAnswered && !isEliminated) {
            return (
              <Suspense key={option.id} fallback={buttonElement}>
                <InputLagWrapper
                  isActive={inputLagActive}
                  delayMs={inputLagDelay}
                  onClick={() => {
                    if (!isAnswered && !isEliminated) {
                      haptics.answerClick();
                      onAnswer(option.id);
                    }
                  }}
                  disabled={isAnswered || isEliminated}
                  className="w-full"
                >
                  {buttonElement}
                </InputLagWrapper>
              </Suspense>
            );
          }

          return (
            <div key={option.id}>
              {buttonElement}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Если cryptolocker активен - оборачиваем весь контент в один EncryptionFlashlight
  if (cryptolockerActive && !isAnswered) {
    const radius = typeof window !== 'undefined' && window.innerWidth < 768 ? 140 : 180;
    return (
      <Suspense fallback={cardContent}>
        <EncryptionFlashlight isActive={true} flashlightRadius={radius}>
          {cardContent}
        </EncryptionFlashlight>
      </Suspense>
    );
  }

  return cardContent;
});

DuelQuestionCard.displayName = 'DuelQuestionCard';


