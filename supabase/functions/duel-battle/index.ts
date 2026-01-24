import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/duel-helpers.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createPooledSupabaseClient();

        const body = await req.json();
        const { action, profile_id, ...params } = body;

        switch (action) {
            case 'get_players': {
                const { duel_id } = params;

                const { data: players } = await supabase
                    .from('duel_players')
                    .select('id, user_id, score, correct_count, is_bot, bot_difficulty, bot_name, name')
                    .eq('duel_id', duel_id);

                const { data: answersData } = await supabase
                    .from('duel_answers')
                    .select('player_id')
                    .eq('duel_id', duel_id);

                const answersCountMap = new Map();
                if (answersData) {
                    answersData.forEach((ans: any) => {
                        const count = answersCountMap.get(ans.player_id) || 0;
                        answersCountMap.set(ans.player_id, count + 1);
                    });
                }

                const { data: duelInfo } = await supabase
                    .from('duels')
                    .select('num_questions')
                    .eq('id', duel_id)
                    .single();

                const totalQuestions = duelInfo?.num_questions || 10;

                const formattedPlayers = (players || []).map((p: any) => {
                    const answeredCount = answersCountMap.get(p.id) || 0;
                    return {
                        id: p.id,
                        user_id: p.user_id,
                        score: p.score || 0,
                        correct_count: p.correct_count || 0,
                        answered_count: answeredCount,
                        is_finished: answeredCount >= totalQuestions,
                        name: p.is_bot ? (p.bot_name || p.name || 'Bot') : (p.name || 'Игрок'),
                        is_bot: p.is_bot,
                        bot_difficulty: p.bot_difficulty,
                    };
                });

                return new Response(JSON.stringify({ players: formattedPlayers }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            case 'get_questions': {
                const { duel_id } = params;

                const { data: questions, error } = await supabase
                    .from('duel_questions')
                    .select('*')
                    .eq('duel_id', duel_id)
                    .order('position');

                if (error) {
                    throw error;
                }

                return new Response(JSON.stringify({ questions }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            default:
                return new Response(JSON.stringify({ error: 'Unknown action' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
        }
    } catch (error: any) {
        console.error('[duel-battle] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
