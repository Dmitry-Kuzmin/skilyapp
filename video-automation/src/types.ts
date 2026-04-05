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
  // Optional ElevenLabs TTS audio (relative to public/, e.g. "audio/xxx-es-question.mp3")
  questionAudioFile?: string;
  explanationAudioFile?: string;
}

// Skily brand colors
export const BRAND = {
  bg: "#0f0f1a",
  bgCard: "#1a1a2e",
  primary: "#7c3aed",    // violet-700
  primaryLight: "#a855f7", // violet-500
  primaryGlow: "#7c3aed33",
  accent: "#06b6d4",     // cyan-500
  gold: "#f59e0b",       // amber-500
  green: "#10b981",      // emerald-500
  red: "#ef4444",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  border: "#334155",
  gradient: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
} as const;

export const HOOK_TEMPLATES = {
  ru: {
    very_hard:  "Это не знает НИКТО 🤯",
    hard:       "99% водителей ошибаются ❌",
    medium:     "Только опытные знают ответ 🚗",
    easy:       "Проверь себя за 5 секунд ⚡",
  },
  es: {
    very_hard:  "¡NADIE sabe la respuesta! 🤯",
    hard:       "El 99% de conductores falla ❌",
    medium:     "Solo los expertos lo saben 🚗",
    easy:       "¿Sabes la respuesta? ⚡",
  },
} as const;

export const UI_TEXT = {
  ru: {
    think:    "ДУМАЙТЕ!",
    correct:  "ПРАВИЛЬНО!",
    wrong:    "НЕВЕРНО",
    cta:      "Ещё вопросы → skilyapp.com",
    subscribe: "Подпишись 👇",
    answer_before: "Ответь ДО того как покажу →",
    explanation: "Объяснение:",
  },
  es: {
    think:    "¡PIENSA!",
    correct:  "¡CORRECTO!",
    wrong:    "INCORRECTO",
    cta:      "Más preguntas → skilyapp.com",
    subscribe: "Suscríbete 👇",
    answer_before: "Responde ANTES de ver →",
    explanation: "Explicación:",
  },
} as const;

// Timing (frames at 30fps)
export const FPS = 30;
export const DURATION_SECS = 33;
export const TOTAL_FRAMES = FPS * DURATION_SECS;

export const TIMING = {
  hook:        { start: 0,   end: 2  },
  countdown:   { start: 2,   end: 5  },
  question:    { start: 5,   end: 10 },
  answers:     { start: 10,  end: 18 },
  suspense:    { start: 18,  end: 24 }, // 6 seconds — enough for Russian
  reveal:      { start: 24,  end: 27 },
  explanation: { start: 27,  end: 30 },
  cta:         { start: 30,  end: 33 },
} as const;

export function toFrame(seconds: number) {
  return seconds * FPS;
}
