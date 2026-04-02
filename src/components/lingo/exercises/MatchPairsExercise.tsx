import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import type { MatchPairsExercise as MatchType } from '@/data/lingo/types';

interface Props {
  exercise: MatchType;
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

export function MatchPairsExercise({ exercise, onAnswer }: Props) {
  const leftItems = useMemo(() => shuffle(exercise.pairs.map((p) => p.es)), [exercise]);
  const rightItems = useMemo(() => shuffle(exercise.pairs.map((p) => p.ru)), [exercise]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Map<string, string>>(new Map()); // es → ru
  const [wrongPair, setWrongPair] = useState<{ es: string; ru: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);

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
        // All matched
        setTimeout(() => onAnswer(mistakes === 0), 500);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongPair({ es: selectedLeft, ru });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
      }, 700);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      <p className="text-center text-slate-400 text-sm font-medium uppercase tracking-wider">
        Соедини пары
      </p>
      {matched.size === exercise.pairs.length && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center gap-2 text-emerald-400 font-semibold"
        >
          <CheckCircle size={20} />
          Все пары найдены!
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
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
                  'rounded-xl px-3 py-3 text-sm font-semibold border text-left transition-colors duration-150',
                  isMatched && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 opacity-60',
                  isSelected && !isMatched && 'border-blue-400 bg-blue-500/20 text-blue-300',
                  isWrong && 'border-red-500 bg-red-500/20 text-red-300',
                  !isMatched && !isSelected && !isWrong && 'border-white/15 bg-white/5 text-white',
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
                  'rounded-xl px-3 py-3 text-sm font-semibold border text-left transition-colors duration-150',
                  isMatched && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 opacity-60',
                  isWrong && 'border-red-500 bg-red-500/20 text-red-300',
                  !isMatched && !isWrong && 'border-white/15 bg-white/5 text-white',
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
    </div>
  );
}
