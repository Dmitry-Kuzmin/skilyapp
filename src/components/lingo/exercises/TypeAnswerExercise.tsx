import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { TypeAnswerExercise as TypeType } from '@/data/lingo/types';

interface Props {
  exercise: TypeType;
  onAnswer: (correct: boolean, correctAnswer?: string) => void;
}

export function TypeAnswerExercise({ exercise, onAnswer }: Props) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const check = () => {
    if (!value.trim() || status !== 'idle') return;
    const trimmed = value.trim().toLowerCase();
    const correct = trimmed === exercise.correctAnswer.toLowerCase();
    setStatus(correct ? 'correct' : 'wrong');
    onAnswer(correct, exercise.correctAnswer);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') check();
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-gray-500 text-sm font-semibold mb-3">{exercise.prompt}</p>
        <div className="bg-blue-50 rounded-2xl px-6 py-4 inline-block">
          <p className="text-3xl font-bold text-blue-700">{exercise.termEs}</p>
        </div>
      </div>

      <motion.div
        animate={
          status === 'wrong'
            ? { x: [-8, 8, -6, 6, 0] }
            : status === 'correct'
            ? { scale: [1, 1.03, 1] }
            : {}
        }
        transition={{ duration: 0.35 }}
        className="w-full"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={status !== 'idle'}
          placeholder={showHint && exercise.hint ? exercise.hint : 'Введи перевод...'}
          className={[
            'w-full rounded-2xl px-5 py-4 text-center text-lg font-semibold border-2 outline-none transition-colors duration-200',
            status === 'idle' && 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-400',
            status === 'correct' && 'border-emerald-400 bg-emerald-50 text-emerald-700',
            status === 'wrong' && 'border-red-400 bg-red-50 text-red-600',
          ]
            .filter(Boolean)
            .join(' ')}
          autoFocus
        />
      </motion.div>

      <div className="flex gap-3 w-full">
        {exercise.hint && status === 'idle' && !showHint && (
          <button
            onClick={() => setShowHint(true)}
            className="flex-1 rounded-2xl py-3.5 border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Подсказка
          </button>
        )}
        <button
          onClick={check}
          disabled={!value.trim() || status !== 'idle'}
          className={[
            'flex-1 rounded-2xl py-3.5 font-bold text-sm transition-all',
            value.trim() && status === 'idle'
              ? 'bg-blue-500 text-white active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          Проверить
        </button>
      </div>
    </div>
  );
}
