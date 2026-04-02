import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { TypeAnswerExercise as TypeType } from '@/data/lingo/types';

interface Props {
  exercise: TypeType;
  onAnswer: (correct: boolean) => void;
}

export function TypeAnswerExercise({ exercise, onAnswer }: Props) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const check = () => {
    const trimmed = value.trim().toLowerCase();
    const correct = trimmed === exercise.correctAnswer.toLowerCase();
    setStatus(correct ? 'correct' : 'wrong');
    setTimeout(() => onAnswer(correct), 900);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) check();
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-slate-400 text-sm font-medium mb-2">{exercise.prompt}</p>
        <p className="text-3xl font-bold text-white">{exercise.termEs}</p>
      </div>

      <motion.div
        animate={
          status === 'wrong'
            ? { x: [-8, 8, -6, 6, 0] }
            : status === 'correct'
            ? { scale: [1, 1.04, 1] }
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
          placeholder={showHint ? exercise.hint ?? 'Введи перевод...' : 'Введи перевод...'}
          className={[
            'w-full rounded-xl px-5 py-4 text-center text-lg font-semibold border bg-transparent outline-none transition-colors duration-200',
            status === 'idle' && 'border-white/20 text-white placeholder:text-slate-600 focus:border-blue-400',
            status === 'correct' && 'border-emerald-500 text-emerald-300 bg-emerald-500/10',
            status === 'wrong' && 'border-red-500 text-red-300 bg-red-500/10',
          ]
            .filter(Boolean)
            .join(' ')}
          autoFocus
        />
      </motion.div>

      {status === 'wrong' && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-slate-400 text-sm text-center"
        >
          Правильный ответ:{' '}
          <span className="text-emerald-400 font-semibold">{exercise.correctAnswer}</span>
        </motion.p>
      )}

      <div className="flex gap-3 w-full">
        {exercise.hint && status === 'idle' && !showHint && (
          <button
            onClick={() => setShowHint(true)}
            className="flex-1 rounded-xl py-3 border border-white/10 text-slate-500 text-sm hover:border-white/20 transition-colors"
          >
            Подсказка
          </button>
        )}
        <button
          onClick={check}
          disabled={!value.trim() || status !== 'idle'}
          className={[
            'flex-1 rounded-xl py-3 font-semibold text-sm transition-all',
            value.trim() && status === 'idle'
              ? 'bg-blue-500 text-white active:scale-95'
              : 'bg-white/5 text-slate-600 cursor-not-allowed',
          ].join(' ')}
        >
          Проверить
        </button>
      </div>
    </div>
  );
}
