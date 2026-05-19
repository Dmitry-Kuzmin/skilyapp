/**
 * saveTopicProgress — общий sequential test progress (RPC) +
 * module topic completion (upsert в user_topic_progress).
 *
 * Объединено в один файл потому что обе операции относятся к "прогрессу по теме",
 * и обычно вызываются в одной транзакции (хотя у нас не atomic).
 */

import { supabase } from '@/integrations/supabase/client';

export type SequentialTestProgressInput = {
    profileId: string;
    effectiveTestId: string;
    questionsTotal: number;
    correctCount: number;
    timeSpentSec: number;
};

export async function updateSequentialTestProgress(input: SequentialTestProgressInput): Promise<void> {
    const { profileId, effectiveTestId, questionsTotal, correctCount, timeSpentSec } = input;

    const { error } = await supabase.rpc('update_test_progress', {
        p_user_id: profileId,
        p_test_id: effectiveTestId,
        p_correct_answers: correctCount,
        p_total_questions: questionsTotal,
        p_time_spent_seconds: timeSpentSec,
    });

    if (error) console.error('[updateSequentialTestProgress] error:', error);
}

export type ModuleTopicProgressInput = {
    profileId: string;
    topicId: string;
    score: number; // 0-100
};

const MODULE_PASS_THRESHOLD = 70;

export async function upsertModuleTopicProgress(input: ModuleTopicProgressInput): Promise<void> {
    const { profileId, topicId, score } = input;

    try {
        await supabase
            .from('user_topic_progress')
            .upsert(
                {
                    user_id: profileId,
                    topic_id: topicId,
                    subtopic_id: null,
                    completed: score >= MODULE_PASS_THRESHOLD,
                    score,
                },
                { onConflict: 'user_id,topic_id,subtopic_id' }
            );
    } catch (err) {
        console.error('[upsertModuleTopicProgress] error:', err);
    }
}
