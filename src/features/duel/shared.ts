/**
 * 🎯 Shared Types & Constants for Duel Feature
 * 
 * КРИТИЧНО: Этот файл содержит ВСЕ общие типы, интерфейсы и константы для дуэлей.
 * Используется для предотвращения циклических зависимостей между компонентами и хуками.
 * 
 * Правило: Если тип/константа используется в 2+ файлах - она должна быть здесь.
 */

import type { DuelData, DuelPlayer, DuelAnswer } from '@/types/duel';

// ============================================================================
// CONSTANTS
// ============================================================================

export const ACTIVE_DUEL_STORAGE_KEY = 'active_duel_state';
export const DUEL_RESULT_SNAPSHOT_KEY = 'duel_last_result_snapshot';
export const MAX_STORAGE_AGE_MS = 30 * 60 * 1000; // 30 минут
export const STALE_DUEL_AGE_MS = 15 * 60 * 1000; // 15 минут

export const GRACE_PERIOD_MS = 7000; // 7 секунд grace period для отключений (убирает дребезг)
export const UNSTABLE_THRESHOLD_MS = 15000; // 15 секунд - статус "нестабильно"
export const AUTO_WIN_TIMEOUT_MS = 30000; // 30 секунд до авто-победы (уменьшено с 60 для лучшего UX)

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
    [key: string]: unknown;
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
  opponentAnswerData: DuelAnswer | null;
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
export type GameMode = 'menu' | 'create' | 'join' | 'waiting' | 'battle' | 'result' | 'finding';

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

/**
 * Снимок результатов дуэли для сохранения перед переходом к экрану результатов
 * Используется для предотвращения race condition когда activeDuel очищается
 */
export interface DuelResultSnapshot {
  duelId: string;
  duel: DuelData;
  players: DuelPlayer[];
  myPlayer: DuelPlayer;
  opponentPlayer: DuelPlayer;
  myAnswers: DuelAnswer[];
  opponentAnswers: DuelAnswer[];
  results: {
    isWinner: boolean;
    isDraw: boolean;
    myScore: number;
    opponentScore: number;
    myCorrect: number;
    opponentCorrect: number;
    opponentName: string;
    opponentAvatar: string | null;
    betAmount: number;
    winnings: number;
    insuranceRefund: number;
    insuranceUsed: boolean;
  };
  timestamp: number; // Время создания snapshot
}

