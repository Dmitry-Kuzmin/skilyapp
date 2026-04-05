export type Language = "ru" | "es";
export type Difficulty = "easy" | "medium" | "hard";

export interface AnswerOption {
  id: string;
  text: string;
  is_correct: boolean;
  position: number;
}

export interface VideoQuestion {
  id: string;
  question: string;
  explanation: string;
  image_url: string | null;
  difficulty: Difficulty;
  percent_correct: number;
  topic: string;
  answer_options: AnswerOption[];
  country: string;
  language: Language;
  // Derived
  hook_title: string;
  series_number: number;

  // ── ElevenLabs TTS (generated before render, paths relative to public/) ──
  questionAudioFile?: string;
  questionAudioDurationSec?: number;

  answerAudioFiles?: string[];          // one per answer_option in order
  answerAudioDurationsSec?: number[];   // duration of each answer audio

  explanationAudioFile?: string;
  explanationAudioDurationSec?: number;

  // Russian explanation (for dual-language workflow)
  explanationRu?: string;
  explanationRuAudioFile?: string;
  explanationRuAudioDurationSec?: number;
}

// ── Dynamic timing (computed from audio durations) ───────────────────────────
export interface DynamicTiming {
  hookStart:        number;   // seconds
  countdownStart:   number;
  questionStart:    number;
  answersStart:     number;
  answerAppearAt:   number[]; // absolute seconds when each answer card appears
  suspenseStart:    number;
  revealStart:      number;
  explanationStart: number;
  ctaStart:         number;
  totalSec:         number;
}

const HOOK_DUR        = 2;
const COUNTDOWN_DUR   = 3;
const SUSPENSE_DUR    = 6;
const REVEAL_DUR      = 3;
const CTA_DUR         = 3;
const ANSWER_GAP      = 0.35; // seconds between answers

export function buildDynamicTiming(q: VideoQuestion): DynamicTiming {
  // Question window: at least 5s or however long the TTS takes
  const qAudioDur   = q.questionAudioDurationSec ?? 5;
  const questionDur = Math.max(5, qAudioDur + 0.5);

  const hookStart      = 0;
  const countdownStart = HOOK_DUR;
  const questionStart  = HOOK_DUR + COUNTDOWN_DUR;
  const answersStart   = questionStart + questionDur;

  // Answers: each card appears when it's that answer's turn to be read
  const answerDurs = q.answerAudioDurationsSec ?? [];
  const answerAppearAt: number[] = [];
  let cursor = answersStart;
  const count = q.answer_options?.length ?? 0;
  for (let i = 0; i < count; i++) {
    answerAppearAt.push(cursor);
    cursor += (answerDurs[i] ?? 2.5) + ANSWER_GAP;
  }
  const answersEnd = cursor;

  const suspenseStart    = answersEnd;
  const revealStart      = suspenseStart + SUSPENSE_DUR;
  const explanationStart = revealStart + REVEAL_DUR;

  // Explanation: at least 6s or however long the audio is
  const expAudioDur   = (q.explanationRuAudioFile
    ? (q.explanationRuAudioDurationSec ?? 8)
    : (q.explanationAudioDurationSec   ?? 8));
  const explanationDur = Math.max(6, expAudioDur + 1);

  const ctaStart = explanationStart + explanationDur;
  const totalSec = ctaStart + CTA_DUR;

  return {
    hookStart, countdownStart, questionStart, answersStart,
    answerAppearAt, suspenseStart, revealStart, explanationStart,
    ctaStart, totalSec,
  };
}

// ── Brand colors ─────────────────────────────────────────────────────────────
export const BRAND = {
  bg: "#0f0f1a",
  bgCard: "#1a1a2e",
  primary: "#7c3aed",
  primaryLight: "#a855f7",
  primaryGlow: "#7c3aed33",
  accent: "#06b6d4",
  gold: "#f59e0b",
  green: "#10b981",
  red: "#ef4444",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  border: "#334155",
  gradient: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
} as const;

export const HOOK_TEMPLATES = {
  ru: {
    very_hard: "Это не знает НИКТО 🤯",
    hard:      "99% водителей ошибаются ❌",
    medium:    "Только опытные знают ответ 🚗",
    easy:      "Проверь себя за 5 секунд ⚡",
  },
  es: {
    very_hard: "¡NADIE sabe la respuesta! 🤯",
    hard:      "El 99% de conductores falla ❌",
    medium:    "Solo los expertos lo saben 🚗",
    easy:      "¿Sabes la respuesta? ⚡",
  },
} as const;

export const UI_TEXT = {
  ru: {
    think:       "ДУМАЙТЕ!",
    correct:     "ПРАВИЛЬНО!",
    wrong:       "НЕВЕРНО",
    cta:         "Ещё вопросы → skilyapp.com",
    subscribe:   "Подпишись 👇",
    explanation: "Объяснение:",
    examBadge:   "🚗 ЭКЗАМЕН ПДД",
    examSub:     "Знаешь правила?",
  },
  es: {
    think:       "¡PIENSA!",
    correct:     "¡CORRECTO!",
    wrong:       "INCORRECTO",
    cta:         "Más preguntas → skilyapp.com",
    subscribe:   "Suscríbete 👇",
    explanation: "Explicación:",
    examBadge:   "🚗 EXAMEN DGT",
    examSub:     "¿Conoces las normas?",
  },
} as const;

export const FPS = 30;
// Legacy — used as fallback only; actual duration set via calculateMetadata
export const DURATION_SECS  = 40;
export const TOTAL_FRAMES   = FPS * DURATION_SECS;
