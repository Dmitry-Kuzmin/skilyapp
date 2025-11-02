import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const createDuelSchema = z.object({
  num_questions: z.number().int().min(5).max(30),
  categories: z.array(z.string().uuid()).max(10).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mix']).optional()
});

const joinDuelSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{6}$/, 'Invalid code format')
});

const submitAnswerSchema = z.object({
  duel_id: z.string().uuid(),
  duel_question_id: z.string().uuid(),
  selected_option_id: z.string().uuid().nullable().optional(),
  time_taken_ms: z.number().int().min(0).max(60000),
  latency_ms: z.number().int().min(0).max(5000).optional(),
  boost_used: z.string().optional(),
  is_timeout: z.boolean().optional()
});

const useBoostSchema = z.object({
  duel_id: z.string().uuid(),
  duel_question_id: z.string().uuid().optional(),
  boost_type: z.enum(['fifty_fifty', 'time_extend', 'hint', 'skip'])
});

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

    // Parse request body first to get profile_id if provided
    const { action, profile_id, ...params } = await req.json();

    console.log('[Duel Manager] Action:', action, 'Profile ID from client:', profile_id);

    let profileId: string | null = profile_id || null;

    // If profile_id is not provided, try to get it from auth (fallback for email users)
    if (!profileId) {
      console.log('[Duel Manager] No profile_id provided, attempting auth lookup...');
      const authHeader = req.headers.get('Authorization')!;
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (user && !authError) {
        console.log('[Duel Manager] Authenticated user found:', user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile && !profileError) {
          profileId = profile.id;
          console.log('[Duel Manager] Profile found via auth:', profileId);
        }
      }
    } else {
      console.log('[Duel Manager] Using profile_id from client:', profileId);
    }

    if (!profileId) {
      console.error('[Duel Manager] Profile not found - neither from client nor auth');
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'create_duel': {
        const validated = createDuelSchema.parse(params);
        const { num_questions, categories, difficulty } = validated;
        
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
        const validated = joinDuelSchema.parse(params);
        const { code } = validated;

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

        // Check if user is already in this duel
        const { data: existingPlayer } = await supabase
          .from('duel_players')
          .select('*')
          .eq('duel_id', duel.id)
          .eq('user_id', profileId)
          .single();

        if (existingPlayer) {
          return new Response(JSON.stringify({ error: 'You are already in this duel' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Add player to duel
        const { data: player, error: playerError } = await supabase
          .from('duel_players')
          .insert({
            duel_id: duel.id,
            user_id: profileId,
            is_host: false,
          })
          .select()
          .single();

        if (playerError) throw playerError;

        // Check if we now have 2 players - auto-start duel
        const { data: allPlayers } = await supabase
          .from('duel_players')
          .select('id')
          .eq('duel_id', duel.id);

        if (allPlayers && allPlayers.length === 2) {
          // Auto-start the duel
          const { data: questions } = await supabase
            .from('questions_new')
            .select(`
              id, question_es, image_url, difficulty,
              answer_options(id, text_es, is_correct, position)
            `)
            .limit(duel.num_questions);

          if (!questions) throw new Error('No questions found');

          // Shuffle using seed
          const rng = mulberry32(duel.question_seed);
          const shuffled = [...questions].sort(() => rng() - 0.5);

          // Insert duel questions
          const duelQuestions = shuffled.map((q, idx) => ({
            duel_id: duel.id,
            question_id: q.id,
            position: idx + 1,
            question_snapshot: q,
            correct_option_ids: q.answer_options
              .filter((opt: any) => opt.is_correct)
              .map((opt: any) => opt.id),
          }));

          await supabase.from('duel_questions').insert(duelQuestions);

          // Update duel status
          await supabase
            .from('duels')
            .update({ status: 'active', started_at: new Date().toISOString() })
            .eq('id', duel.id);

          return new Response(
            JSON.stringify({ duel: { ...duel, status: 'active' }, player, auto_started: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({ duel, player, auto_started: false }), {
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
        const validated = submitAnswerSchema.parse(params);
        const { duel_id, duel_question_id, selected_option_id, time_taken_ms, latency_ms, boost_used, is_timeout } = validated;

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
        const isSkipped = !selected_option_id || is_timeout;
        const isCorrect = !isSkipped && selected_option_id ? correctIds.includes(selected_option_id) : false;

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
        const timeLimit = 60000; // 60 seconds
        const timeRemain = Math.max(0, timeLimit - adjustedTime);

        const difficulty = (question.question_snapshot as any).difficulty || 'medium';
        const points = isCorrect ? calculateScore(difficulty, timeRemain, timeLimit, combo) : 0;

        // Insert answer
        await supabase.from('duel_answers').insert({
          duel_id,
          player_id: player.id,
          duel_question_id,
          selected_option_id: selected_option_id || null,
          is_correct: isCorrect,
          is_skipped: isSkipped,
          time_taken_ms: adjustedTime,
          points_awarded: points,
          combo_at_time: combo,
          boost_used: boost_used || null,
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

      case 'use_boost': {
        const validated = useBoostSchema.parse(params);
        const { duel_id, duel_question_id, boost_type } = validated;

        // Get player
        const { data: player } = await supabase
          .from('duel_players')
          .select('*')
          .eq('duel_id', duel_id)
          .eq('user_id', profileId)
          .single();

        if (!player) throw new Error('Player not found');

        // Check if user has the boost
        const { data: hasBoost } = await supabase.rpc('has_boost', {
          p_user_id: profileId,
          p_boost_type: boost_type
        });

        if (!hasBoost) {
          return new Response(JSON.stringify({ error: 'Boost not available' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Deduct boost from inventory
        await supabase.rpc('modify_boost_inventory', {
          p_user_id: profileId,
          p_boost_type: boost_type,
          p_change: -1
        });

        // Record boost usage
        await supabase.from('duel_boosts_used').insert({
          duel_id,
          player_id: player.id,
          duel_question_id: duel_question_id || null,
          boost_type
        });

        let boostResult: any = { success: true, boost_type };

        // Apply boost effects
        if (boost_type === 'fifty_fifty' && duel_question_id) {
          const { data: question } = await supabase
            .from('duel_questions')
            .select('question_snapshot, correct_option_ids')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            const correctIds = question.correct_option_ids as string[];
            const incorrectOptions = snapshot.options.filter((opt: any) => !correctIds.includes(opt.id));
            
            // Return 2 random incorrect option IDs to hide
            const shuffled = incorrectOptions.sort(() => Math.random() - 0.5);
            boostResult.hide_options = shuffled.slice(0, 2).map((opt: any) => opt.id);
          }
        } else if (boost_type === 'hint' && duel_question_id) {
          const { data: question } = await supabase
            .from('duel_questions')
            .select('question_snapshot')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            boostResult.hint = snapshot.explanation_es || snapshot.explanation_ru || 'Нет подсказки';
          }
        }

        return new Response(JSON.stringify(boostResult), {
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

          // Update profile using RPC functions
          await supabase.rpc('increment_profile_value', {
            p_profile_id: player.user_id,
            p_column: 'xp',
            p_amount: totalXP
          });

          await supabase.rpc('increment_profile_value', {
            p_profile_id: player.user_id,
            p_column: 'coins',
            p_amount: coins
          });

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
