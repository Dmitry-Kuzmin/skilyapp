/**
 * logGameSession — записывает game_sessions для legacy совместимости
 * (аналитика, achievements).
 *
 * Сохраняет минимальные данные: тип игры, score, длительность.
 * Score хранится как сырое количество правильных, total_questions limited 0-100.
 */

import { supabase } from '@/integrations/supabase/client';

export type GameSessionInput = {
    mode: string;
    testId: string | undefined;
    questionsTotal: number;
    correctCount: number;
    durationSec: number;
};

const deriveGameType = (mode: string, testId: string | undefined): string => {
    if (testId) return 'test_sequential';
    if (mode === 'exam') return 'test_exam';
    if (mode === 'blitz') return 'test_blitz';
    if (mode === 'module') return 'test_module';
    return 'test_practice';
};

export async function logGameSession(input: GameSessionInput): Promise<void> {
    const { mode, testId, questionsTotal, correctCount, durationSec } = input;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) return;

        await supabase.from('game_sessions').insert({
            user_id: profile.id,
            game_type: deriveGameType(mode, testId),
            score: Math.min(Math.max(0, correctCount), questionsTotal),
            total_questions: Math.min(Math.max(1, questionsTotal), 100),
            duration_seconds: Math.min(Math.max(0, durationSec), 7200),
        });
    } catch (err) {
        console.error('[logGameSession] error:', err);
    }
}
