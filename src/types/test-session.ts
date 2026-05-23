/**
 * Общие типы тестовой сессии. Используются хуками test-session/*.
 *
 * Цель: убрать `any` из публичных интерфейсов хуков без необходимости
 * переписывать весь legacy код (который остаётся loose-typed внутри).
 */

import type { NavigateFunction } from 'react-router-dom';

// ─── Question и Answer ──────────────────────────────────────────────────────
export type TestAnswerOption = {
    id: string;
    text_ru?: string;
    text_es?: string;
    text_en?: string;
    text?: string;
    is_correct?: boolean;
    isCorrect?: boolean; // legacy fallback
    position?: number;
};

export type TestQuestionData = {
    id: string;
    question_ru?: string;
    question_es?: string;
    question_en?: string;
    image_url?: string | null;
    explanation_ru?: string | null;
    explanation_es?: string | null;
    explanation_en?: string | null;
    topics?: { title_ru: string; title_es: string } | null;
    answer_options?: TestAnswerOption[];
    answers?: TestAnswerOption[]; // legacy alias
};

// ─── Ответ пользователя ─────────────────────────────────────────────────────
export type UserAnswer = {
    questionId: string;
    selectedAnswerId: string;
    isCorrect: boolean;
};

// ─── Test info (мета теста) ─────────────────────────────────────────────────
export type TestInfo = {
    id?: string;
    title?: string;
    category?: string;
    topic?: string;
    mode?: string;
};

// ─── Offline queue ──────────────────────────────────────────────────────────
export type EnqueueOfflineActionFn = (
    type: string,
    payload: Record<string, unknown>
) => Promise<void>;

// ─── Exam initialize ────────────────────────────────────────────────────────
export type InitializeExamFn = (
    mode: string,
    questions: TestQuestionData[],
    options?: { timeLimit?: number }
) => void;

// ─── Navigation (re-export для удобства) ────────────────────────────────────
export type { NavigateFunction };

// ─── Russia exam adapter (см. useRussiaExamAdapter) ─────────────────────────
export type RussiaExamAdapter = {
    currentQuestion: {
        id: string;
        text?: string;
        image?: string;
        explanation?: string;
        topics?: string[];
        answers?: Array<{ id: string; text?: string; isCorrect?: boolean; is_correct?: boolean }>;
    } | null;
    questions: TestQuestionData[];
    isExtraMode: boolean;
    handleAnswer: (isCorrect: boolean) => {
        shouldContinue: boolean;
        shouldAddExtra?: boolean;
        failureReason?: string;
        blockId?: number;
        extraTime?: number;
    };
    timeRemaining: number;
};

// ─── ActiveState из useExamStore ────────────────────────────────────────────
export type ActiveExamState =
    | { kind: 'standard'; data: { questions: TestQuestionData[]; answers: Record<string, { selectedOptionId: string; isCorrect: boolean }>; [k: string]: unknown } }
    | { kind: 'russia'; data: { mainAnswers: Record<string, UserAnswer>; extraAnswers: Record<string, UserAnswer>; [k: string]: unknown } };
