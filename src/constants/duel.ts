/**
 * Константы для системы дуэлей
 * Централизованное хранение всех таймингов и настроек
 */

export const DUEL_TIMINGS = {
  // Задержки переходов между экранами (мс)
  TRANSITION_DELAY_MOBILE: 150,
  TRANSITION_DELAY_DESKTOP: 100,
  
  // Интервалы проверки счета соперника (мс)
  SCORE_CHECK_INTERVAL_MOBILE: 1500,
  SCORE_CHECK_INTERVAL_DESKTOP: 2000,
  
  // Задержка автоприсоединения к дуэли (мс)
  AUTO_JOIN_DELAY: 300,
  
  // Задержка перед показом результатов (мс)
  RESULTS_TRANSITION_DELAY: 100,
  
  // Интервал проверки статуса дуэли (мс)
  STATUS_CHECK_INTERVAL: 500,
  
  // Максимальное время ожидания завершения дуэли (мс)
  MAX_WAIT_FOR_FINISH: 120000, // 2 минуты
  
  // Задержка для fallback проверок (мс)
  FALLBACK_CHECK_DELAY: 500,
  
  // Задержка перед восстановлением состояния (мс)
  RESTORE_STATE_DELAY: 100,
} as const;

export const DUEL_CONFIG = {
  // Минимальное количество вопросов
  MIN_QUESTIONS: 5,
  
  // Максимальное количество вопросов
  MAX_QUESTIONS: 30,
  
  // Время на вопрос (мс)
  QUESTION_TIME_MS: 60000, // 60 секунд
  
  // Максимальное время хранения активной дуэли (мс)
  ACTIVE_DUEL_MAX_AGE: 30 * 60 * 1000, // 30 минут
  
  // Ставки по умолчанию
  DEFAULT_BET_AMOUNTS: [10, 50, 100, 500],
  
  // Страховка
  INSURANCE_RATE: 0.15,
  COVERAGE_RATE: 0.6,
} as const;

export const DUEL_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
} as const;

export const DUEL_MODE = {
  MENU: 'menu',
  CREATE: 'create',
  JOIN: 'join',
  BATTLE: 'battle',
  RESULT: 'result',
} as const;

export type DuelStatus = typeof DUEL_STATUS[keyof typeof DUEL_STATUS];
export type DuelMode = typeof DUEL_MODE[keyof typeof DUEL_MODE];

