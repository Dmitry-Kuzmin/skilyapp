/**
 * Константы тестовой механики — одно место для всех "магических чисел".
 * Если изменилось правило (например, проходной балл) — меняешь здесь.
 *
 * Сервер дублирует часть этих значений (см. supabase/functions/_shared/game-helpers.ts).
 * При расхождении выигрывает СЕРВЕР, поэтому при изменении не забудь синхронизировать.
 */

// ─── Пороги прохождения ─────────────────────────────────────────────────────
/** PDD-билет считается сданным при score >= этого значения (в %) */
export const PDD_TICKET_PASS_THRESHOLD = 90;

/** Модуль (тема) считается изученным при score >= этого значения (в %) */
export const MODULE_PASS_THRESHOLD = 70;

/** Экзамен (DGT/ГИБДД) считается сданным при score >= этого значения (в %) */
export const EXAM_PASS_THRESHOLD = 90;

// ─── Лимиты времени (секунды) ───────────────────────────────────────────────
/** DGT Spain экзамен: 30 минут */
export const EXAM_TIME_DGT = 1800;

/** ГИБДД экзамен: 20 минут */
export const EXAM_TIME_RUSSIA = 1200;

/** Marathon: 10 минут */
export const EXAM_TIME_MARATHON = 600;

// ─── Anti-cheat ─────────────────────────────────────────────────────────────
/** Минимум секунд на вопрос — если меньше, считается speed cheat и SP = 0 */
export const MIN_SECONDS_PER_QUESTION = 5;

/** Cooldown между завершёнными тестами (секунды) */
export const TEST_COOLDOWN_SECONDS = 10;

// ─── Russia exam ────────────────────────────────────────────────────────────
/** Базовое количество основных вопросов в русском экзамене */
export const RUSSIA_EXAM_MAIN_QUESTIONS = 20;

/** Максимум вопросов в snapshot для russia (main + extra pool) */
export const RUSSIA_EXAM_MAX_SNAPSHOT = 60;

/** Дополнительное время за ошибку в russia exam (секунды) */
export const RUSSIA_EXAM_EXTRA_TIME = 300;

// ─── Timer thresholds ───────────────────────────────────────────────────────
/** Таймер становится warning при оставшемся времени <= этого (секунды) */
export const TIMER_WARNING_THRESHOLD = 120;

/** Таймер становится critical при оставшемся времени <= этого (секунды) */
export const TIMER_CRITICAL_THRESHOLD = 30;

// ─── Streak уровни ──────────────────────────────────────────────────────────
export const STREAK_TIER_MILD = 3;
export const STREAK_TIER_WARM = 5;
export const STREAK_TIER_HOT = 8;

// ─── Утилиты ────────────────────────────────────────────────────────────────
/** Получить общее время теста по режиму (для таймера и speed-cheat) */
export function getTestTimeLimit(mode: string): number {
    if (mode === 'exam-russia') return EXAM_TIME_RUSSIA;
    if (mode === 'exam') return EXAM_TIME_DGT;
    if (mode === 'marathon') return EXAM_TIME_MARATHON;
    return 0; // unlimited
}
