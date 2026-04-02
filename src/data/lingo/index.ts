export type { LingoChapter, LingoLesson, LingoExercise, ExerciseType } from './types';
export type {
  FlashcardExercise,
  MultipleChoiceExercise,
  MatchPairsExercise,
  TypeAnswerExercise,
  ContextExercise,
} from './types';

export { chapter1 } from './chapter-1';
export { chapter2 } from './chapter-2';
export { chapter3 } from './chapter-3';
export { chapter4 } from './chapter-4';
export { chapter5 } from './chapter-5';
export { chapter6 } from './chapter-6';

import { chapter1 } from './chapter-1';
import { chapter2 } from './chapter-2';
import { chapter3 } from './chapter-3';
import { chapter4 } from './chapter-4';
import { chapter5 } from './chapter-5';
import { chapter6 } from './chapter-6';

export const LINGO_CHAPTERS = [chapter1, chapter2, chapter3, chapter4, chapter5, chapter6];

export function getLessonById(lessonId: string) {
  for (const chapter of LINGO_CHAPTERS) {
    const lesson = chapter.lessons.find((l) => l.id === lessonId);
    if (lesson) return { lesson, chapter };
  }
  return null;
}

export function getChapterProgress(chapterId: string, completedLessonIds: Set<string>) {
  const chapter = LINGO_CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) return 0;
  const done = chapter.lessons.filter((l) => completedLessonIds.has(l.id)).length;
  return done / chapter.lessons.length;
}

/** Returns the first non-completed lesson id in a chapter, or null if all done */
export function getNextLesson(chapterId: string, completedLessonIds: Set<string>) {
  const chapter = LINGO_CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) return null;
  return chapter.lessons.find((l) => !completedLessonIds.has(l.id)) ?? null;
}

/** A chapter is unlocked if the previous chapter is fully complete (or it's chapter 1) */
export function isChapterUnlocked(chapterId: string, completedLessonIds: Set<string>) {
  const idx = LINGO_CHAPTERS.findIndex((c) => c.id === chapterId);
  if (idx === 0) return true;
  const prev = LINGO_CHAPTERS[idx - 1];
  return prev.lessons.every((l) => completedLessonIds.has(l.id));
}
