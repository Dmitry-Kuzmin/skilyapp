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

const MAX_HEARTS = 3;
const BASE_XP = 10;
const BONUS_XP = 5;

/** Exercise types that skip the bottom sheet (advance immediately) */
const SKIP_SHEET_TYPES = new Set(['flashcard', 'vocab_intro']);

type AnswerResult = {
  correct: boolean;
  correctAnswer?: string;
};

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
          onContinue={
            nextLesson ? () => navigate(`/lingo/lesson/${nextLesson.id}`) : undefined
          }
        />
      </div>
    );
  }

  const currentExercise = exercises[exerciseIdx];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Progress bar */}
      <LessonProgressBar
        current={exerciseIdx}
        total={exercises.length}
        hearts={hearts}
      />

      {/* Chapter label */}
      <div className="px-4 pt-1 pb-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">{chapter.emoji}</span>
          <p className="text-xs text-gray-400 font-medium">
            {chapter.title} · {lesson.title}
          </p>
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
            className="w-full max-w-sm"
          >
            <ExerciseRenderer exercise={currentExercise} onAnswer={handleAnswer} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Exercise counter */}
      <div className="pb-6 text-center">
        <p className="text-gray-300 text-xs font-medium">
          {exerciseIdx + 1} / {exercises.length}
        </p>
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
                  ? 'bg-emerald-50'
                  : 'bg-red-50'
              }`}
            >
              <div className="max-w-sm mx-auto">
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

                <button
                  onClick={advanceToNext}
                  className={`w-full rounded-2xl py-4 font-bold text-white text-base active:scale-[0.97] transition-transform ${
                    pendingResult.correct
                      ? 'bg-emerald-500 shadow-emerald-200 shadow-lg'
                      : 'bg-red-400 shadow-red-200 shadow-lg'
                  }`}
                >
                  Продолжить
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
