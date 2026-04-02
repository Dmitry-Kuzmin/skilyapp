// ─────────────────────────────────────────────
//  Skily Lingo — shared data types
// ─────────────────────────────────────────────

export type ExerciseType =
  | 'flashcard'
  | 'multiple_choice'
  | 'match_pairs'
  | 'type_answer'
  | 'context'
  | 'vocab_intro'
  | 'word_tiles';

// ---------- individual exercise shapes ----------

export interface FlashcardExercise {
  type: 'flashcard';
  termEs: string;
  termRu: string;
  descriptionRu?: string;
}

export interface MultipleChoiceExercise {
  type: 'multiple_choice';
  question: string;        // e.g. "Что означает «Glorieta»?"
  correctAnswer: string;   // RU answer
  options: string[];       // 4 options including correct (shuffle on render)
  termEs?: string;         // optional small label below question
}

export interface MatchPairsExercise {
  type: 'match_pairs';
  pairs: Array<{ es: string; ru: string }>;  // exactly 4 pairs
}

export interface TypeAnswerExercise {
  type: 'type_answer';
  prompt: string;          // e.g. "Escribe en ruso:"
  termEs: string;          // the word to translate
  correctAnswer: string;   // expected RU text (lowercase compare)
  hint?: string;           // first letter hint, e.g. "Т..."
}

export interface ContextExercise {
  type: 'context';
  sentence: string;        // RU sentence with ___ blank
  sentenceEs?: string;     // optional ES original (shown as subtitle)
  options: string[];       // 3 ES options
  correctAnswer: string;   // the correct ES term
}

export interface VocabIntroExercise {
  type: 'vocab_intro';
  termEs: string;
  termRu: string;
  descriptionRu?: string;
  exampleEs?: string;
  exampleRu?: string;
}

export interface WordTilesExercise {
  type: 'word_tiles';
  prompt: string;
  sentenceEs: string;
  correctWords: string[];
  extraWords?: string[];
}

export type LingoExercise =
  | FlashcardExercise
  | MultipleChoiceExercise
  | MatchPairsExercise
  | TypeAnswerExercise
  | ContextExercise
  | VocabIntroExercise
  | WordTilesExercise;

// ---------- lesson & chapter ----------

export interface LingoLesson {
  id: string;              // e.g. "ch1-l1"
  title: string;           // "Типы дорог"
  emoji?: string;
  exercises: LingoExercise[];
}

export interface LingoChapter {
  id: string;              // e.g. "ch1"
  title: string;           // "Дорога и разметка"
  emoji: string;
  color: {
    bg: string;            // Tailwind class
    border: string;
    text: string;
    accent: string;        // button/active color
  };
  lessons: LingoLesson[];
}
