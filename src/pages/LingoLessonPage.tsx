import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getLessonById, LINGO_CHAPTERS } from '@/data/lingo';
import type { LingoExercise } from '@/data/lingo/types';
import { LessonProgressBar } from '@/components/lingo/LessonProgressBar';
import { LessonResultScreen } from '@/components/lingo/LessonResultScreen';
import { FlashcardExercise } from '@/components/lingo/exercises/FlashcardExercise';
import { MultipleChoiceExercise } from '@/components/lingo/exercises/MultipleChoiceExercise';
import { MatchPairsExercise } from '@/components/lingo/exercises/MatchPairsExercise';
import { TypeAnswerExercise } from '@/components/lingo/exercises/TypeAnswerExercise';
import { ContextExercise } from '@/components/lingo/exercises/ContextExercise';
import { VocabIntroExercise } from '@/components/lingo/exercises/VocabIntroExercise';
import { WordTilesExercise } from '@/components/lingo/exercises/WordTilesExercise';
import { useLingoCourse } from '@/hooks/useLingoCourse';
import { playSuccessSound } from '@/services/audioService';
import { Brain, Clock3, Route, ShieldCheck, Sparkles } from 'lucide-react';

const MAX_HEARTS = 3;
const BASE_XP = 10;
const BONUS_XP = 5;

/** Exercise types that skip the bottom sheet (advance immediately) */
const SKIP_SHEET_TYPES = new Set(['flashcard', 'vocab_intro']);

type AnswerResult = {
  correct: boolean;
  correctAnswer?: string;
};

const LESSON_PREMIUM_PROMISE = [
  {
    icon: Route,
    title: 'Тема идёт по шагам',
    text: 'Каждое упражнение продолжает предыдущее, поэтому вы не теряете логику и быстрее запоминаете тему.',
  },
  {
    icon: Brain,
    title: 'Понимание формулировок',
    text: 'Фокус на языке экзамена DGT и связях между словами, а не на сухом заучивании перевода.',
  },
  {
    icon: ShieldCheck,
    title: 'Меньше ловушек на экзамене',
    text: 'Вы заранее привыкаете к формулировкам и типичным ошибкам, которые часто стоят баллов на экзамене.',
  },
];

function ExerciseRenderer({
  exercise,
  onAnswer,
}: {
  exercise: LingoExercise;
  onAnswer: (correct: boolean, correctAnswer?: string) => void;
}) {
  switch (exercise.type) {
    case 'flashcard':
      return <FlashcardExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'multiple_choice':
      return <MultipleChoiceExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'match_pairs':
      return <MatchPairsExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'type_answer':
      return <TypeAnswerExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'context':
      return <ContextExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'vocab_intro':
      return <VocabIntroExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'word_tiles':
      return <WordTilesExercise exercise={exercise} onAnswer={onAnswer} />;
    default:
      return null;
  }
}

