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

// Fisher-Yates shuffle for better randomization
function fisherYatesShuffle<T>(array: T[], rng: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

// Notification templates with emotional, engaging texts
const notificationTemplates: Record<string, (metadata: any) => { title: string; message: string; icon: string }> = {
  // Start notifications
  'start': (metadata: any) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    const templates = [
      { title: `🔥 ${opponentName} принял твой вызов!`, message: 'Дуэль начинается прямо сейчас.', icon: '🔥' },
      { title: '⚔️ Матч стартовал', message: 'Кто победит, решат секунды.', icon: '⚔️' },
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  },

  // Progress notifications
  'progress': (metadata: any) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    if (metadata.combo && metadata.combo >= 3) {
      return {
        title: `💡 ${opponentName} ответил правильно ${metadata.combo} раза подряд!`,
        message: 'Отличная серия! Продолжайте бороться!',
        icon: '💡'
      };
    } else if (metadata.is_correct === false) {
      return {
        title: `❌ ${opponentName} ошибся`,
        message: 'Твой шанс догнать!',
        icon: '❌'
      };
    } else if (metadata.progress) {
      return {
        title: `🚀 ${opponentName} прошёл ${metadata.progress}% теста!`,
        message: 'Игра набирает обороты!',
        icon: '🚀'
      };
    } else if (metadata.time_diff && metadata.time_diff > 0) {
      return {
        title: `🐢 Ты опережаешь соперника на ${metadata.time_diff} секунд!`,
        message: 'Продолжай в том же духе!',
        icon: '🐢'
      };
    } else if (metadata.is_tied) {
      return {
        title: '🔥 Игра идёт вровень',
        message: 'Кто ответит первым, тот победит!',
        icon: '🔥'
      };
    } else {
      return {
        title: `✅ ${opponentName} ответил правильно!`,
        message: 'Продолжайте бороться!',
        icon: '✅'
      };
    }
  },

  // Boost notifications
  'boost': (metadata: any) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    const boostNames: Record<string, string> = {
      'fifty_fifty': '50/50',
      'time_extend': 'Дополнительное время',
      'hint': 'Подсказка',
      'skip': 'Пропуск'
    };
    const boostIcons: Record<string, string> = {
      'fifty_fifty': '⚡',
      'time_extend': '⏱️',
      'hint': '💡',
      'skip': '🌀'
    };
    const boostType = metadata.boost_type || 'unknown';
    const boostName = boostNames[boostType] || boostType;
    const icon = boostIcons[boostType] || '⚡';

    return {
      title: `${icon} ${opponentName} использовал бустер '${boostName}'!`,
      message: boostType === 'fifty_fifty' ? 'Осторожно!' : boostType === 'skip' ? 'Не сдаётся!' : 'Используй свои бустеры!',
      icon
    };
  },

  // Finish notifications
  'finish': (metadata: any) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    const correctAnswers = metadata.correct_answers || 0;
    
    if (metadata.is_winner === false) {
      return {
        title: `🏁 ${opponentName} закончил игру`,
        message: `С ${correctAnswers} правильными ответами! Результаты готовы.`,
        icon: '🏁'
      };
    } else if (metadata.is_last_question) {
      return {
        title: '🎯 Победа близка',
        message: 'Остался один вопрос!',
        icon: '🎯'
      };
    } else {
      return {
        title: '🥇 Результаты готовы!',
        message: 'Проверь, кто выиграл дуэль.',
        icon: '🥇'
      };
    }
  },

  // Reminder notifications
  'reminder': (metadata: any) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    
    if (metadata.is_waiting) {
      return {
        title: `⏰ Дуэль с ${opponentName} ждёт твоего ответа`,
        message: 'Не забудь завершить игру!',
        icon: '⏰'
      };
    } else if (metadata.is_timeout_warning) {
      return {
        title: '📢 Время почти вышло',
        message: 'Завершай дуэль!',
        icon: '📢'
      };
    } else {
      return {
        title: `💤 ${opponentName} ещё не закончил игру`,
        message: 'Напомни ему!',
        icon: '💤'
      };
    }
  },

  // Timeout notifications
  'timeout': (metadata: any) => {
    return {
      title: '⏰ Время истекло',
      message: 'Дуэль завершена по таймауту.',
      icon: '⏰'
    };
  },

  // Opponent ahead/behind (legacy support)
  'opponent_ahead': (metadata: any) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    return {
      title: `⚡ ${opponentName} опережает тебя`,
      message: 'Ускорься, чтобы догнать!',
      icon: '⚡'
    };
  },

  'opponent_behind': (metadata: any) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    return {
      title: `🐢 Ты опережаешь ${opponentName}`,
      message: 'Продолжай в том же духе!',
      icon: '🐢'
    };
  },
};

