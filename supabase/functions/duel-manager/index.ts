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
  combo: number,
  isFasterThanOpponent: boolean = false
): number {
  // Base points for correct answer
  let points = 100;

  // Difficulty multiplier
  if (difficulty === 'hard') {
    points *= 1.5;
  } else if (difficulty === 'easy') {
    points *= 0.8;
  }

  // Speed bonus if faster than opponent by 5+ seconds
  if (isFasterThanOpponent) {
    points += 10;
  }

  // Combo bonus - every 3 correct answers in a row
  if (combo > 0 && combo % 3 === 0) {
    points += 20;
  }

  // Time bonus (up to 30% bonus for fast answers)
  const timeBonus = Math.floor((timeRemainMs / timeTotalMs) * 30);
  points += timeBonus;

  return Math.floor(points);
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

// Helper function to create notifications
async function createNotification(body: any, profileId: string, supabase: any) {
  const { duel_id, type, title, message, icon } = body;

  console.log('[create_notification] Creating notification for duel:', duel_id);

  try {
    // Get opponent's profile_id
    const { data: players } = await supabase
      .from('duel_players')
      .select('user_id')
      .eq('duel_id', duel_id);

    if (!players || players.length < 2) {
      return new Response(JSON.stringify({ error: 'Not enough players' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const opponentId = players.find((p: any) => p.user_id !== profileId)?.user_id;
    
    if (!opponentId) {
      return new Response(JSON.stringify({ error: 'Opponent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create notification
    const { error: notifError } = await supabase
      .from('duel_notifications')
      .insert({
        user_id: opponentId,
        duel_id,
        type,
        title,
        message,
        icon,
        is_read: false
      });

    if (notifError) {
      console.error('[create_notification] Error:', notifError);
      return new Response(JSON.stringify({ error: notifError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[create_notification] Notification created successfully');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[create_notification] Exception:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { action, ...params } = await req.json();

    console.log('[Duel Manager] Action:', action);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Duel Manager] No authorization header');
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[Duel Manager] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Duel Manager] User authenticated:', user.id);

    // Get profile from user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('[Duel Manager] Profile not found for user:', user.id);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileId = profile.id;
    console.log('[Duel Manager] Profile found:', profileId);

    switch (action) {
      case 'create_notification':
        return await createNotification(params, profileId, supabase);
      case 'check_status': {
        const { duel_id } = params;
        
        console.log('[Duel Manager] Checking status for duel:', duel_id, 'Profile:', profileId);
        
        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('id, status, started_at, host_user')
          .eq('id', duel_id)
          .maybeSingle();

        if (duelError) {
          console.error('[Duel Manager] Error checking duel:', duelError);
          throw duelError;
        }

        if (!duel) {
          console.warn('[Duel Manager] Duel not found');
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[Duel Manager] Duel status:', duel.status);
        
        return new Response(JSON.stringify({ 
          status: duel.status,
          started_at: duel.started_at
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_questions': {
        const { duel_id } = params;
        
        console.log('[Duel Manager] Getting questions for duel:', duel_id);
        
        const { data: questions, error: questionsError } = await supabase
          .from('duel_questions')
          .select('*')
          .eq('duel_id', duel_id)
          .order('position');

        if (questionsError) {
          console.error('[Duel Manager] Error getting questions:', questionsError);
          throw questionsError;
        }

        console.log('[Duel Manager] Found', questions?.length || 0, 'questions');
        
        return new Response(JSON.stringify({ questions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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

        // Add host as player using correct user_id (which is profile.id)
        const { error: playerError } = await supabase.from('duel_players').insert({
          duel_id: duel.id,
          user_id: profileId,  // This is profile.id
          is_host: true,
        });

        if (playerError) {
          console.error('[Duel Manager] Error adding host player:', playerError);
          throw playerError;
        }

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

        console.log('[Duel Manager] Adding player to duel. ProfileId:', profileId);

        // Add player to duel using correct user_id (which is profile.id)
        const { data: player, error: playerError } = await supabase
          .from('duel_players')
          .insert({
            duel_id: duel.id,
            user_id: profileId,  // This is profile.id
            is_host: false,
          })
          .select()
          .single();

        if (playerError) {
          console.error('[Duel Manager] Error adding player:', playerError);
          throw playerError;
        }

        // Check if we now have 2 players - auto-start duel
        const { data: allPlayers } = await supabase
          .from('duel_players')
          .select('id')
          .eq('duel_id', duel.id);

        if (allPlayers && allPlayers.length === 2) {
          // Auto-start: Load ALL questions, then randomly select
          const { data: allQuestions } = await supabase
            .from('questions_new')
            .select(`
              id, question_ru, question_es, question_en, image_url, difficulty,
              explanation_ru, explanation_es, explanation_en,
              answer_options(id, text_ru, text_es, text_en, is_correct, position)
            `);

          if (!allQuestions || allQuestions.length === 0) {
            throw new Error('No questions found');
          }

          console.log(`[join_duel] Total questions: ${allQuestions.length}`);

          // Randomize selection from full pool using seed
          const rng = mulberry32(duel.question_seed);
          const shuffled = [...allQuestions].sort(() => rng() - 0.5);
          const selectedQuestions = shuffled.slice(0, duel.num_questions);
          
          console.log(`[join_duel] Selected ${selectedQuestions.length} random questions`);

          // Insert duel questions with randomly selected set
          const duelQuestions = selectedQuestions.map((q, idx) => {
            const answerOptions = q.answer_options || [];
            const snapshot = {
              question_ru: q.question_ru,
              question_es: q.question_es,
              question_en: q.question_en,
              explanation_ru: q.explanation_ru,
              explanation_es: q.explanation_es,
              explanation_en: q.explanation_en,
              image_url: q.image_url,
              options: answerOptions, // Changed from answer_options to options
              difficulty: q.difficulty,
            };
            
            return {
              duel_id: duel.id,
              question_id: q.id,
              position: idx + 1,
              question_snapshot: snapshot,
              correct_option_ids: answerOptions
                .filter((opt: any) => opt.is_correct)
                .map((opt: any) => opt.id),
            };
          });

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
            explanation_ru: q.explanation_ru,
            explanation_es: q.explanation_es,
            explanation_en: q.explanation_en,
            image_url: q.image_url,
            options: options || [], // Changed from answer_options to options
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

        // Check if faster than opponent on the same question
        const { data: opponentAnswer } = await supabase
          .from('duel_answers')
          .select('time_taken_ms')
          .eq('duel_id', duel_id)
          .eq('duel_question_id', duel_question_id)
          .neq('player_id', player.id)
          .maybeSingle();

        const isFasterThanOpponent = opponentAnswer 
          ? adjustedTime < (opponentAnswer.time_taken_ms - 5000)
          : false;

        const difficulty = (question.question_snapshot as any).difficulty || 'medium';
        const points = isCorrect ? calculateScore(difficulty, timeRemain, timeLimit, combo, isFasterThanOpponent) : 0;

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
          boost_type,
          duel_question_id: duel_question_id || null,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'finish_duel': {
        const { duel_id } = params;
        
        console.log('[finish_duel] Player finishing duel:', duel_id, 'profile:', profileId);

        // Get duel data
        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('finished_by_players, host_user, status, num_questions')
          .eq('id', duel_id)
          .single();

        if (duelError) throw duelError;

        // Add current player to finished_by_players
        const finishedPlayers = duel.finished_by_players || [];
        if (!finishedPlayers.includes(profileId)) {
          finishedPlayers.push(profileId);
        }

        // Determine if this player is host
        const isHost = duel.host_user === profileId;
        const finishedAtField = isHost ? 'user_a_finished_at' : 'user_b_finished_at';

        // Update duel with player finish time
        await supabase
          .from('duels')
          .update({
            finished_by_players: finishedPlayers,
            [finishedAtField]: new Date().toISOString(),
          })
          .eq('id', duel_id);

        console.log('[finish_duel] Updated finished_by_players:', finishedPlayers.length);

        // If both players finished, calculate winner
        if (finishedPlayers.length === 2) {
          console.log('[finish_duel] Both players finished, determining winner...');

          const { data: allPlayers } = await supabase
            .from('duel_players')
            .select('*')
            .eq('duel_id', duel_id)
            .order('score', { ascending: false });

          if (!allPlayers || allPlayers.length < 2) {
            throw new Error('Not enough players to finish duel');
          }

          const winner = allPlayers[0];
          const isDraw = allPlayers[0].score === allPlayers[1].score;

          // Update duel with final results
          await supabase
            .from('duels')
            .update({
              status: 'finished',
              winner_id: isDraw ? null : winner.user_id,
              finished_at: new Date().toISOString(),
            })
            .eq('id', duel_id);

          // Update stats for both players
          // Update stats and rewards for both players
          for (const p of allPlayers) {
            if (!p.user_id || p.is_bot) continue;
            
            const isWin = !isDraw && p.id === winner.id;
            const isPerfect = p.correct_count === duel.num_questions;
            
            // Update duel stats
            await supabase.rpc('upsert_duel_stats', {
              p_user_id: p.user_id,
              p_is_win: isWin,
              p_is_draw: isDraw,
              p_score: p.score,
            });
            
            // Calculate rewards
            let coinsReward = isWin ? 15 : (isDraw ? 8 : 3);
            let xpReward = isWin ? 30 : (isDraw ? 15 : 5);
            
            // Perfect game bonuses
            if (isPerfect) {
              coinsReward += 10;
              xpReward += 20;
            }
            
            // Update coins
            await supabase.rpc('increment_profile_value', {
              p_profile_id: p.user_id,
              p_column: 'coins',
              p_amount: coinsReward,
            });
            
            // Update XP
            await supabase.rpc('increment_profile_value', {
              p_profile_id: p.user_id,
              p_column: 'xp',
              p_amount: xpReward,
            });
            
            // 20% chance for random boost on win
            if (isWin && Math.random() < 0.2) {
              const boostTypes = ['fifty_fifty', 'time_extend', 'hint', 'skip'];
              const randomBoost = boostTypes[Math.floor(Math.random() * boostTypes.length)];
              await supabase.rpc('modify_boost_inventory', {
                p_user_id: p.user_id,
                p_boost_type: randomBoost,
                p_change: 1,
              });
            }
            
            // Guaranteed boost for perfect game
            if (isPerfect) {
              await supabase.rpc('modify_boost_inventory', {
                p_user_id: p.user_id,
                p_boost_type: 'time_extend',
                p_change: 1,
              });
            }
          }

          // Send finish notifications with reward info
          for (const p of allPlayers) {
            if (!p.user_id) continue;
            
            const isWinner = !isDraw && p.id === winner.id;
            const isPerfect = p.correct_count === duel.num_questions;
            const coinsEarned = (isWinner ? 15 : (isDraw ? 8 : 3)) + (isPerfect ? 10 : 0);
            const xpEarned = (isWinner ? 30 : (isDraw ? 15 : 5)) + (isPerfect ? 20 : 0);
            
            await supabase.from('duel_notifications').insert({
              user_id: p.user_id,
              duel_id,
              type: 'finish',
              title: isWinner ? '🏆 Победа!' : (isDraw ? '🤝 Ничья!' : '😔 Поражение'),
              message: `Счёт: ${allPlayers[0].score} - ${allPlayers[1].score}. Награды: ${coinsEarned} монет, ${xpEarned} XP${isPerfect ? ' + бустер!' : ''}`,
              icon: isWinner ? '🎉' : (isDraw ? '🤝' : '⚔️'),
              metadata: {
                winner_id: isDraw ? null : winner.user_id,
                rewards: { coins: coinsEarned, xp: xpEarned, isPerfect }
              }
            });
          }

          console.log('[finish_duel] Duel finished, winner:', isDraw ? 'Draw' : winner.user_id);

          return new Response(JSON.stringify({ 
            waiting: false,
            finished: true,
            winner_id: isDraw ? null : winner.user_id,
            is_draw: isDraw,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Only one player finished, show waiting screen
          console.log('[finish_duel] Waiting for opponent to finish...');
          
          return new Response(JSON.stringify({ 
            waiting: true,
            finished: false,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
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
    console.error('[Duel Manager] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
