import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ContextExercise as ContextType } from '@/data/lingo/types';
import { ExerciseInsights } from './ExerciseInsights';

interface Props {
  exercise: ContextType;
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

export function ContextExercise({ exercise, onAnswer }: Props) {
  const shuffled = useMemo(() => shuffle(exercise.options), [exercise]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    const correct = option === exercise.correctAnswer;
    onAnswer(correct, exercise.correctAnswer);
  };

  const renderSentence = () => {
    const parts = exercise.sentence.split('___');
    if (parts.length !== 2) return <>{exercise.sentence}</>;
    return (
      <>
        {parts[0]}
        {selected ? (
          <span
            className={
              selected === exercise.correctAnswer
                ? 'text-emerald-600 font-bold border-b-2 border-emerald-400'
                : 'text-red-500 font-bold border-b-2 border-red-400'
            }
          >
            {selected}
          </span>
        ) : (
          <span className="inline-block w-24 border-b-2 border-gray-400 align-bottom" />
        )}
        {parts[1]}
      </>
    );
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider text-center">
        Выбери правильный термин
      </p>

      {/* Sentence card */}
      <div className="w-full rounded-3xl border-2 border-gray-200 bg-white shadow-sm p-6 text-center">
        <p className="text-gray-900 text-lg leading-relaxed font-medium">{renderSentence()}</p>
        {exercise.sentenceEs && (
          <p className="text-gray-400 text-xs mt-3 italic">{exercise.sentenceEs}</p>
        )}
        <ExerciseInsights insights={exercise.insights} />
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5 w-full">
        {shuffled.map((option, i) => {
          let variant = 'idle';
          if (selected) {
            if (option === exercise.correctAnswer) variant = 'correct';
            else if (option === selected) variant = 'wrong';
            else variant = 'dimmed';
          }
          return (
            <motion.button
              key={option}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => handleSelect(option)}
              className={[
                'w-full rounded-2xl px-5 py-4 border-2 font-bold text-sm transition-colors duration-150',
                variant === 'idle' && 'border-gray-200 bg-white text-gray-800 active:bg-gray-50',
                variant === 'correct' && 'border-emerald-400 bg-emerald-50 text-emerald-700',
                variant === 'wrong' && 'border-red-400 bg-red-50 text-red-600',
                variant === 'dimmed' && 'border-gray-100 bg-gray-50 text-gray-400',
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