// Helper function to get opponent name from profile
async function getOpponentName(opponentId: string, supabase: any): Promise<string> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, username')
      .eq('id', opponentId)
      .single();

    if (profile) {
      return profile.first_name || profile.username || 'Соперник';
    }
  } catch (error) {
    console.error('[getOpponentName] Error:', error);
  }
  return 'Соперник';
}

// Helper function to create notifications with templates
// Returns true if successful, throws error if failed
async function createNotification(body: any, profileId: string, supabase: any, returnResponse: boolean = false): Promise<boolean | Response> {
  const { duel_id, type, title, message, icon, metadata = {} } = body;

  console.log('[create_notification] Creating notification for duel:', duel_id, 'type:', type, 'profileId:', profileId);

  try {
    // Get opponent's profile_id
    const { data: players, error: playersError } = await supabase
      .from('duel_players')
      .select('user_id')
      .eq('duel_id', duel_id);

    if (playersError) {
      console.error('[create_notification] Error getting players:', playersError);
      if (returnResponse) {
        return new Response(JSON.stringify({ error: playersError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(playersError.message);
    }

    if (!players || players.length < 2) {
      console.warn('[create_notification] Not enough players:', players?.length || 0);
      if (returnResponse) {
        return new Response(JSON.stringify({ error: 'Not enough players' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return false; // Silently fail if not enough players (duel might not be ready)
    }

    const opponentId = players.find((p: any) => p.user_id !== profileId)?.user_id;
    
    if (!opponentId) {
      console.warn('[create_notification] Opponent not found. Players:', players, 'profileId:', profileId);
      if (returnResponse) {
        return new Response(JSON.stringify({ error: 'Opponent not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return false; // Silently fail if opponent not found
    }

    console.log('[create_notification] Opponent found:', opponentId, 'All players:', JSON.stringify(players.map((p: any) => ({ user_id: p.user_id }))));

    // Get opponent name if not provided in metadata
    if (!metadata.opponent_name) {
      metadata.opponent_name = await getOpponentName(opponentId, supabase);
      console.log('[create_notification] Opponent name:', metadata.opponent_name);
    }

    // Use template if title/message/icon are not provided
    let finalTitle = title;
    let finalMessage = message;
    let finalIcon = icon;

    if (!title || !message || !icon) {
      const template = notificationTemplates[type];
      if (template) {
        const templateResult = template(metadata);
        finalTitle = finalTitle || templateResult.title;
        finalMessage = finalMessage || templateResult.message;
        finalIcon = finalIcon || templateResult.icon;
      } else {
        // Fallback if template not found
        finalTitle = finalTitle || `Уведомление ${type}`;
        finalMessage = finalMessage || 'Новое уведомление';
        finalIcon = finalIcon || '🔔';
      }
    }

    console.log('[create_notification] Final notification:', { title: finalTitle, message: finalMessage, icon: finalIcon });

    // Create notification
    console.log('[create_notification] Inserting notification:', {
      user_id: opponentId,
      duel_id,
      type,
      title: finalTitle,
      message: finalMessage,
      icon: finalIcon
    });
    
    const { data: insertedNotification, error: notifError } = await supabase
      .from('duel_notifications')
      .insert({
        user_id: opponentId,
        duel_id,
        type,
        title: finalTitle,
        message: finalMessage,
        icon: finalIcon,
        metadata,
        is_read: false
      })
      .select()
      .single();

    if (notifError) {
      console.error('[create_notification] Error inserting notification:', notifError);
      console.error('[create_notification] Error details:', JSON.stringify(notifError));
      if (returnResponse) {
        return new Response(JSON.stringify({ error: notifError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(notifError.message);
    }

    console.log('[create_notification] Notification created successfully:', { 
      id: insertedNotification?.id,
      type, 
      title: finalTitle, 
      opponentId,
      user_id: insertedNotification?.user_id,
      duel_id: insertedNotification?.duel_id
    });
    if (returnResponse) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return true;
  } catch (error: any) {
    console.error('[create_notification] Exception:', error);
    if (returnResponse) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw error;
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
      case 'create_notification':
        return await createNotification(params, profileId, supabase, true);
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

        // Generate more random seed using timestamp + random
        const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);

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
              answer_options(id, text_ru, text_es, text_en, is_correct, position)
            `);

          if (!allQuestions || allQuestions.length === 0) {
            throw new Error('No questions found');
          }

          console.log(`[join_duel] Total questions: ${allQuestions.length}`);

          // Smart randomization: Fisher-Yates shuffle for better distribution
          // Use seed for reproducible randomness (same seed = same questions for both players)
          const rng = mulberry32(duel.question_seed);
          const shuffled = fisherYatesShuffle(allQuestions, rng);
          const selectedQuestions = shuffled.slice(0, duel.num_questions);
          
          console.log(`[join_duel] Selected ${selectedQuestions.length} random questions using seed ${duel.question_seed}`);

          // Insert duel questions with randomly selected set
          const duelQuestions = selectedQuestions.map((q, idx) => {
            const snapshot = {
              question_ru: q.question_ru,
              question_es: q.question_es,
              question_en: q.question_en,
              image_url: q.image_url,
              answer_options: q.answer_options || [],
              difficulty: q.difficulty,
            };
            
            return {
              duel_id: duel.id,
              question_id: q.id,
              position: idx + 1,
              question_snapshot: snapshot,
              correct_option_ids: (q.answer_options || [])
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

          // Create start notification for host (first player)
          const notifResult = await createNotification({
            duel_id: duel.id,
            type: 'start',
            metadata: {}
          }, profileId, supabase).catch(err => {
            console.error('[join_duel] Error creating start notification:', err);
            return false;
          });
          if (!notifResult) {
            console.warn('[join_duel] Failed to create start notification');
          }

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

        // Smart randomization: Fisher-Yates shuffle for better distribution
        const shuffled = fisherYatesShuffle(allQuestions, rng);
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
            answer_options: options || [],
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

        // Create start notification for opponent (second player)
        const notifResult = await createNotification({
          duel_id: duel.id,
          type: 'start',
          metadata: {}
        }, profileId, supabase).catch(err => {
          console.error('[start_duel] Error creating start notification:', err);
          return false;
        });
        if (!notifResult) {
          console.warn('[start_duel] Failed to create start notification');
        }

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

        // Calculate combo - count consecutive correct answers (NOT skipped, NOT incorrect)
        // Get all answers for this player in this duel, ordered by creation time DESC (newest first)
        const { data: allAnswers } = await supabase
          .from('duel_answers')
          .select('is_correct, is_skipped, created_at')
          .eq('player_id', player.id)
          .eq('duel_id', duel_id)
          .order('created_at', { ascending: false });

        let combo = 0;
        if (allAnswers && allAnswers.length > 0) {
          // Count consecutive correct answers from the most recent backwards
          // Stop counting when we hit an incorrect answer OR a skipped answer
          for (const answer of allAnswers) {
            // Only count if answer is correct AND not skipped
            if (answer.is_correct === true && answer.is_skipped === false) {
              combo++;
            } else {
              // Stop counting when we hit an incorrect or skipped answer
              // This breaks the combo chain
              break;
            }
          }
        }
        
        console.log('[submit_answer] Combo calculation:', {
          totalAnswers: allAnswers?.length || 0,
          comboBeforeCurrent: combo,
          isCorrect,
          isSkipped,
          selected_option_id
        });
        
        // Combo is now the number of consecutive correct answers BEFORE this one
        // We'll use this combo for calculating points for the current answer
        // After inserting, if current answer is correct, return combo + 1, else return 0

        // Adjust time for latency
        const adjustedTime = Math.max(0, time_taken_ms - (latency_ms || 0));
        const timeLimit = 60000; // 60 seconds
        const timeRemain = Math.max(0, timeLimit - adjustedTime);

        const difficulty = (question.question_snapshot as any).difficulty || 'medium';
        // Use combo BEFORE current answer for scoring
        // If current answer is correct, combo will be used, if incorrect/skipped, points = 0
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
        const newScore = player.score + points;
        await supabase
          .from('duel_players')
          .update({
            score: newScore,
            correct_count: player.correct_count + (isCorrect ? 1 : 0),
          })
          .eq('id', player.id);

        // ============================================================================
        // CRITICAL: SERVER IS SOURCE OF TRUTH FOR SCORES
        // ============================================================================
        // Always return new_score from server - client MUST use this value
        // Never let client calculate scores locally
        // ============================================================================

        // Return combo AFTER processing this answer
        // CRITICAL: Combo MUST reset to 0 if current answer is incorrect or skipped
        // If current answer is correct and not skipped, combo increases by 1
        // If current answer is incorrect or skipped, combo resets to 0 (not continue from previous)
        let finalCombo = 0;
        if (isCorrect === true && isSkipped === false) {
          // Current answer is correct and not skipped - increment combo
          finalCombo = combo + 1;
        } else {
          // Current answer is incorrect OR skipped - combo resets to 0
          finalCombo = 0;
        }
        
        console.log('[submit_answer] Final combo:', {
          comboBefore: combo,
          isCorrect,
          isSkipped,
          finalCombo
        });

        // Create progress notification for opponent
        // Always notify about opponent's answer (not just at milestones)
        if (!isSkipped) {
          console.log('[submit_answer] Creating progress notification for opponent');
          
          const { data: duel } = await supabase
            .from('duels')
            .select('num_questions')
            .eq('id', duel_id)
            .single();
          
          const { data: allPlayerAnswers } = await supabase
            .from('duel_answers')
            .select('id')
            .eq('player_id', player.id)
            .eq('duel_id', duel_id);
          
          const progress = duel ? Math.round(((allPlayerAnswers?.length || 0) / duel.num_questions) * 100) : 0;
          
          // Always notify about progress, but include progress percentage only at milestones
          const notifResult = await createNotification({
            duel_id,
            type: 'progress',
            metadata: {
              is_correct: isCorrect,
              combo: finalCombo >= 3 ? finalCombo : undefined, // Notify about combo only if >= 3
              progress: progress >= 25 && progress % 25 === 0 ? progress : undefined, // Notify at 25%, 50%, 75%
            }
          }, profileId, supabase).catch(err => {
            console.error('[submit_answer] Error creating progress notification:', err);
            return false;
          });
          
          if (!notifResult) {
            console.warn('[submit_answer] Failed to create progress notification - opponent might not be found yet');
          } else {
            console.log('[submit_answer] ✅ Progress notification created successfully');
          }
        }

        return new Response(JSON.stringify({ 
          is_correct: isCorrect, 
          points_awarded: points,
          new_score: newScore,
          combo: finalCombo,
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

        // ============================================================================
        // CRITICAL: SERVER-SIDE BOOST LOGIC
        // ============================================================================
        // All boost effects MUST be calculated on server and returned to client
        // Client only displays the effects, never calculates them locally
        // ============================================================================
        
        let boostEffect: any = { success: true };

        if (boost_type === 'fifty_fifty' && duel_question_id) {
          // Get question to find incorrect options
          const { data: question } = await supabase
            .from('duel_questions')
            .select('correct_option_ids, question_snapshot')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            const allOptions = snapshot.answer_options || [];
            const correctIds = question.correct_option_ids as string[];
            
            // Find incorrect options
            const incorrectOptions = allOptions
              .filter((opt: any) => !correctIds.includes(opt.id))
              .map((opt: any) => opt.id);
            
            // Hide exactly 2 incorrect options (or all if less than 2)
            const toHide = incorrectOptions.slice(0, Math.min(2, incorrectOptions.length));
            
            boostEffect.hidden_options = toHide;
            console.log('[use_boost] 50/50 hiding options:', toHide);
          }
        } else if (boost_type === 'time_extend') {
          // Server confirms time extension of +30 seconds
          boostEffect.time_added_ms = 30000;
          console.log('[use_boost] Time extended by 30s');
        } else if (boost_type === 'hint' && duel_question_id) {
          // Get question explanation
          const { data: question } = await supabase
            .from('duel_questions')
            .select('question_snapshot')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            // Return explanation in Russian (can be localized based on user preference)
            const hint = snapshot.explanation_ru || snapshot.explanation_es || snapshot.explanation_en || 'Подсказка недоступна';
            boostEffect.hint = hint;
            console.log('[use_boost] Hint provided');
          }
        } else if (boost_type === 'skip') {
          // Skip is handled client-side, just confirm
          boostEffect.skip_confirmed = true;
          console.log('[use_boost] Skip confirmed');
        }

        // Create boost notification for opponent
        const notifResult = await createNotification({
          duel_id,
          type: 'boost',
          metadata: {
            boost_type,
          }
        }, profileId, supabase).catch(err => {
          console.error('[use_boost] Error creating boost notification:', err);
          return false;
        });
        if (!notifResult) {
          console.warn('[use_boost] Failed to create boost notification');
        }

        return new Response(JSON.stringify(boostEffect), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'finish_duel': {
        // Get profile_id from params or use the one from request body
        const { duel_id } = params;
        const profile_id = params.profile_id || profileId;

        // Get duel info
        const { data: duel } = await supabase
          .from('duels')
          .select('status, num_questions, started_at, expires_at')
          .eq('id', duel_id)
          .single();

        if (!duel) {
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if already finished
        if (duel.status === 'finished') {
          return new Response(JSON.stringify({ message: 'Already finished', finished: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current player
        const { data: currentPlayer } = await supabase
          .from('duel_players')
          .select('id, user_id')
          .eq('duel_id', duel_id)
          .eq('user_id', profile_id)
          .single();

        if (!currentPlayer) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Count how many questions this player has answered
        const { count: answeredCount } = await supabase
          .from('duel_answers')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', currentPlayer.id)
          .eq('duel_id', duel_id);

        console.log('[finish_duel] Player finished:', {
          playerId: currentPlayer.id,
          answeredCount,
          totalQuestions: duel.num_questions
        });

        // Check if all players have finished
        const { data: allPlayers } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count')
          .eq('duel_id', duel_id);

        if (!allPlayers || allPlayers.length < 2) {
          return new Response(JSON.stringify({ error: 'Not enough players' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Small delay to ensure current player's last answer is fully committed
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check if both players finished by counting their answers
        // IMPORTANT: Count answers AFTER current player's last answer is saved
        let allPlayersFinished = true;
        const playerAnswerCounts: { [playerId: string]: number } = {};
        
        // Count answers for each player - verify ALL players have answered ALL questions
        for (const player of allPlayers) {
          const { count: playerAnswers } = await supabase
            .from('duel_answers')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', player.id)
            .eq('duel_id', duel_id);

          const answerCount = playerAnswers || 0;
          playerAnswerCounts[player.id] = answerCount;

          console.log('[finish_duel] Player answer count:', {
            playerId: player.id,
            userId: player.user_id,
            answerCount,
            required: duel.num_questions,
            hasFinished: answerCount >= duel.num_questions
          });

          // CRITICAL: ALL players must have answered ALL questions
          if (answerCount < duel.num_questions) {
            allPlayersFinished = false;
            console.log('[finish_duel] Player has not finished:', {
              playerId: player.id,
              answers: answerCount,
              required: duel.num_questions
            });
          }
        }

        console.log('[finish_duel] All players finished check:', {
          allPlayersFinished,
          playerAnswerCounts,
          requiredAnswers: duel.num_questions,
          currentPlayerId: currentPlayer.id
        });

        // Check timeout (10 minutes after start or 15 minutes total)
        const now = new Date();
        const startedAt = duel.started_at ? new Date(duel.started_at) : null;
        const expiresAt = duel.expires_at ? new Date(duel.expires_at) : null;
        const timeoutMs = 10 * 60 * 1000; // 10 minutes
        const isTimeout = startedAt && (now.getTime() - startedAt.getTime() > timeoutMs) || 
                         (expiresAt && now > expiresAt);

        console.log('[finish_duel] Status check:', {
          allPlayersFinished,
          isTimeout,
          startedAt: startedAt?.toISOString(),
          expiresAt: expiresAt?.toISOString()
        });

        // Only finish duel if both players finished OR timeout occurred
        if (allPlayersFinished || isTimeout) {
          // Calculate final scores and determine winner
          const playersWithScores = await Promise.all(allPlayers.map(async (player) => {
            const { count: playerAnswers } = await supabase
              .from('duel_answers')
              .select('*', { count: 'exact', head: true })
              .eq('player_id', player.id)
              .eq('duel_id', duel_id);

            return {
              ...player,
              answersCount: playerAnswers || 0
            };
          }));

          // Sort by score (descending)
          playersWithScores.sort((a, b) => b.score - a.score);
          const isDraw = playersWithScores[0].score === playersWithScores[1].score;
          const winnerId = isDraw ? null : playersWithScores[0].id;

          // Update duel status to finished
          await supabase
            .from('duels')
            .update({
              status: 'finished',
              finished_at: new Date().toISOString(),
            })
            .eq('id', duel_id);

          // Update stats for both players
          for (const player of playersWithScores) {
            const isWin = player.id === winnerId;
            await supabase.rpc('upsert_duel_stats', {
              p_user_id: player.user_id,
              p_is_win: isWin && !isDraw,
              p_is_draw: isDraw,
              p_score: player.score
            });
          }

          console.log('[finish_duel] Duel finished:', {
            winnerId,
            isDraw,
            reason: allPlayersFinished ? 'both_finished' : 'timeout'
          });

          // Create finish notification for opponent
          const opponentPlayer = playersWithScores.find((p: any) => p.user_id !== profile_id);
          if (opponentPlayer) {
            const notifResult = await createNotification({
              duel_id,
              type: 'finish',
              metadata: {
                is_winner: opponentPlayer.id === winnerId,
                correct_answers: opponentPlayer.correct_count || 0,
                is_last_question: false,
              }
            }, profile_id, supabase).catch(err => {
              console.error('[finish_duel] Error creating finish notification:', err);
              return false;
            });
            if (!notifResult) {
              console.warn('[finish_duel] Failed to create finish notification');
            }
          }

          return new Response(JSON.stringify({ 
            success: true, 
            finished: true,
            reason: allPlayersFinished ? 'both_finished' : 'timeout'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Not all players finished yet - just acknowledge this player finished
          console.log('[finish_duel] Player finished, waiting for opponent');
          
          // Create finish notification for opponent (first player finished)
          const opponentPlayer = allPlayers.find((p: any) => p.user_id !== profile_id);
          const currentPlayerData = allPlayers.find((p: any) => p.user_id === profile_id);
          if (opponentPlayer && currentPlayerData) {
            const notifResult = await createNotification({
              duel_id,
              type: 'finish',
              metadata: {
                is_winner: false,
                correct_answers: currentPlayerData.correct_count || 0,
                is_last_question: false,
              }
            }, profile_id, supabase).catch(err => {
              console.error('[finish_duel] Error creating finish notification:', err);
              return false;
            });
            if (!notifResult) {
              console.warn('[finish_duel] Failed to create finish notification');
            }
          }
          
          return new Response(JSON.stringify({ 
            success: true, 
            finished: false,
            message: 'Waiting for opponent to finish'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
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
