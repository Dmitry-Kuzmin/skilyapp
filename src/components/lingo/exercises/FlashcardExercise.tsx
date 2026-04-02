import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import type { FlashcardExercise as FlashcardExerciseType } from '@/data/lingo/types';

interface Props {
  exercise: FlashcardExerciseType;
  onAnswer: (correct: boolean) => void;
}

export function FlashcardExercise({ exercise, onAnswer }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);

  const handleFlip = () => {
    if (!answered) setFlipped(true);
  };

  const handleRate = (knew: boolean) => {
    setAnswered(true);
    setTimeout(() => onAnswer(knew), 400);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
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
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center min-h-[180px] flex flex-col justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-4xl font-bold text-white mb-2">{exercise.termEs}</p>
            {!flipped && (
              <p className="text-slate-500 text-sm mt-4">нажми чтобы увидеть перевод</p>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 backdrop-blur p-8 text-center flex flex-col justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-3xl font-bold text-emerald-300 mb-2">{exercise.termRu}</p>
            {exercise.descriptionRu && (
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
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
            className="flex gap-4 w-full"
          >
            <button
              onClick={() => handleRate(false)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 bg-red-500/20 border border-red-500/40 text-red-300 font-semibold active:scale-95 transition-transform"
            >
              <XCircle size={18} />
              Не знал
            </button>
            <button
              onClick={() => handleRate(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold active:scale-95 transition-transform"
            >
              <CheckCircle size={18} />
              Знал!
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
