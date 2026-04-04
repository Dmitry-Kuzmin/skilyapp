import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, ArrowRight, Brain, ShieldCheck, Sparkles, Route, Clock3, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { playCelebrationSound, playSuccessSound } from '@/services/audioService';

interface Props {
  xpEarned: number;
  stars: number;
  mistakes: number;
  lessonTitle: string;
  chapterTitle?: string;
  nextLessonTitle?: string | null;
  onContinue?: () => void;
}

const NEXT_STEP_COPY = [
  {
    icon: Route,
    title: 'Вы уже знаете, что делать дальше',
    text: 'После этого урока можно сразу перейти к следующей теме и не терять ритм обучения.',
  },
  {
    icon: Brain,
    title: 'Слова запоминаются лучше',
    text: 'Короткий урок лучше удерживается в памяти, когда вы видите, что именно уже получилось понять.',
  },
  {
    icon: ShieldCheck,
    title: 'Ошибок на экзамене станет меньше',
    text: 'Каждый завершённый урок делает формулировки DGT знакомее и снижает риск запутаться на экзамене.',
  },
];

export function LessonResultScreen({
  xpEarned,
  mistakes,
  lessonTitle,
  chapterTitle,
  nextLessonTitle,
  onContinue,
}: Props) {
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

  const masteryCopy =
    mistakes === 0
      ? 'Вы прошли урок очень уверенно: быстро, точно и без ошибок.'
      : mistakes <= 2
      ? 'Тема уже понятна. Осталось только закрепить пару слабых мест до автоматизма.'
      : 'Основа уже есть. Повторение поможет превратить её в уверенный навык для экзамена.';

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
        className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7faf8_100%)] px-6 py-8"
      >
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="flex flex-col items-center gap-7 text-center lg:sticky lg:top-8">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 shadow-sm"
            >
              <Sparkles size={12} className="text-amber-500" />
              Урок завершён
            </motion.div>

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

            <motion.div variants={itemVariants} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                {chapterTitle && <span>{chapterTitle}</span>}
                {chapterTitle && <span className="h-1 w-1 rounded-full bg-gray-300" />}
                <span>{lessonTitle}</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                {mistakes === 0 ? 'Безупречно!' : mistakes <= 2 ? 'Отлично!' : 'Урок пройден!'}
              </h2>
              <p className="mx-auto max-w-md text-sm leading-6 text-gray-600">{masteryCopy}</p>
              {mistakes > 0 && (
                <p className="text-gray-400 text-sm">{mistakes} ошибок, но урок уже закреплён в памяти</p>
              )}
            </motion.div>

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

            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 rounded-2xl border-2 border-yellow-200 bg-yellow-50 px-6 py-4"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <Zap size={24} className="text-yellow-500" />
              </motion.div>
              <div className="text-left">
                <p className="text-xl font-bold text-yellow-600">+{xpEarned} XP</p>
                <p className="text-xs text-gray-400">добавлено к вашему прогрессу</p>
              </div>
            </motion.div>
          </div>

          <div className="grid gap-3">
            <motion.div
              variants={itemVariants}
              className="grid gap-3 sm:grid-cols-3"
            >
          <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={16} />
              <p className="text-xs font-bold uppercase tracking-[0.16em]">Что вы закрепили</p>
            </div>
            <p className="mt-2 text-sm leading-5 text-gray-600">
              Вы укрепили понимание формулировок, а не просто запомнили перевод отдельных слов.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white px-4 py-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-sky-700">
              <Brain size={16} />
              <p className="text-xs font-bold uppercase tracking-[0.16em]">Что станет легче</p>
            </div>
            <p className="mt-2 text-sm leading-5 text-gray-600">
              Следующий урок пойдёт легче, потому что базовые термины уже начали связываться в дорожные ситуации.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white px-4 py-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-amber-700">
              <Trophy size={16} />
              <p className="text-xs font-bold uppercase tracking-[0.16em]">Ваш результат</p>
            </div>
            <p className="mt-2 text-sm leading-5 text-gray-600">
              Ещё один урок закрыт. Это значит, что вы двигаетесь к экзамену не хаотично, а по понятному маршруту.
            </p>
          </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid gap-3">
              {NEXT_STEP_COPY.map((item) => (
                <div key={item.title} className="rounded-2xl border border-black/5 bg-white/85 px-4 py-4 text-left shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <item.icon size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-5 text-gray-600">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col gap-3">
              {onContinue && (
                <div className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Следующий шаг</p>
                        <p className="mt-1 text-sm font-black text-slate-900">{nextLessonTitle ?? 'Следующий урок'}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                        <Clock3 size={15} className="ml-auto mb-1 text-emerald-600" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">10 мин</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onContinue}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-95 sm:w-auto sm:min-w-[260px] sm:px-8"
                  >
                    Следующий урок
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
              <button
                onClick={() => navigate('/lingo')}
                className="w-full rounded-2xl border-2 border-gray-200 py-3.5 font-semibold text-gray-600 transition-colors active:bg-gray-50 sm:w-auto sm:min-w-[220px] sm:px-6"
              >
                На карту курса
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
