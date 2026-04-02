import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ContextExercise as ContextType } from '@/data/lingo/types';

interface Props {
  exercise: ContextType;
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

export function ContextExercise({ exercise, onAnswer }: Props) {
  const shuffled = useMemo(() => shuffle(exercise.options), [exercise]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    const correct = option === exercise.correctAnswer;
    setTimeout(() => onAnswer(correct), 900);
  };

  // Replace ___ in sentence with chosen answer or placeholder
  const renderSentence = () => {
    const parts = exercise.sentence.split('___');
    if (parts.length !== 2) return exercise.sentence;
    return (
      <>
        {parts[0]}
        {selected ? (
          <span
            className={
              selected === exercise.correctAnswer
                ? 'text-emerald-400 font-bold border-b-2 border-emerald-400'
                : 'text-red-400 font-bold border-b-2 border-red-400'
            }
          >
            {selected}
          </span>
        ) : (
          <span className="inline-block w-24 border-b-2 border-slate-500 align-bottom" />
        )}
        {parts[1]}
      </>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <p className="text-slate-400 text-sm font-medium uppercase tracking-wider text-center">
        Выбери правильный термин
      </p>

      {/* Sentence card */}
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-white text-lg leading-relaxed font-medium">{renderSentence()}</p>
        {exercise.sentenceEs && (
          <p className="text-slate-600 text-xs mt-3 italic">{exercise.sentenceEs}</p>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 w-full">
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
                'w-full rounded-xl px-5 py-3.5 border font-semibold text-sm transition-colors duration-200',
                variant === 'idle' && 'border-white/15 bg-white/5 text-white active:bg-white/10',
                variant === 'correct' && 'border-emerald-500 bg-emerald-500/20 text-emerald-300',
                variant === 'wrong' && 'border-red-500 bg-red-500/20 text-red-300',
                variant === 'dimmed' && 'border-white/5 bg-transparent text-slate-600',
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
