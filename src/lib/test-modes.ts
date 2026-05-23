/**
 * TestMode — единый union type + утилиты-классификаторы.
 *
 * До этого `mode: string` был разбросан по 15+ файлам, а проверки вроде
 * `mode === 'exam' || mode === 'exam-russia'` дублировались десятки раз.
 * Утилиты-классификаторы (isExamMode, isPracticeMode, ...) собраны здесь.
 */

export type TestMode =
    | 'practice'
    | 'exam'
    | 'exam-russia'
    | 'blitz'
    | 'module'
    | 'mastery'
    | 'marathon'
    | 'pdd-ticket'
    | 'pdd-random'
    | 'pdd-sequential'
    | 'pdd-topic'
    | 'sequential'
    | 'redemption'
    | 'round-retry'
    | 'challenge-bank'
    | 'favorites'
    | 'nonstop'
    | 'hardest'
    | 'by-topic'
    | 'traps'
    | 'smart'
    | 'dgt';

const PRACTICE_LIKE: ReadonlySet<TestMode> = new Set<TestMode>([
    'practice', 'blitz', 'mastery', 'marathon', 'sequential', 'module',
    'challenge-bank', 'dgt', 'pdd-ticket', 'redemption', 'by-topic',
    'traps', 'hardest', 'favorites', 'nonstop', 'smart',
]);

const SERVER_VALIDATED: ReadonlySet<TestMode> = new Set<TestMode>([
    'practice', 'exam', 'exam-russia', 'blitz', 'module', 'mastery', 'marathon',
    'pdd-ticket', 'pdd-random', 'pdd-sequential', 'pdd-topic',
    'sequential', 'redemption', 'round-retry',
]);

const AUTO_NEXT: ReadonlySet<TestMode> = new Set<TestMode>([
    'exam', 'exam-russia', 'blitz', 'nonstop',
]);

/** Экзаменационный режим (DGT или ГИБДД) — не показываем правильный ответ сразу */
export function isExamMode(mode: string): boolean {
    return mode === 'exam' || mode === 'exam-russia';
}

/** Блиц — особый режим со счётчиком времени за каждый ответ */
export function isBlitzMode(mode: string): boolean {
    return mode === 'blitz';
}

/** Практико-подобный режим — пользователь сам жмёт "Далее", есть подсказки/explanation */
export function isPracticeLikeMode(mode: string): boolean {
    return PRACTICE_LIKE.has(mode as TestMode);
}

/** Auto-next: после ответа автоматически переходим к следующему вопросу через 300мс */
export function isAutoNextMode(mode: string): boolean {
    return AUTO_NEXT.has(mode as TestMode);
}

/** Server-validated через test-manager Edge Function (всё кроме особых случаев) */
export function isServerValidatedMode(mode: string): boolean {
    return SERVER_VALIDATED.has(mode as TestMode);
}

/** PDD-режим — для билетов и заданий по тематике */
export function isPddMode(mode: string): boolean {
    return mode === 'pdd-ticket'
        || mode === 'pdd-random'
        || mode === 'pdd-sequential'
        || mode === 'pdd-topic';
}

/** Mastery/marathon — режимы с round retry */
export function isRoundRetryMode(mode: string): boolean {
    return mode === 'mastery' || mode === 'marathon';
}
