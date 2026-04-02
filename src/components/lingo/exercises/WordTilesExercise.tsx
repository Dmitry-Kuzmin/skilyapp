import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordTilesExercise as WordTilesType } from '@/data/lingo/types';

interface Props {
  exercise: WordTilesType;
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

export function WordTilesExercise({ exercise, onAnswer }: Props) {
  const allWords = useMemo(
    () => shuffle([...exercise.correctWords, ...(exercise.extraWords ?? [])]),
    [exercise]
  );

  const [placed, setPlaced] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const bankWords = allWords.filter((w) => !placed.includes(w));

  const addWord = (word: string) => {
    if (status !== 'idle') return;
    setPlaced((p) => [...p, word]);
  };

  const removeWord = (idx: number) => {
    if (status !== 'idle') return;
    setPlaced((p) => p.filter((_, i) => i !== idx));
  };

  const checkAnswer = () => {
    if (status !== 'idle') return;
    const isCorrect =
      placed.length === exercise.correctWords.length &&
      placed.every((w, i) => w === exercise.correctWords[i]);
    setStatus(isCorrect ? 'correct' : 'wrong');
    onAnswer(isCorrect, exercise.correctWords.join(' '));
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider text-center">
        {exercise.prompt}
      </p>

      {/* Source sentence */}
      <div className="bg-blue-50 rounded-2xl px-5 py-3 text-center">
        <p className="text-blue-700 font-bold text-base">{exercise.sentenceEs}</p>
      </div>

      {/* Answer zone */}
      <motion.div
        animate={status === 'wrong' ? { x: [-6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.35 }}
        className={[
          'min-h-[60px] rounded-2xl border-2 p-3 flex flex-wrap gap-2 items-start transition-colors duration-200',
          status === 'idle' && (placed.length > 0 ? 'border-gray-300 bg-white' : 'border-dashed border-gray-300 bg-gray-50'),
          status === 'correct' && 'border-emerald-400 bg-emerald-50',
          status === 'wrong' && 'border-red-400 bg-red-50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <AnimatePresence mode="popLayout">
          {placed.length === 0 && status === 'idle' && (
            <motion.p
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 text-sm w-full text-center py-2"
            >
              Нажимай на слова ниже
            </motion.p>
          )}
          {placed.map((word, idx) => (
            <motion.button
              key={`placed-${word}-${idx}`}
              layoutId={`tile-${word}`}
              onClick={() => removeWord(idx)}
              disabled={status !== 'idle'}
              className={[
                'rounded-xl px-4 py-2.5 font-bold text-sm border-2 shadow-sm transition-colors',
                status === 'idle' && 'bg-white border-blue-300 text-blue-700 active:bg-blue-50',
                status === 'correct' && 'bg-emerald-100 border-emerald-400 text-emerald-700',
                status === 'wrong' && 'bg-red-100 border-red-400 text-red-600',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
        <AnimatePresence mode="popLayout">
          {bankWords.map((word) => (
            <motion.button
              key={`bank-${word}`}
              layoutId={`tile-${word}`}
              onClick={() => addWord(word)}
              disabled={status !== 'idle'}
              className="rounded-xl px-4 py-2.5 font-bold text-sm bg-white border-2 border-gray-200 text-gray-800 shadow-sm active:bg-gray-50 active:scale-95 transition-transform"
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Check button */}
      {placed.length > 0 && status === 'idle' && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={checkAnswer}
          className="w-full bg-blue-500 text-white font-bold rounded-2xl py-4 text-sm active:scale-95 transition-transform shadow-md"
        >
          Проверить
        </motion.button>
      )}
    </div>
  );
}
