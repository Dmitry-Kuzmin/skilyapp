import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { playCelebrationSound, playSuccessSound } from '@/services/audioService';

interface Props {
  xpEarned: number;
  stars: number;
  mistakes: number;
  lessonTitle: string;
  onContinue?: () => void;
}

export function LessonResultScreen({ xpEarned, mistakes, lessonTitle, onContinue }: Props) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    try {
      if (mistakes === 0) {
        playCelebrationSound();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      } else {
        playSuccessSound();
      }
    } catch {}
  }, [mistakes]);

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } },
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.25}
          colors={['#10b981', '#fbbf24', '#3b82f6', '#f97316', '#8b5cf6']}
        />
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center justify-center gap-8 h-full px-6 text-center bg-white"
      >
        {/* Trophy */}
        <motion.div
          variants={itemVariants}
          className="text-7xl"
        >
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
            className="inline-block"
          >
            {mistakes === 0 ? '🏆' : mistakes <= 2 ? '⭐' : '✅'}
          </motion.span>
        </motion.div>

        {/* Title */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <p className="text-gray-500 text-sm font-medium">{lessonTitle}</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {mistakes === 0 ? 'Безупречно!' : mistakes <= 2 ? 'Отлично!' : 'Урок пройден!'}
          </h2>
          {mistakes > 0 && (
            <p className="text-gray-400 text-sm">{mistakes} ошибок — продолжай практиковаться</p>
          )}
        </motion.div>

        {/* Stars row */}
        <motion.div variants={itemVariants} className="flex gap-3">
          {[1, 2, 3].map((n) => {
            const earned = n === 1 || (n === 2 && mistakes <= 2) || (n === 3 && mistakes === 0);
            return (
              <motion.div
                key={n}
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: earned ? 1 : 0.6, rotate: 0 }}
                transition={{ delay: 0.4 + n * 0.15, type: 'spring', bounce: 0.6, stiffness: 300 }}
              >
                <Star
                  size={42}
                  className={earned ? 'fill-yellow-400 text-yellow-400 drop-shadow-md' : 'fill-gray-200 text-gray-200'}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* XP card */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 bg-yellow-50 border-2 border-yellow-200 rounded-2xl px-6 py-4"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <Zap size={24} className="text-yellow-500" />
          </motion.div>
          <div className="text-left">
            <p className="text-yellow-600 font-bold text-xl">+{xpEarned} XP</p>
            <p className="text-gray-400 text-xs">добавлено к твоему профилю</p>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3 w-full max-w-sm">
          {onContinue && (
            <button
              onClick={onContinue}
              className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-bold rounded-2xl py-4 active:scale-95 transition-transform shadow-lg shadow-emerald-200"
            >
              Следующий урок
              <ArrowRight size={18} />
            </button>
          )}
          <button
            onClick={() => navigate('/lingo')}
            className="w-full border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl py-3.5 active:bg-gray-50 transition-colors"
          >
            На карту курса
          </button>
        </motion.div>
      </motion.div>
    </>
  );
}
