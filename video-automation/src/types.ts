export type Language = "ru" | "es";
export type Difficulty = "easy" | "medium" | "hard";

export interface AnswerOption {
  id: string;
  text: string;       // основной язык (es для DGT)
  text_ru?: string;   // русский перевод (для субтитров в RU-видео)
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

  // Русский перевод (для RU-видео с субтитрами)
  question_ru?: string;         // перевод вопроса — показывается как субтитр

  // Russian explanation (for dual-language workflow)
  explanationRu?: string;
  explanationRuAudioFile?: string;
  explanationRuAudioDurationSec?: number;

  // Hook intro voiceover
  hookAudioFile?: string;
  hookAudioDurationSec?: number;

  // Outro / CTA customization
  outro_text?: string;               // custom viral CTA text shown on the final screen
  outroAudioFile?: string;           // TTS of outro_text
  outroAudioDurationSec?: number;
  show_explanation?: boolean;        // false = skip explanation screen (audio still plays)
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
const COUNTDOWN_DUR   = 0;
const SUSPENSE_DUR    = 6;
const REVEAL_DUR      = 3;
const CTA_DUR_DEFAULT = 4;
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
  // RU video → use RU audio duration; ES video → use ES audio duration
  const expAudioDur   = (q.language === "ru" && q.explanationRuAudioFile)
    ? (q.explanationRuAudioDurationSec ?? 8)
    : (q.explanationAudioDurationSec   ?? 8);
  const explanationDur = Math.max(6, expAudioDur + 1);

  const ctaStart = explanationStart + explanationDur;
  const ctaDur   = q.outroAudioDurationSec
    ? Math.max(CTA_DUR_DEFAULT, q.outroAudioDurationSec + 1)
    : CTA_DUR_DEFAULT;
  const totalSec = ctaStart + ctaDur;

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
    ready:       "ГОТОВЬСЯ!",
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
    ready:       "¡PREPÁRATE!",
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

export const OUTRO_TEMPLATES = {
  ru: [
    { id: "subscribe",  label: "Подпишись",       text: "Подпишись — каждый день новый вопрос ПДД Испании 🇪🇸" },
    { id: "tag",        label: "Отметь друга",     text: "Отметь того, кто едет в Испанию! 👇" },
    { id: "comment",    label: "Угадал?",          text: "Угадал? Пиши ✅ или ❌ в комментарии!" },
    { id: "skily",      label: "Реклама Skily",    text: "Готовишься к испанским правам? 2000+ вопросов на Skily 🚀" },
    { id: "save",       label: "Сохрани",          text: "Сохрани видео — пригодится на экзамене! 📌" },
    { id: "challenge",  label: "Челлендж",         text: "Сдашь DGT с первого раза? Проверь себя на Skily! 🏆" },
  ],
  es: [
    { id: "subscribe",  label: "Suscríbete",       text: "Suscríbete — nueva pregunta DGT cada día 🇪🇸" },
    { id: "tag",        label: "Etiqueta amigo",   text: "¡Etiqueta al que no sabe las normas! 👇" },
    { id: "comment",    label: "¿Acertaste?",      text: "¿Acertaste? ¡Comenta ✅ o ❌!" },
    { id: "skily",      label: "Promo Skily",      text: "¿Preparando el DGT? +2000 preguntas en Skily 🚀" },
    { id: "save",       label: "Guarda el video",  text: "¡Guarda este video para repasar antes del examen! 📌" },
    { id: "challenge",  label: "Desafío",          text: "¿Aprobarás el DGT a la primera? ¡Demuéstralo en Skily! 🏆" },
  ],
} as const;

export const FPS = 30;
// Legacy — used as fallback only; actual duration set via calculateMetadata
export const DURATION_SECS  = 40;
export const TOTAL_FRAMES   = FPS * DURATION_SECS;
