import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MatchPairsExercise as MatchType } from '@/data/lingo/types';

interface Props {
  exercise: MatchType;
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

export function MatchPairsExercise({ exercise, onAnswer }: Props) {
  const leftItems = useMemo(() => shuffle(exercise.pairs.map((p) => p.es)), [exercise]);
  const rightItems = useMemo(() => shuffle(exercise.pairs.map((p) => p.ru)), [exercise]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Map<string, string>>(new Map());
  const [wrongPair, setWrongPair] = useState<{ es: string; ru: string } | null>(null);

  const pairMap = useMemo(
    () => new Map(exercise.pairs.map((p) => [p.es, p.ru])),
    [exercise]
  );
  const matchedEs = new Set(matched.keys());
  const matchedRu = new Set(matched.values());

  const handleLeft = (es: string) => {
    if (matchedEs.has(es)) return;
    setWrongPair(null);
    setSelectedLeft(es);
  };

  const handleRight = (ru: string) => {
    if (!selectedLeft) return;
    if (matchedRu.has(ru)) return;

    const correct = pairMap.get(selectedLeft) === ru;
    if (correct) {
      const next = new Map(matched);
      next.set(selectedLeft, ru);
      setMatched(next);
      setSelectedLeft(null);
      if (next.size === exercise.pairs.length) {
        setTimeout(() => onAnswer(true), 300);
      }
    } else {
      setWrongPair({ es: selectedLeft, ru });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
      }, 600);
    }
  };

  const allDone = matched.size === exercise.pairs.length;

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      <p className="text-center text-gray-500 text-sm font-semibold uppercase tracking-wider">
        Соедини пары
      </p>

      <div className="grid grid-cols-2 gap-2">
        {/* Left column — ES */}
        <div className="flex flex-col gap-2">
          {leftItems.map((es) => {
            const isMatched = matchedEs.has(es);
            const isSelected = selectedLeft === es;
            const isWrong = wrongPair?.es === es;
            return (
              <motion.button
                key={es}
                onClick={() => handleLeft(es)}
                animate={isWrong ? { x: [-6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={[
                  'rounded-2xl px-3 py-4 text-sm font-bold border-2 text-center transition-colors duration-150 min-h-[56px] flex items-center justify-center',
                  isMatched && 'border-emerald-300 bg-emerald-50 text-emerald-600',
                  isSelected && !isMatched && 'border-blue-400 bg-blue-50 text-blue-700',
                  isWrong && 'border-red-400 bg-red-50 text-red-600',
                  !isMatched && !isSelected && !isWrong && 'border-gray-200 bg-white text-gray-800 active:bg-gray-50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {es}
              </motion.button>
            );
          })}
        </div>

        {/* Right column — RU */}
        <div className="flex flex-col gap-2">
          {rightItems.map((ru) => {
            const isMatched = matchedRu.has(ru);
            const isWrong = wrongPair?.ru === ru;
            return (
              <motion.button
                key={ru}
                onClick={() => handleRight(ru)}
                animate={isWrong ? { x: [-6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={[
                  'rounded-2xl px-3 py-4 text-sm font-bold border-2 text-center transition-colors duration-150 min-h-[56px] flex items-center justify-center',
                  isMatched && 'border-emerald-300 bg-emerald-50 text-emerald-600',
                  isWrong && 'border-red-400 bg-red-50 text-red-600',
                  !isMatched && !isWrong && 'border-gray-200 bg-white text-gray-800 active:bg-gray-50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {ru}
              </motion.button>
            );
          })}
        </div>
      </div>

      {allDone && (
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-emerald-600 font-bold text-base"
        >
          Все пары найдены! 🎉
        </motion.p>
      )}
    </div>
  );
}
