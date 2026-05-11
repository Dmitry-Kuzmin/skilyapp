import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

// Query handlers
import { handleCheckStatus, handleGetPlayers, handleGetQuestions, handleGetResults, handleGetDuelStatus } from './handlers/query.ts';

// Match handlers
import { handleCreateDuel, handleFindMatch, handleCancelDuel, handleStartDuelNow, handleJoinDuel, handleStartDuel } from './handlers/match.ts';

// Gameplay handlers
import { handleSubmitAnswer, handleBotAnswer, handleFinishDuel } from './handlers/gameplay.ts';

// Boost handlers
import { handleUseBoost, handleBotUseBoost } from './handlers/boosts.ts';

// Session handlers
import { handleHeartbeat, handleUpdateActivityStatus, handleDisconnect, handleAutoFinishOnDisconnect, handleSurrender, handleMarkTechnicalDraw } from './handlers/session.ts';

// Notification handler
import { createNotification } from './lib/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 🛑 RATE LIMITING - защита от DDoS
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 100, // 100 запросов
    windowMs: 60000, // в минуту
  });

  if (!rateLimit.allowed) {
    console.warn('[duel-manager] Rate limit exceeded:', {
      ip: clientIP,
      remaining: rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt).toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    // 🔗 CONNECTION POOLING: Используем pooled клиент (порт 6543)
    // Это критично для масштабирования: Free план выдержит 1000+ пользователей вместо 60
    const supabase = createPooledSupabaseClient();

    console.log('[Duel Manager] 📥 New request received');

    // Проверяем Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Duel Manager] ⚠️ Invalid content-type:', contentType);
      return new Response(JSON.stringify({ error: 'Body must be JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Парсим тело запроса
    let body: any;
    try {
      const text = await req.text();
      if (!text) {
        console.warn('[Duel Manager] ⚠️ Empty body');
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = JSON.parse(text);
    } catch (e) {
      console.error('[Duel Manager] ❌ JSON Parse Error:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, profile_id, ...params } = body;
    console.log('[Duel Manager] 🎯 Action:', action, 'Profile ID from client:', profile_id);

    let profileId: string | null = null;

    // 1. VALIDATE client-provided profile_id
    if (profile_id) {
      const { data: clientProfile, error: clientProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profile_id)
        .maybeSingle();

      if (clientProfile && !clientProfileError) {
        profileId = clientProfile.id;
        console.log('[Duel Manager] ✅ Using validated profile_id from client:', profileId);
      } else {
        console.warn('[Duel Manager] ⚠️ Client provided invalid profile_id:', profile_id, 'Error:', clientProfileError);
      }
    }

    // 2. FALLBACK: Auth lookup (для Telegram и Email пользователей)
    if (!profileId) {
      console.log('[Duel Manager] No valid profile_id from client, attempting auth lookup...');
      const authHeader = req.headers.get('Authorization');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const userToken = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);

        if (user && !authError) {
          console.log('[Duel Manager] 🔐 Authenticated user found:', user.id);

          const { data: authProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (authProfile) {
            profileId = authProfile.id;
            console.log('[Duel Manager] ✅ Profile found via user_id:', profileId);
          } else {
            const telegramId = user.user_metadata?.telegram_id || user.user_metadata?.sub;
            if (telegramId) {
              const { data: tgProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('telegram_id', parseInt(telegramId))
                .maybeSingle();
              if (tgProfile) {
                profileId = tgProfile.id;
                console.log('[Duel Manager] ✅ Profile found via telegram_id:', profileId);
              }
            }
          }
        } else {
          console.error('[Duel Manager] ❌ Auth error:', authError?.message || 'unknown');
        }
      } else {
        console.warn('[Duel Manager] ⚠️ No valid Authorization header for auth lookup');
      }
    }

    // 3. Если профиль не найден — 404
    if (!profileId) {
      console.error('[Duel Manager] ❌ Profile not found after all attempts');
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 🛡️ SECURITY: Селективный Rate Limiting для тяжелых операций
    const heavyActions = ['create_duel', 'join_duel', 'find_match'];
    if (heavyActions.includes(action) && profileId) {
      const actionRateLimit = await checkRateLimit({
        identifier: `${profileId}:${action}`,
        limit: 10,
        windowMs: 60000,
      });

      if (!actionRateLimit.allowed) {
        console.warn(`[duel-manager] Action rate limit exceeded:`, { action, profileId });
        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Слишком много попыток. Пожалуйста, подождите немного.',
            action,
            resetAt: new Date(actionRateLimit.resetAt).toISOString(),
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((actionRateLimit.resetAt - Date.now()) / 1000)),
            },
          }
        );
      }
    }

    // 🚦 ROUTING
    switch (action) {
      // Notifications
      case 'create_notification':
        return await createNotification(params, profileId, supabase);

      // Query
      case 'check_status':
        return await handleCheckStatus(params, profileId, supabase);
      case 'get_players':
        return await handleGetPlayers(params, profileId, supabase);
      case 'get_questions':
        return await handleGetQuestions(params, profileId, supabase);
      case 'get_results':
        return await handleGetResults(params, profileId, supabase);
      case 'get_duel_status':
        return await handleGetDuelStatus(params, profileId, supabase);

      // Match
      case 'create_duel':
        return await handleCreateDuel(params, profileId, supabase);
      case 'find_match':
        return await handleFindMatch(params, profileId, supabase);
      case 'cancel_duel':
        return await handleCancelDuel(params, profileId, supabase);
      case 'start_duel_now':
        return await handleStartDuelNow(params, profileId, supabase);
      case 'join_duel':
        return await handleJoinDuel(params, profileId, supabase);
      case 'start_duel':
        return await handleStartDuel(params, profileId, supabase);

      // Gameplay
      case 'submit_answer':
        return await handleSubmitAnswer(params, profileId, supabase);
      case 'bot_answer':
        return await handleBotAnswer(params, profileId, supabase);
      case 'finish_duel':
        return await handleFinishDuel(params, profileId, supabase);

      // Boosts
      case 'use_boost':
        return await handleUseBoost(params, profileId, supabase);
      case 'bot_use_boost':
        return await handleBotUseBoost(params, profileId, supabase);

      // Session
      case 'heartbeat':
        return await handleHeartbeat(params, profileId, supabase);
      case 'update_activity_status':
        return await handleUpdateActivityStatus(params, profileId, supabase);
      case 'handle_disconnect':
        return await handleDisconnect(params, profileId, supabase);
      case 'auto_finish_on_opponent_disconnect':
        return await handleAutoFinishOnDisconnect(params, profileId, supabase);
      case 'surrender':
        return await handleSurrender(params, profileId, supabase);
      case 'mark_technical_draw':
        return await handleMarkTechnicalDraw(params, profileId, supabase);

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('[Duel Manager] Error:', error);
    return new Response(JSON.stringify({ error: (error as any).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
