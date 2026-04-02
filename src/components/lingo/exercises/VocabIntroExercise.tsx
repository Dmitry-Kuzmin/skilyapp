import { motion } from 'framer-motion';
import type { VocabIntroExercise as VocabType } from '@/data/lingo/types';

interface Props {
  exercise: VocabType;
  onAnswer: (correct: boolean, correctAnswer?: string) => void;
}

export function VocabIntroExercise({ exercise, onAnswer }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto"
    >
      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">
        Новое слово
      </p>

      {/* Main card */}
      <div className="w-full rounded-3xl border-2 border-blue-200 bg-white shadow-md overflow-hidden">
        {/* Blue accent header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-center">
          <p className="text-white/70 text-xs font-medium mb-1">Испанский</p>
          <p className="text-white text-3xl font-bold">{exercise.termEs}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 text-center">
          <p className="text-gray-900 text-xl font-bold mb-1">{exercise.termRu}</p>
          {exercise.descriptionRu && (
            <p className="text-gray-500 text-sm leading-relaxed mt-2">
              {exercise.descriptionRu}
            </p>
          )}

          {/* Example sentence */}
          {exercise.exampleEs && (
            <div className="mt-4 bg-blue-50 rounded-2xl px-4 py-3 text-left">
              <p className="text-blue-700 text-sm font-medium italic">
                "{exercise.exampleEs}"
              </p>
              {exercise.exampleRu && (
                <p className="text-gray-500 text-xs mt-1">
                  {exercise.exampleRu}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={() => onAnswer(true)}
        className="w-full bg-blue-500 text-white font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform shadow-md"
      >
        Понятно! Дальше →
      </button>
    </motion.div>
  );
}
