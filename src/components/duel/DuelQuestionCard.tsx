import { motion, AnimatePresence } from 'framer-motion';
import { memo, lazy, Suspense, useState } from 'react';
import { getImageUrl } from '@/utils/imageUtils';
import { Scrambler } from '@/utils/scramble';
import { haptics } from '@/lib/haptics';
import { ThreeDImageViewer } from "@/components/ui/ThreeDImageViewer";

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
  const [is3DViewerOpen, setIs3DViewerOpen] = useState(false);

  if (!question || !question.question_snapshot) {
    return null;
  }

  // Улучшенная логика выбора текста с fallback для РФ вопросов
  const getQuestionText = () => {
    // 1. Если явный перевод запрошен
    if (translationLanguage === 'ru' && question.question_snapshot.question_ru) {
      return question.question_snapshot.question_ru;
    }
    if (translationLanguage === 'en' && question.question_snapshot.question_en) {
      return question.question_snapshot.question_en;
    }
    // 2. Испанский (основной для DGT)
    if (question.question_snapshot.question_es) {
      return question.question_snapshot.question_es;
    }
    // 3. Fallback: РФ или EN если испанского нет
    return question.question_snapshot.question_ru || question.question_snapshot.question_en || 'Текст вопроса отсутствует';
  };
  const questionText = getQuestionText();

  const answerOptions = (question.question_snapshot.answer_options || [])
    .sort((a, b) => a.position - b.position);

  // Контент карточки
  const hasImage = !!(question.question_snapshot.image_url && getImageUrl(question.question_snapshot.image_url));
  const imageUrl = hasImage ? getImageUrl(question.question_snapshot.image_url) || '' : '';

  const cardContent = (
    <>
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-3xl p-4 md:p-6 lg:p-8 shadow-2xl flex-1 flex flex-col overflow-y-auto overscroll-contain max-w-7xl mx-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>

        <div className={`flex flex-col md:flex-row gap-6 md:gap-8 h-full ${!hasImage ? 'justify-center' : ''}`}>

          {/* Left Column: Media (Image) - Only if image exists */}
          {hasImage && (
            <div className="md:w-[55%] flex flex-col">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative rounded-3xl overflow-hidden group cursor-zoom-in shadow-2xl bg-black/40 border border-white/10"
                onClick={() => setIs3DViewerOpen(true)}
              >
                {/* Blur Background - Increased opacity and better blur for "filled" look */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-110 group-hover:scale-125 transition-transform duration-700 saturate-150"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />

                {/* Main Image with rounded corners and shadow - Reduced padding for tighter frame */}
                <div className="relative z-10 p-1 w-full h-full flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Question media"
                    className="w-full h-auto object-contain max-h-[400px] rounded-xl shadow-lg group-hover:scale-[1.02] transition-transform duration-500 will-change-transform"
                  />
                </div>

                {/* Expand Overlay Hint */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-maximize-2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Right Column: Question & Options */}
          <div className={`flex flex-col justify-center ${hasImage ? 'md:w-[45%]' : 'w-full max-w-4xl mx-auto'}`}>
            {/* Question Text - More breathing room */}
            <h2 className={`text-xl md:text-2xl font-bold mb-6 leading-relaxed text-foreground break-words ${!hasImage ? 'text-center' : ''}`}>
              {cryptolockerActive && !isAnswered ? <Scrambler>{questionText}</Scrambler> : questionText}
            </h2>

            {/* Answer Options */}
            <div className="grid gap-4 w-full">
              {answerOptions.map((option, idx) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrect = question.correct_option_ids.includes(option.id);
                // CRITICAL FIX: Show result colors ONLY when we actually know the correct answers
                // Wait for server to return correct_option_ids (length > 0)
                const hasCorrectOptions = question.correct_option_ids && question.correct_option_ids.length > 0;
                const showResult = isAnswered && hasCorrectOptions;
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

                // Улучшенная логика выбора текста ответа с fallback
                const getOptionText = () => {
                  if (translationLanguage === 'ru' && option.text_ru) return option.text_ru;
                  if (translationLanguage === 'en' && option.text_en) return option.text_en;
                  if (option.text_es) return option.text_es;
                  // Fallback для РФ вопросов
                  return option.text_ru || option.text_en || 'Вариант';
                };
                const optionText = getOptionText();

                const buttonElement = (
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      if (!isAnswered && !isEliminated) {
                        // Haptic feedback при клике на кнопку ответа
                        haptics.answerClick();
                        onAnswer(option.id);
                      }
                    }}
                    disabled={isAnswered || isEliminated}
                    whileHover={!isAnswered && !isEliminated ? { scale: 1.01, x: 4 } : {}}
                    whileTap={!isAnswered && !isEliminated ? { scale: 0.99 } : {}}
                    className={`p-4 rounded-xl border-2 text-left transition-all font-semibold text-base leading-snug overflow-hidden min-h-[60px] w-full select-none flex items-center justify-between gap-3 ${showResult
                      ? isCorrect
                        ? 'bg-green-500/20 border-green-500 text-foreground shadow-lg'
                        : isSelected
                          ? 'bg-red-500/20 border-red-500 text-foreground shadow-lg'
                          : 'bg-muted/30 border-border/30 opacity-50'
                      : isSelected
                        ? 'bg-primary/20 border-primary shadow-lg'
                        : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5'
                      }`}
                  >
                    <span className="flex-1">
                      {cryptolockerActive && !isAnswered ? <Scrambler>{optionText}</Scrambler> : optionText}
                    </span>

                    {/* Icon status with Flexbox alignment instead of absolute positioning */}
                    {showResult && (isCorrect || isSelected) && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-bold text-white text-sm ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                      >
                        {isCorrect ? '✓' : '✗'}
                      </motion.div>
                    )}
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
        </div>
      </div>

      {/* 3D Image Viewer Portal */}
      <ThreeDImageViewer
        isOpen={is3DViewerOpen}
        onClose={() => setIs3DViewerOpen(false)}
        src={imageUrl}
        alt="Question visualization"
      />
    </>
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
