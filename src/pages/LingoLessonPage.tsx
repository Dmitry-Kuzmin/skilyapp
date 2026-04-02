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
import { useLingoCourse } from '@/hooks/useLingoCourse';

const MAX_HEARTS = 3;
const BASE_XP = 10;
const BONUS_XP = 5;

function ExerciseRenderer({
  exercise,
  onAnswer,
}: {
  exercise: LingoExercise;
  onAnswer: (correct: boolean) => void;
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
  const [direction, setDirection] = useState(1); // slide direction
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Reset on lesson change
    setExerciseIdx(0);
    setHearts(MAX_HEARTS);
    setMistakes(0);
    setDone(false);
    setSaved(false);
  }, [lessonId]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (!correct) {
        const newHearts = Math.max(0, hearts - 1);
        setHearts(newHearts);
        setMistakes((m) => m + 1);
        // If hearts run out, restart from current position (keep progress, lose heart)
        if (newHearts === 0) {
          // Soft reset: restore hearts but keep position
          setTimeout(() => {
            setHearts(MAX_HEARTS);
          }, 600);
        }
      }

      const exercises = found!.lesson.exercises;
      const next = exerciseIdx + 1;
      if (next >= exercises.length) {
        setDone(true);
        return;
      }
      setDirection(1);
      setExerciseIdx(next);
    },
    [exerciseIdx, found, hearts]
  );

  // Save progress once when done
  useEffect(() => {
    if (!done || saved || !lessonId) return;
    setSaved(true);
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const xpEarned = BASE_XP + (mistakes === 0 ? BONUS_XP : 0);
    saveProgress({ lessonId, stars, xpEarned }).catch(() => {});
  }, [done, saved, lessonId, mistakes, saveProgress]);

  if (!found) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Урок не найден.{' '}
        <button onClick={() => navigate('/lingo')} className="ml-2 text-blue-400 underline">
          На карту
        </button>
      </div>
    );
  }

  const { lesson, chapter } = found;
  const exercises = lesson.exercises;

  // Find next lesson for "Continue" button
  const chapterObj = LINGO_CHAPTERS.find((c) => c.id === chapter.id)!;
  const lessonIdxInChapter = chapterObj.lessons.findIndex((l) => l.id === lessonId);
  const nextLesson = chapterObj.lessons[lessonIdxInChapter + 1] ?? null;

  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const xpEarned = BASE_XP + (mistakes === 0 ? BONUS_XP : 0);

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <LessonResultScreen
          xpEarned={xpEarned}
          stars={stars}
          mistakes={mistakes}
          lessonTitle={lesson.title}
          onContinue={
            nextLesson
              ? () => navigate(`/lingo/lesson/${nextLesson.id}`)
              : undefined
          }
        />
      </div>
    );
  }

  const currentExercise = exercises[exerciseIdx];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Progress bar */}
      <LessonProgressBar
        current={exerciseIdx}
        total={exercises.length}
        hearts={hearts}
      />

      {/* Chapter label */}
      <div className="px-4 pb-1">
        <p className="text-xs text-slate-600 text-center">
          {chapter.emoji} {chapter.title} · {lesson.title}
        </p>
      </div>

      {/* Exercise area */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
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

      {/* Exercise type label */}
      <div className="pb-8 text-center">
        <p className="text-slate-800 text-xs">
          {exerciseIdx + 1} / {exercises.length}
        </p>
      </div>
    </div>
  );
}
