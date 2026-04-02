import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MultipleChoiceExercise as MCType } from '@/data/lingo/types';

interface Props {
  exercise: MCType;
  onAnswer: (correct: boolean) => void;
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
    setTimeout(() => onAnswer(correct), 900);
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
        <p className="text-center text-slate-500 text-sm font-medium">
          {exercise.termEs}
        </p>
      )}
      <p className="text-center text-xl font-bold text-white leading-snug">
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
                'w-full text-left rounded-xl px-5 py-4 border font-medium transition-colors duration-200',
                v === 'idle' && 'border-white/15 bg-white/5 text-white active:bg-white/10',
                v === 'correct' && 'border-emerald-500 bg-emerald-500/20 text-emerald-300',
                v === 'wrong' && 'border-red-500 bg-red-500/20 text-red-300',
                v === 'dimmed' && 'border-white/5 bg-white/2 text-slate-600',
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
