import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlashcardExercise as FlashcardExerciseType } from '@/data/lingo/types';

interface Props {
  exercise: FlashcardExerciseType;
  onAnswer: (correct: boolean, correctAnswer?: string) => void;
}

export function FlashcardExercise({ exercise, onAnswer }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);

  const handleFlip = () => {
    if (!answered) setFlipped(true);
  };

  const handleRate = (knew: boolean) => {
    setAnswered(true);
    onAnswer(knew);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">
        Переверни карточку
      </p>

      {/* Card */}
      <div
        className="relative w-full cursor-pointer"
        style={{ perspective: 1000 }}
        onClick={handleFlip}
      >
        <motion.div
          className="relative w-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className="rounded-3xl border-2 border-gray-200 bg-white shadow-sm p-8 text-center min-h-[200px] flex flex-col justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-4xl font-bold text-gray-900 mb-2">{exercise.termEs}</p>
            {!flipped && (
              <p className="text-gray-400 text-sm mt-4">нажми чтобы увидеть перевод</p>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-3xl border-2 border-emerald-300 bg-emerald-50 shadow-sm p-8 text-center flex flex-col justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-3xl font-bold text-emerald-700 mb-2">{exercise.termRu}</p>
            {exercise.descriptionRu && (
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                {exercise.descriptionRu}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Rating buttons — appear after flip */}
      <AnimatePresence>
        {flipped && !answered && (
          <motion.div
            key="buttons"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-3 w-full"
          >
            <button
              onClick={() => handleRate(false)}
              className="flex-1 rounded-2xl py-4 bg-white border-2 border-red-200 text-red-500 font-bold text-sm active:scale-95 transition-transform"
            >
              Не знал
            </button>
            <button
              onClick={() => handleRate(true)}
              className="flex-1 rounded-2xl py-4 bg-emerald-500 text-white font-bold text-sm active:scale-95 transition-transform"
            >
              Знал! 🎉
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