export default function LingoLessonPage() {
  const { id: lessonId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { saveProgress } = useLingoCourse();

  const found = lessonId ? getLessonById(lessonId) : null;

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);
  const [direction, setDirection] = useState(1);
  const [saved, setSaved] = useState(false);
  const [pendingResult, setPendingResult] = useState<AnswerResult | null>(null);

  useEffect(() => {
    setExerciseIdx(0);
    setHearts(MAX_HEARTS);
    setMistakes(0);
    setDone(false);
    setSaved(false);
    setPendingResult(null);
  }, [lessonId]);

  const advanceToNext = useCallback(() => {
    if (!found) return;
    const exercises = found.lesson.exercises;
    const next = exerciseIdx + 1;
    if (next >= exercises.length) {
      setDone(true);
    } else {
      setDirection(1);
      setExerciseIdx(next);
    }
    setPendingResult(null);
  }, [exerciseIdx, found]);

  const handleAnswer = useCallback(
    (correct: boolean, correctAnswer?: string) => {
      if (!correct) {
        const newHearts = Math.max(0, hearts - 1);
        setHearts(newHearts);
        setMistakes((m) => m + 1);
        if (newHearts === 0) {
          setTimeout(() => setHearts(MAX_HEARTS), 600);
        }
      } else {
        try { playSuccessSound(); } catch {}
      }

      // Types that skip bottom sheet → advance immediately
      const currentType = found?.lesson.exercises[exerciseIdx]?.type;
      if (currentType && SKIP_SHEET_TYPES.has(currentType)) {
        const exercises = found!.lesson.exercises;
        const next = exerciseIdx + 1;
        if (next >= exercises.length) {
          setDone(true);
        } else {
          setDirection(1);
          setExerciseIdx(next);
        }
        return;
      }

      // Show bottom sheet
      setPendingResult({ correct, correctAnswer });
    },
    [exerciseIdx, found, hearts]
  );

  // Save progress once done
  useEffect(() => {
    if (!done || saved || !lessonId) return;
    setSaved(true);
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const xpEarned = BASE_XP + (mistakes === 0 ? BONUS_XP : 0);
    saveProgress({ lessonId, stars, xpEarned }).catch(() => {});
  }, [done, saved, lessonId, mistakes, saveProgress]);

  if (!found) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-500">
        Урок не найден.{' '}
        <button onClick={() => navigate('/lingo')} className="ml-2 text-blue-500 underline">
          На карту
        </button>
      </div>
    );
  }

  const { lesson, chapter } = found;
  const exercises = lesson.exercises;

  const chapterObj = LINGO_CHAPTERS.find((c) => c.id === chapter.id)!;
  const lessonIdxInChapter = chapterObj.lessons.findIndex((l) => l.id === lessonId);
  const nextLesson = chapterObj.lessons[lessonIdxInChapter + 1] ?? null;
  const remainingExercises = exercises.length - exerciseIdx - 1;

  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const xpEarned = BASE_XP + (mistakes === 0 ? BONUS_XP : 0);

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <LessonResultScreen
          xpEarned={xpEarned}
          stars={stars}
          mistakes={mistakes}
          lessonTitle={lesson.title}
          chapterTitle={chapter.title}
          nextLessonTitle={nextLesson?.title ?? null}
          onContinue={
            nextLesson ? () => navigate(`/lingo/lesson/${nextLesson.id}`) : undefined
          }
        />
      </div>
    );
  }

  const currentExercise = exercises[exerciseIdx];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7faf7_0%,#f2f5f1_100%)] flex flex-col relative">
      {/* Progress bar */}
      <LessonProgressBar
        current={exerciseIdx}
        total={exercises.length}
        hearts={hearts}
      />

      <div className="px-4 pt-3 pb-2">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-[28px] border border-black/5 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <Sparkles size={12} className="text-amber-500" />
                  Урок DGT
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-base">{chapter.emoji}</span>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {chapter.title}
                  </p>
                </div>
                <h1 className="mt-2 text-xl font-black leading-6 text-slate-950">{lesson.title}</h1>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  Короткий урок по теме экзамена: разберёте ключевые слова, поймёте смысл формулировок и закрепите их в упражнениях.
                </p>
              </div>

              <div className="grid gap-3 lg:justify-self-end lg:max-w-md">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                  <Clock3 size={15} className="ml-auto mb-1 text-emerald-600" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">8-12 мин</p>
                  <p className="mt-1 text-sm text-emerald-800">На один спокойный учебный подход</p>
                </div>

                <div className="grid gap-2">
                  {LESSON_PREMIUM_PROMISE.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                          <item.icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise area */}
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${lessonId}-${exerciseIdx}`}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-3xl"
          >
            <ExerciseRenderer exercise={currentExercise} onAnswer={handleAnswer} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Exercise counter */}
      <div className="pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 shadow-sm">
          <p className="text-slate-400 text-xs font-medium">
            {exerciseIdx + 1} / {exercises.length}
          </p>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <p className="text-xs font-medium text-slate-500">
            {remainingExercises > 0 ? `осталось ${remainingExercises}` : 'финальный шаг'}
          </p>
        </div>
      </div>

      {/* Bottom feedback sheet */}
      <AnimatePresence>
        {pendingResult !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/10 z-40"
              onClick={advanceToNext}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl ${
                pendingResult.correct
                  ? 'bg-[linear-gradient(180deg,#f3fff8_0%,#ecfdf3_100%)]'
                  : 'bg-[linear-gradient(180deg,#fff7f7_0%,#fef2f2_100%)]'
              }`}
            >
              <div className="mx-auto max-w-3xl">
                {pendingResult.correct ? (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-lg font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-lg text-emerald-700">Точно!</p>
                      <p className="text-emerald-600/70 text-sm">Отличная работа</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-red-400 flex items-center justify-center text-white text-lg font-bold">
                        ✗
                      </div>
                      <p className="font-bold text-lg text-red-600">Не совсем...</p>
                    </div>
                    {pendingResult.correctAnswer && (
                      <p className="text-gray-600 text-sm ml-[52px]">
                        Правильно:{' '}
                        <span className="font-bold text-gray-900">
                          {pendingResult.correctAnswer}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <div className={`mb-4 rounded-2xl border px-4 py-3 text-left ${
                  pendingResult.correct
                    ? 'border-emerald-200 bg-white/80'
                    : 'border-red-200 bg-white/75'
                }`}>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                    pendingResult.correct ? 'text-emerald-700' : 'text-red-500'
                  }`}>
                    {pendingResult.correct ? 'Что это даёт' : 'Что улучшится дальше'}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-gray-600">
                    {pendingResult.correct
                      ? 'Хороший ответ здесь снижает риск ошибки в похожих формулировках на реальном экзамене.'
                      : 'Ошибка сейчас полезнее, чем на экзамене: следующая попытка уже будет строиться на понимании ловушки.'}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={advanceToNext}
                    className={`w-full rounded-2xl py-4 font-bold text-white text-base active:scale-[0.97] transition-transform sm:w-auto sm:min-w-[240px] sm:px-8 ${
                      pendingResult.correct
                        ? 'bg-emerald-500 shadow-emerald-200 shadow-lg'
                        : 'bg-red-400 shadow-red-200 shadow-lg'
                    }`}
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
