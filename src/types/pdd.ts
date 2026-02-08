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

/**
 * Краткая сводка по билету (используется в селекторах)
 */
export interface PDDTicketSummary {
  id: number;
  number: number;
  questions_count: number;
  completed: boolean;
  progress: number;
  score?: number;
  metadata?: any;
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

/**
 * Категории прав для России (ГИБДД)
 */
export type RussiaLicenseCategory = 'A' | 'A1' | 'B' | 'BE' | 'C' | 'CE' | 'D' | 'DE' | 'M';

/**
 * Категории прав для Испании (DGT)
 */
export type SpainLicenseCategory = 'A' | 'A1' | 'A2' | 'B' | 'B1' | 'C' | 'C1' | 'D' | 'D1' | 'E' | 'AM';

/**
 * Универсальный тип категории (зависит от страны)
 */
export type LicenseCategory = RussiaLicenseCategory | SpainLicenseCategory | string;

/**
 * Конфигурация категории прав
 */
export interface LicenseCategoryConfig {
  code: string;
  name: string;
  nameFull: string; // полное название (например, "Легковые автомобили")
  icon: string; // эмодзи иконка
  description?: string;
}

export interface CountryData {
  code: CountryCode;
  name: string;
  nameNative: string; // название на языке страны
  flag: string;
  isoCode: string; // ISO код (RU, ES, UA, BY)
  examRules: ExamRules;
  available: boolean;
  licenseCategories?: LicenseCategoryConfig[]; // категории прав для этой страны
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
    licenseCategories: [
      { code: 'A', name: 'A', nameFull: 'Мотоциклы', icon: '🏍️', description: 'Мотоциклы (A/B база)' },
      { code: 'B', name: 'B', nameFull: 'Легковые автомобили', icon: '🚗', description: 'Легковые автомобили (A/B база)' },
      { code: 'C', name: 'C', nameFull: 'Грузовые автомобили', icon: '🚚', description: 'Грузовые (C/D база)' },
      { code: 'D', name: 'D', nameFull: 'Автобусы', icon: '🚌', description: 'Автобусы (C/D база)' },
    ],
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
    licenseCategories: [
      { code: 'A', name: 'A', nameFull: 'Motocicletas', icon: '🏍️', description: 'Motocicletas' },
      { code: 'A1', name: 'A1', nameFull: 'Motocicletas ligeras', icon: '🛵', description: 'Motocicletas ligeras (hasta 125 cm³)' },
      { code: 'A2', name: 'A2', nameFull: 'Motocicletas medias', icon: '🏍️', description: 'Motocicletas medias (hasta 35 kW)' },
      { code: 'B', name: 'B', nameFull: 'Turismos', icon: '🚗', description: 'Turismos (hasta 3.5 t)' },
      { code: 'B1', name: 'B1', nameFull: 'Cuadriciclos', icon: '🛻', description: 'Cuadriciclos' },
      { code: 'C', name: 'C', nameFull: 'Camiones', icon: '🚚', description: 'Camiones (más de 3.5 t)' },
      { code: 'C1', name: 'C1', nameFull: 'Camiones ligeros', icon: '🚛', description: 'Camiones ligeros (3.5-7.5 t)' },
      { code: 'D', name: 'D', nameFull: 'Autobuses', icon: '🚌', description: 'Autobuses (más de 8 plazas)' },
      { code: 'D1', name: 'D1', nameFull: 'Autobuses pequeños', icon: '🚎', description: 'Autobuses pequeños (9-16 plazas)' },
      { code: 'E', name: 'E', nameFull: 'Remolques', icon: '🚐', description: 'Remolques pesados' },
      { code: 'AM', name: 'AM', nameFull: 'Ciclomotores', icon: '🛴', description: 'Ciclomotores (hasta 50 cm³)' },
    ],
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

/**
 * Получить категории прав для страны
 */
export function getLicenseCategoriesForCountry(country: CountryCode): LicenseCategoryConfig[] {
  return COUNTRIES_CONFIG[country]?.licenseCategories || [];
}

/**
 * Получить категорию по коду для страны
 */
export function getLicenseCategory(country: CountryCode, categoryCode: string): LicenseCategoryConfig | undefined {
  return getLicenseCategoriesForCountry(country).find(cat => cat.code === categoryCode);
}

