import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Seeded random number generator (Mulberry32)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Generate readable 6-character code
function generateDuelCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Calculate scoring
function calculateScore(
  difficulty: string,
  timeRemainMs: number,
  timeTotalMs: number,
  combo: number
): number {
  const basePoints = { easy: 100, medium: 200, hard: 350 };
  const base = basePoints[difficulty as keyof typeof basePoints] || 200;
  
  const timeBonus = Math.round((timeRemainMs / timeTotalMs) * base * 0.4);
  const comboMult = Math.min(1 + (combo * 0.05), 1.20);
  
  return Math.round((base + timeBonus) * comboMult);
}

// Bot simulation
function simulateBotAnswer(difficulty: string, questionDifficulty: string): {
  delayMs: number;
  willBeCorrect: boolean;
} {
  const accuracyMap = {
    easy: { easy: 0.95, medium: 0.85, hard: 0.65 },
    medium: { easy: 0.85, medium: 0.70, hard: 0.50 },
    hard: { easy: 0.70, medium: 0.55, hard: 0.35 },
  };
  
  const delayMap = {
    easy: [2000, 4000],
    medium: [3000, 6000],
    hard: [5000, 9000],
  };
  
  const accuracy = accuracyMap[difficulty as keyof typeof accuracyMap]?.[questionDifficulty as keyof typeof accuracyMap.easy] || 0.5;
  const [minDelay, maxDelay] = delayMap[difficulty as keyof typeof delayMap] || [3000, 6000];
  
  return {
    delayMs: Math.floor(Math.random() * (maxDelay - minDelay) + minDelay),
    willBeCorrect: Math.random() < accuracy,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...params } = await req.json();

    // Get profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileId = profile.id;

    switch (action) {
      case 'create_duel': {
        const { num_questions, categories, difficulty } = params;
        
        // Generate unique code
        let code = generateDuelCode();
        let attempts = 0;
        while (attempts < 10) {
          const { data: existing } = await supabase
            .from('duels')
            .select('id')
            .eq('code', code)
            .single();
          
          if (!existing) break;
          code = generateDuelCode();
          attempts++;
        }

        const questionSeed = Math.floor(Math.random() * 1000000);

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .insert({
            code,
            host_user: profileId,
            num_questions,
            categories,
            difficulty,
            question_seed: questionSeed,
          })
          .select()
          .single();

        if (duelError) throw duelError;

        // Add host as player
        await supabase.from('duel_players').insert({
          duel_id: duel.id,
          user_id: profileId,
          is_host: true,
        });

        return new Response(JSON.stringify({ duel, code }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join_duel': {
        const { code } = params;

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('*')
          .eq('code', code)
          .eq('status', 'waiting')
          .single();

        if (duelError || !duel) {
          return new Response(JSON.stringify({ error: 'Duel not found or already started' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if already in duel
        const { data: existingPlayer } = await supabase
          .from('duel_players')
          .select('id')
          .eq('duel_id', duel.id)
          .eq('user_id', profileId)
          .single();

        if (existingPlayer) {
          return new Response(JSON.stringify({ duel }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check player count
        const { count } = await supabase
          .from('duel_players')
          .select('*', { count: 'exact', head: true })
          .eq('duel_id', duel.id);

        if (count && count >= 2) {
          return new Response(JSON.stringify({ error: 'Duel is full' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase.from('duel_players').insert({
          duel_id: duel.id,
          user_id: profileId,
          is_host: false,
        });

        return new Response(JSON.stringify({ duel }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_duel': {
        const { duel_id } = params;

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('*, duel_players(*)')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel) throw new Error('Duel not found');

        if (duel.host_user !== profileId) {
          return new Response(JSON.stringify({ error: 'Only host can start' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get questions using seed
        const rng = mulberry32(duel.question_seed);
        let query = supabase.from('questions_new').select('*');
        
        if (duel.difficulty && duel.difficulty !== 'mix') {
          query = query.eq('difficulty', duel.difficulty);
        }
        
        if (duel.categories) {
          query = query.in('topic_id', duel.categories);
        }

        const { data: allQuestions, error: questionsError } = await query;
        if (questionsError || !allQuestions || allQuestions.length === 0) {
          throw new Error('No questions available');
        }

        // Shuffle and select using seeded random
        const shuffled = [...allQuestions].sort(() => rng() - 0.5);
        const selectedQuestions = shuffled.slice(0, duel.num_questions);

        // Create question snapshots
        for (let i = 0; i < selectedQuestions.length; i++) {
          const q = selectedQuestions[i];
          
          const { data: options } = await supabase
            .from('answer_options')
            .select('*')
            .eq('question_id', q.id)
            .order('position');

          const snapshot = {
            question_ru: q.question_ru,
            question_es: q.question_es,
            question_en: q.question_en,
            image_url: q.image_url,
            options: options || [],
            difficulty: q.difficulty,
          };

          const correctOptionIds = options?.filter(o => o.is_correct).map(o => o.id) || [];

          await supabase.from('duel_questions').insert({
            duel_id: duel.id,
            question_id: q.id,
            position: i + 1,
            question_snapshot: snapshot,
            correct_option_ids: correctOptionIds,
          });
        }

        // Update duel status
        await supabase
          .from('duels')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', duel.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'submit_answer': {
        const { duel_id, duel_question_id, selected_option_id, time_taken_ms, latency_ms } = params;

        // Get player
        const { data: player } = await supabase
          .from('duel_players')
          .select('*')
          .eq('duel_id', duel_id)
          .eq('user_id', profileId)
          .single();

        if (!player) throw new Error('Player not found');

        // Get question
        const { data: question } = await supabase
          .from('duel_questions')
          .select('*')
          .eq('id', duel_question_id)
          .single();

        if (!question) throw new Error('Question not found');

        // Check if already answered
        const { data: existingAnswer } = await supabase
          .from('duel_answers')
          .select('id')
          .eq('player_id', player.id)
          .eq('duel_question_id', duel_question_id)
          .single();

        if (existingAnswer) {
          return new Response(JSON.stringify({ error: 'Already answered' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const correctIds = question.correct_option_ids as string[];
        const isCorrect = correctIds.includes(selected_option_id);

        // Calculate combo
        const { count: correctStreak } = await supabase
          .from('duel_answers')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', player.id)
          .eq('is_correct', true)
          .gte('created_at', new Date(Date.now() - 60000).toISOString());

        const combo = correctStreak || 0;

        // Adjust time for latency
        const adjustedTime = Math.max(0, time_taken_ms - (latency_ms || 0));
        const timeLimit = 12000; // 12 seconds default
        const timeRemain = Math.max(0, timeLimit - adjustedTime);

        const difficulty = (question.question_snapshot as any).difficulty || 'medium';
        const points = isCorrect ? calculateScore(difficulty, timeRemain, timeLimit, combo) : 0;

        // Insert answer
        await supabase.from('duel_answers').insert({
          duel_id,
          player_id: player.id,
          duel_question_id,
          selected_option_id,
          is_correct: isCorrect,
          time_taken_ms: adjustedTime,
          points_awarded: points,
          combo_at_time: combo,
        });

        // Update player score
        await supabase
          .from('duel_players')
          .update({
            score: player.score + points,
            correct_count: player.correct_count + (isCorrect ? 1 : 0),
          })
          .eq('id', player.id);

        return new Response(JSON.stringify({ 
          is_correct: isCorrect, 
          points,
          combo: isCorrect ? combo + 1 : 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'finish_duel': {
        const { duel_id } = params;

        const { data: duel } = await supabase
          .from('duels')
          .select('*, duel_players(*)')
          .eq('id', duel_id)
          .single();

        if (!duel) throw new Error('Duel not found');

        const players = duel.duel_players as any[];
        const [player1, player2] = players;

        let winnerId = null;
        if (player1.score > player2.score) winnerId = player1.user_id;
        else if (player2.score > player1.score) winnerId = player2.user_id;

        // Update duel status
        await supabase
          .from('duels')
          .update({ status: 'finished', finished_at: new Date().toISOString() })
          .eq('id', duel_id);

        // Calculate rewards
        for (const player of players) {
          if (player.is_bot) continue;

          const baseXP = Math.round(player.score / 20);
          const isWinner = player.user_id === winnerId;
          const victoryBonus = isWinner ? 25 : 10;
          const cleanSweep = player.correct_count === duel.num_questions ? 50 : 0;
          const totalXP = baseXP + victoryBonus + cleanSweep;
          const coins = Math.floor(player.score / 500);

          // Update profile
          await supabase
            .from('profiles')
            .update({
              xp: supabase.rpc('increment', { x: totalXP }),
              coins: supabase.rpc('increment', { x: coins }),
            })
            .eq('id', player.user_id);

          // Update stats
          await supabase.rpc('upsert_duel_stats', {
            p_user_id: player.user_id,
            p_is_win: isWinner,
            p_is_draw: winnerId === null,
            p_score: player.score,
          });
        }

        return new Response(JSON.stringify({ 
          winner_id: winnerId,
          players: players.map(p => ({
            user_id: p.user_id,
            score: p.score,
            correct_count: p.correct_count,
          })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
