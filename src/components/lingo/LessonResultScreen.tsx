import { motion } from 'framer-motion';
import { Star, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  xpEarned: number;
  stars: number;        // 1
  mistakes: number;
  lessonTitle: string;
  onContinue?: () => void;  // go to next lesson if provided
}

export function LessonResultScreen({ xpEarned, stars: _stars, mistakes, lessonTitle, onContinue }: Props) {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center gap-8 h-full px-6 text-center"
    >
      {/* Trophy */}
      <motion.div
        variants={itemVariants}
        className="text-7xl"
      >
        {mistakes === 0 ? '🏆' : mistakes <= 2 ? '⭐' : '✅'}
      </motion.div>

      {/* Title */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <p className="text-slate-400 text-sm font-medium">{lessonTitle}</p>
        <h2 className="text-2xl font-bold text-white">
          {mistakes === 0 ? 'Безупречно!' : mistakes <= 2 ? 'Отлично!' : 'Урок пройден!'}
        </h2>
        {mistakes > 0 && (
          <p className="text-slate-500 text-sm">{mistakes} ошибок — продолжай практиковаться</p>
        )}
      </motion.div>

      {/* Stars row */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <motion.div
            key={n}
            initial={{ scale: 0, rotate: -20 }}
            animate={{
              scale: n === 1 || (n === 2 && mistakes <= 2) || (n === 3 && mistakes === 0) ? 1 : 0.6,
              rotate: 0,
            }}
            transition={{ delay: 0.3 + n * 0.1, type: 'spring', bounce: 0.5 }}
          >
            <Star
              size={36}
              className={
                n === 1 || (n === 2 && mistakes <= 2) || (n === 3 && mistakes === 0)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-slate-700 text-slate-700'
              }
            />
          </motion.div>
        ))}
      </motion.div>

      {/* XP card */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-6 py-4"
      >
        <Zap size={24} className="text-yellow-400" />
        <div className="text-left">
          <p className="text-yellow-300 font-bold text-xl">+{xpEarned} XP</p>
          <p className="text-slate-500 text-xs">добавлено к твоему профилю</p>
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 w-full max-w-sm">
        {onContinue && (
          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-bold rounded-xl py-4 active:scale-95 transition-transform"
          >
            Следующий урок
            <ArrowRight size={18} />
          </button>
        )}
        <button
          onClick={() => navigate('/lingo')}
          className="w-full border border-white/15 text-slate-300 font-semibold rounded-xl py-3.5 active:bg-white/5 transition-colors"
        >
          На карту курса
        </button>
      </motion.div>
    </motion.div>
  );
}
