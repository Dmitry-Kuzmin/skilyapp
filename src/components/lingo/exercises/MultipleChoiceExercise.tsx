import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MultipleChoiceExercise as MCType } from '@/data/lingo/types';

interface Props {
  exercise: MCType;
  onAnswer: (correct: boolean, correctAnswer?: string) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MultipleChoiceExercise({ exercise, onAnswer }: Props) {
  const shuffled = useMemo(() => shuffle(exercise.options), [exercise]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    const correct = option === exercise.correctAnswer;
    onAnswer(correct, exercise.correctAnswer);
  };

  const getVariant = (option: string) => {
    if (!selected) return 'idle';
    if (option === exercise.correctAnswer) return 'correct';
    if (option === selected) return 'wrong';
    return 'dimmed';
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-sm mx-auto">
      {exercise.termEs && (
        <div className="bg-blue-50 rounded-2xl px-5 py-3 text-center">
          <p className="text-blue-600 font-bold text-lg">{exercise.termEs}</p>
        </div>
      )}
      <p className="text-center text-xl font-bold text-gray-900 leading-snug px-2">
        {exercise.question}
      </p>

      <div className="flex flex-col gap-3 mt-1">
        {shuffled.map((option, i) => {
          const v = getVariant(option);
          return (
            <motion.button
              key={option}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleSelect(option)}
              className={[
                'w-full text-left rounded-2xl px-5 py-4 border-2 font-semibold transition-colors duration-150 text-sm',
                v === 'idle' && 'border-gray-200 bg-white text-gray-800 active:bg-gray-50',
                v === 'correct' && 'border-emerald-400 bg-emerald-50 text-emerald-700',
                v === 'wrong' && 'border-red-400 bg-red-50 text-red-600',
                v === 'dimmed' && 'border-gray-100 bg-gray-50 text-gray-400',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
