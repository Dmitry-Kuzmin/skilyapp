import { ThreeDImageViewer } from "@/components/ui/ThreeDImageViewer";
import { useState } from "react";
// ... existing imports ...

// ... inside component ...
const [is3DViewerOpen, setIs3DViewerOpen] = useState(false);

// Контент карточки
const hasImage = !!(question.question_snapshot.image_url && getImageUrl(question.question_snapshot.image_url));
const imageUrl = hasImage ? getImageUrl(question.question_snapshot.image_url) || '' : '';

const cardContent = (
  <>
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-3xl p-4 md:p-6 lg:p-8 shadow-2xl flex-1 flex flex-col overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

      <div className={`flex flex-col md:flex-row gap-6 md:gap-10 h-full ${!hasImage ? 'justify-center' : ''}`}>

        {/* Left Column: Media (Image) - Only if image exists */}
        {hasImage && (
          <div className="md:w-1/2 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="relative rounded-3xl overflow-hidden bg-black/50 aspect-video md:aspect-auto md:h-full max-h-[50vh] md:max-h-[600px] w-full flex items-center justify-center group cursor-zoom-in shadow-2xl border border-white/5"
              onClick={() => setIs3DViewerOpen(true)}
            >
              {/* Blur Background */}
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 group-hover:scale-125 transition-transform duration-700"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />

              {/* Main Image */}
              <img
                src={imageUrl}
                alt="Question media"
                className="relative z-10 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 will-change-transform"
              />

              {/* Expand Overlay Hint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-full text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-maximize-2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Right Column: Question & Options */}
        <div className={`flex flex-col justify-center ${hasImage ? 'md:w-1/2' : 'w-full max-w-3xl mx-auto'}`}>
          {/* Question Text - More breathing room */}
          <h2 className={`text-xl md:text-2xl lg:text-3xl font-bold mb-8 leading-relaxed text-foreground break-words ${!hasImage ? 'text-center' : ''}`}>
            {cryptolockerActive && !isAnswered ? <Scrambler>{questionText}</Scrambler> : questionText}
          </h2>

          {/* Answer Options */}
          <div className="grid gap-4 w-full">
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
                  className={`p-5 rounded-2xl border-2 text-left transition-all font-semibold text-base md:text-lg leading-snug relative overflow-hidden min-h-[72px] w-full select-none ${showResult
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
                  {showResult && (isCorrect || isSelected) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute top-1/2 -translate-y-1/2 right-4 w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-sm ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {isCorrect ? '✓' : '✗'}
                    </motion.div>
                  )}
                  <span className={`block ${showResult ? 'pr-10' : ''}`}>
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


// Force Update Sat Jan 24 10:49:32 CET 2026
