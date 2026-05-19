/**
 * processRewards — финальный расчёт SP/coins.
 *
 * Приоритетный путь: server-validated complete через test-manager
 *   → сервер пересчитывает score из test_session_answers и сам вызывает
 *     complete-test-and-award (см. test-manager/handlers/gameplay.ts).
 *
 * Fallback: старый flow — клиент вызывает complete-test-and-award напрямую.
 * Используется когда серверной сессии нет (например ошибка start_session)
 * или когда офлайн (offline-queue).
 */

import { supabase } from '@/integrations/supabase/client';
import { checkOnlineStatus } from '@/hooks/useOnlineStatus';

export type TestRewardResult = {
    coins_awarded?: number;
    sp_awarded?: number;
    base_coins?: number;
    base_sp?: number;
    abuse_penalty?: number;
    diminishing_factor?: number;
    message?: string;
    level_up?: boolean;
    new_level?: number;
    tests_today?: number;
};

export type ServerCompleteFn = (params: {
    client_correct_count?: number;
    test_duration_seconds?: number;
    premium_flag?: boolean;
    double_sp_active?: boolean;
    effective_question_count?: number;
}) => Promise<{
    success: true;
    score: number;
    correct_count: number;
    questions_count: number;
    test_duration_seconds: number;
    speed_cheat_detected: boolean;
    already_completed?: boolean;
    reward?: Record<string, unknown> | null;
} | null>;

export type ProcessRewardsInput = {
    profileId: string;
    mode: string;
    testId: string | undefined;
    questionsTotal: number;
    correctCount: number;
    timeSpentSec: number;
    isPremium: boolean;
    answersLength: number;

    // Server-validated path
    serverSessionId?: string | null;
    serverComplete?: ServerCompleteFn;

    // Legacy fallback path
    enqueueOfflineAction: (type: string, payload: Record<string, unknown>) => Promise<void>;
    getOrCreateSessionId: () => string;
};

export type ProcessRewardsResult = {
    rewardResult: TestRewardResult | null;
    /** Если сервер вернул свои числа — используем их вместо клиентских */
    overrideScore?: number;
    overrideCorrect?: number;
    overrideTimeSpent?: number;
    speedCheatDetected?: boolean;
};

/**
 * Главная функция: пробует server path, при неудаче — legacy.
 */
export async function processRewards(input: ProcessRewardsInput): Promise<ProcessRewardsResult> {
    // 1. Server path (приоритет)
    if (input.serverSessionId && input.serverComplete) {
        const serverResult = await tryServerComplete(input);
        if (serverResult) return serverResult;
    }

    // 2. Legacy / offline path
    return await legacyComplete(input);
}

async function tryServerComplete(input: ProcessRewardsInput): Promise<ProcessRewardsResult | null> {
    try {
        const realOnline = await checkOnlineStatus();
        if (!realOnline) return null;

        // Russia exam особый случай: snapshot >> real
        const effectiveCount = input.mode === 'exam-russia'
            ? Math.max(input.answersLength, 20)
            : undefined;

        const serverResult = await input.serverComplete!({
            client_correct_count: input.correctCount,
            test_duration_seconds: Math.max(input.timeSpentSec, 0),
            premium_flag: Boolean(input.isPremium),
            double_sp_active: false,
            effective_question_count: effectiveCount,
        });

        if (!serverResult) return null;

        const reward = (serverResult.reward ?? {}) as Record<string, unknown>;
        return {
            rewardResult: {
                coins_awarded: (reward.coins_awarded as number | undefined) ?? 0,
                sp_awarded: (reward.sp_awarded as number | undefined) ?? 0,
                base_coins: reward.base_coins as number | undefined,
                base_sp: reward.sp_base as number | undefined,
                abuse_penalty: reward.abuse_penalty as number | undefined,
                diminishing_factor: reward.diminishing_factor as number | undefined,
                message: reward.message as string | undefined,
                level_up: reward.level_up as boolean | undefined,
                new_level: reward.new_level as number | undefined,
                tests_today: reward.tests_today as number | undefined,
            },
            overrideScore: serverResult.score,
            overrideCorrect: serverResult.correct_count,
            overrideTimeSpent: serverResult.test_duration_seconds,
            speedCheatDetected: serverResult.speed_cheat_detected,
        };
    } catch (err) {
        console.error('[processRewards] serverComplete failed:', err);
        return null;
    }
}

async function legacyComplete(input: ProcessRewardsInput): Promise<ProcessRewardsResult> {
    const score = input.questionsTotal > 0
        ? Math.round((input.correctCount / input.questionsTotal) * 100)
        : 0;
    const sessionId = input.getOrCreateSessionId();

    try {
        const realOnline = await checkOnlineStatus();

        if (!realOnline) {
            await input.enqueueOfflineAction('test-result', {
                user_id: input.profileId,
                session_id: sessionId,
                test_id: input.testId || null,
                score,
                questions_count: input.questionsTotal,
                correct_count: input.correctCount,
                test_duration_seconds: Math.max(input.timeSpentSec, 0),
                premium_flag: Boolean(input.isPremium),
                double_sp_active: false,
                mode: input.mode,
            });
            return {
                rewardResult: {
                    coins_awarded: 0,
                    sp_awarded: 0,
                    message: 'OFFLINE: Результаты сохранены и будут отправлены при подключении.',
                },
            };
        }

        const { data, error } = await supabase.functions.invoke('complete-test-and-award', {
            body: {
                user_id: input.profileId,
                session_id: sessionId,
                test_id: input.testId || null,
                score,
                questions_count: input.questionsTotal,
                correct_count: input.correctCount,
                test_duration_seconds: Math.max(input.timeSpentSec, 0),
                premium_flag: Boolean(input.isPremium),
                double_sp_active: false,
                mode: input.mode,
            },
        });

        if (error) {
            console.error('[processRewards] legacy reward error:', error);
            return { rewardResult: null };
        }

        return { rewardResult: (data as TestRewardResult) ?? null };
    } catch (err) {
        console.error('[processRewards] legacy exception:', err);
        return { rewardResult: null };
    }
}
