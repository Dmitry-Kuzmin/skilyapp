// ============================================================
// test-manager — единый Edge Function для серверно-валидированных тестов.
// ============================================================
// Архитектура по образцу duel-manager:
//   - startSession: создаёт сессию + snapshot вопросов (correct_option_ids только на сервере)
//   - submitAnswer: валидирует ответ против correct_option_ids
//   - completeSession: пересчитывает score из test_session_answers, начисляет SP
//
// Клиент НИКОГДА не видит is_correct в чистом виде до момента ответа.
// is_correct в ответе submitAnswer — это серверный вердикт.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders, errorResponse, getProfileId, hashIp, jsonResponse } from '../_shared/game-helpers.ts';
import { handleStartSession } from './handlers/session.ts';
import { handleSubmitAnswer, handleCompleteSession } from './handlers/gameplay.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const profileId = await getProfileId(supabase, authHeader);
    if (!profileId) return errorResponse('Unauthorized', 401);

    const ipHash = hashIp(
      req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    switch (action) {
      case 'start_session':
        return await handleStartSession({ supabase, profileId, ipHash, params: body.params });
      case 'submit_answer':
        return await handleSubmitAnswer({ supabase, profileId, ipHash, params: body.params });
      case 'complete_session':
        return await handleCompleteSession({ supabase, profileId, ipHash, params: body.params });
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[test-manager] ❌ FATAL:', message);
    return jsonResponse({ error: 'Internal server error', details: message }, 500);
  }
});
