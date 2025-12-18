/**
 * Типы для мультистранового приложения ПДД
 * Универсальные интерфейсы для работы с разными странами
 */

// ============================================================================
// Универсальные типы (для TestSession)
// ============================================================================

/**
 * Универсальный формат вопроса, который понимает TestSession
 */
export interface UniversalQuestion {
  id: string;
  text: string;
  image: string | null;
  answers: UniversalAnswer[];
  explanation: string | null;
  topics?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Универсальный формат ответа
 */
export interface UniversalAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  position?: number;
}

/**
 * Правила экзамена для страны
 */
export interface ExamRules {
  maxErrors: number;
  timeLimit: number; // секунды
  questionsCount: number;
  mode: 'ticket' | 'exam' | 'practice' | 'random';
  allowAdditionalQuestions?: boolean; // для РФ: +5 вопросов при ошибке
  passingScore?: number; // процент для сдачи (например, 90%)
}

// ============================================================================
// Типы для России (PDD Russia)
// ============================================================================

export interface PDDRussiaQuestion {
  id: string;
  source_id: string;
  ticket_number: number;
  question_number: number;
  ticket_category: string | null;
  question_text: string;
  image_url: string | null;
  explanation: string | null;
  correct_answer_text: string | null;
  topics: string[];
  difficulty: string;
  is_premium: boolean;
  answers?: PDDRussiaAnswer[];
}

export interface PDDRussiaAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  position: number;
}

export interface PDDRussiaTicket {
  ticket_number: number;
  questions_count: number;
  completed?: boolean;
  score?: number;
  last_attempt?: string;
  progress?: number; // процент пройденных вопросов
}

export interface PDDRussiaStats {
  totalTickets: number;
  completedTickets: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  accuracy: number; // процент
  averageScore: number;
}

// ============================================================================
// Типы для Испании (DGT)
// ============================================================================

export interface DGTQuestion {
  id: string;
  category: string;
  question_es: string;
  option_a_es: string;
  option_b_es: string;
  option_c_es: string;
  correct_answer: string;
  explanation_es: string | null;
  image_filename: string | null;
}

export interface DGTStats {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  accuracy: number;
  byCategory: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
}

// ============================================================================
// Общие типы для стран
// ============================================================================

export type CountryCode = 'russia' | 'spain' | 'ukraine' | 'belarus';

export interface CountryData {
  code: CountryCode;
  name: string;
  nameNative: string; // название на языке страны
  flag: string;
  isoCode: string; // ISO код (RU, ES, UA, BY)
  examRules: ExamRules;
  available: boolean;
}

export interface CountryDetection {
  recommendedCountry: CountryCode | null;
  detectedBy: 'ip' | 'language' | 'saved' | null;
  confidence: 'high' | 'medium' | 'low';
  ipCountry?: string; // ISO код из IP
  languageCode?: string; // код языка
}

// ============================================================================
// Типы для прогресса пользователя
// ============================================================================

export interface UserProgress {
  country: CountryCode;
  ticketNumber?: number; // для билетных систем (РФ)
  questionId: string;
  isCorrect: boolean;
  answeredAt: string;
  timeSpent?: number; // секунды
}

export interface TicketProgress {
  ticketNumber: number;
  country: CountryCode;
  completed: boolean;
  score?: number;
  correctAnswers: number;
  totalQuestions: number;
  lastAttempt?: string;
  attempts: number;
}

// ============================================================================
// Конфигурация стран
// ============================================================================

export const COUNTRIES_CONFIG: Record<CountryCode, CountryData> = {
  russia: {
    code: 'russia',
    name: 'Россия',
    nameNative: 'Россия',
    flag: '🇷🇺',
    isoCode: 'RU',
    examRules: {
      maxErrors: 2,
      timeLimit: 20 * 60, // 20 минут
      questionsCount: 20,
      mode: 'ticket',
      allowAdditionalQuestions: true, // +5 вопросов при ошибке
      passingScore: 90, // 90% для сдачи
    },
    available: true,
  },
  spain: {
    code: 'spain',
    name: 'Испания',
    nameNative: 'España',
    flag: '🇪🇸',
    isoCode: 'ES',
    examRules: {
      maxErrors: 3,
      timeLimit: 30 * 60, // 30 минут
      questionsCount: 30,
      mode: 'exam',
      passingScore: 90,
    },
    available: true,
  },
  ukraine: {
    code: 'ukraine',
    name: 'Украина',
    nameNative: 'Україна',
    flag: '🇺🇦',
    isoCode: 'UA',
    examRules: {
      maxErrors: 2,
      timeLimit: 20 * 60,
      questionsCount: 20,
      mode: 'ticket',
      passingScore: 90,
    },
    available: false, // пока не реализовано
  },
  belarus: {
    code: 'belarus',
    name: 'Беларусь',
    nameNative: 'Беларусь',
    flag: '🇧🇾',
    isoCode: 'BY',
    examRules: {
      maxErrors: 2,
      timeLimit: 20 * 60,
      questionsCount: 20,
      mode: 'ticket',
      passingScore: 90,
    },
    available: false, // пока не реализовано
  },
};

