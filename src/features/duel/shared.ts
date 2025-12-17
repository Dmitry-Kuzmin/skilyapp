/**
 * 🎯 Shared Types & Constants for Duel Feature
 * 
 * КРИТИЧНО: Этот файл содержит ВСЕ общие типы, интерфейсы и константы для дуэлей.
 * Используется для предотвращения циклических зависимостей между компонентами и хуками.
 * 
 * Правило: Если тип/константа используется в 2+ файлах - она должна быть здесь.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const ACTIVE_DUEL_STORAGE_KEY = 'active_duel_state';
export const MAX_STORAGE_AGE_MS = 30 * 60 * 1000; // 30 минут
export const STALE_DUEL_AGE_MS = 15 * 60 * 1000; // 15 минут

export const GRACE_PERIOD_MS = 10000; // 10 секунд grace period для отключений
export const AUTO_WIN_TIMEOUT_MS = 60000; // 60 секунд до авто-победы

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Состояние активной дуэли в localStorage
 */
export interface ActiveDuelState {
  duelId: string;
  duelCode: string | null;
  mode: 'battle' | 'waiting';
  currentIndex?: number;
  myScore: number;
  opponentScore: number;
  totalQuestions: number;
  myName: string;
  opponentName: string;
  timestamp: number; // Для проверки актуальности
}

/**
 * Статус активности оппонента
 */
export type OpponentActivityStatus = 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline';

/**
 * Активный exploit (атака) в дуэли
 */
export interface ActiveExploit {
  id?: string; // ID exploit из БД (для resolve_exploit)
  type: string;
  data: {
    duration_ms?: number;
    popup_count?: number;
    delay_ms?: number;
    shuffle_duration_ms?: number;
    [key: string]: any;
  };
  receivedAt: number;
  expiresAt: number;
}

/**
 * Состояние realtime дуэли
 */
export interface DuelRealtimeState {
  opponentJoined: boolean;
  opponentScore: number;
  opponentAnswered: boolean;
  opponentAnswerData: any | null;
  duelStarted: boolean;
  duelFinished: boolean;
  currentQuestion: number;
  opponentCorrectCount: number;
  myScore: number;
  opponentActivityStatus: OpponentActivityStatus;
  opponentLastSeen: Date | null;
  // 🆕 Активные exploits (для State Recovery)
  activeExploits?: ActiveExploit[];
}

/**
 * Статус дуэли (для UI сообщений)
 */
export type DuelStatus = 'not_started' | 'player_left' | 'opponent_left' | 'technical_draw' | 'under_review' | 'abandoned';

/**
 * Режим игры в дуэли
 */
export type GameMode = 'menu' | 'create' | 'join' | 'waiting' | 'battle' | 'result';

/**
 * Результат вызова claim_technical_win
 */
export interface ClaimTechnicalWinResult {
  success: boolean;
  winner_id?: string;
  reason?: string;
  my_score?: number;
  opponent_score?: number;
  offline_seconds?: number;
  error?: string;
  debug_seconds?: number;
}

