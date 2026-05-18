// ============================================================
// test-manager → gameplay.ts: submitAnswer + completeSession
// ============================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import {
  checkRateLimit,
  completeTestSessionSchema,
  errorResponse,
  isSpeedCheat,
  jsonResponse,
  submitTestAnswerSchema,
} from '../../_shared/game-helpers.ts';

type Ctx = {
  supabase: SupabaseClient;
  profileId: string;
  ipHash: string | null;
  params: unknown;
};

// ============================================================
// submitAnswer — серверная проверка одного ответа
// ============================================================
export async function handleSubmitAnswer({ supabase, profileId, ipHash, params }: Ctx): Promise<Response> {
  // Rate limit: max 120 ответов в 60 сек (2/сек) — достаточно для самого быстрого пользователя
  const rl = await checkRateLimit(supabase, {
    user_id: profileId,
    ip_hash: ipHash,
    action: 'test_submit_answer',
    limit: 120,
    window_seconds: 60,
  });
  if (!rl.allowed) {
    return errorResponse('Too many requests', 429, { retry_after_seconds: rl.retry_after_seconds });
  }

  const parsed = submitTestAnswerSchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse('Invalid params', 400, { issues: parsed.error.issues });
  }
  const { session_id, test_session_question_id, selected_option_id, time_taken_ms, client_reported_correct, is_skipped } = parsed.data;

  // Параллельно: валидируем сессию + вопрос + проверяем idempotency
  const [sessionRes, questionRes, existingAnswerRes] = await Promise.all([
    supabase.from('test_sessions')
      .select('user_id, status, started_at, completed_at')
      .eq('session_id', session_id)
      .single(),
    supabase.from('test_session_questions')
      .select('id, session_id, correct_option_ids, question_snapshot')
      .eq('id', test_session_question_id)
      .single(),
    supabase.from('test_session_answers')
      .select('id, is_correct, selected_option_id, is_skipped')
      .eq('test_session_question_id', test_session_question_id)
      .maybeSingle(),
  ]);

  if (sessionRes.error || !sessionRes.data) return errorResponse('Session not found', 404);
  if (sessionRes.data.user_id !== profileId) return errorResponse('Forbidden', 403);
  if (sessionRes.data.completed_at) return errorResponse('Session already completed', 409);

  if (questionRes.error || !questionRes.data) return errorResponse('Question not found', 404);
  if (questionRes.data.session_id !== session_id) return errorResponse('Question does not belong to this session', 403);

  // Idempotency — если уже ответили, возвращаем тот же результат
  if (existingAnswerRes.data) {
    return jsonResponse({
      success: true,
      is_correct: existingAnswerRes.data.is_correct,
      already_answered: true,
    });
  }

  // ===== ВАЛИДАЦИЯ ОТВЕТА =====
  const correctIds = Array.isArray(questionRes.data.correct_option_ids)
    ? (questionRes.data.correct_option_ids as string[])
    : [];

  const wasSkipped = Boolean(is_skipped) || !selected_option_id;
  const isCorrect = !wasSkipped && selected_option_id
    ? correctIds.includes(selected_option_id)
    : false;

  // Опционально — если selected_option_id передан, проверим что он реально принадлежит этому вопросу
  if (selected_option_id) {
    const snapshotOptions = (questionRes.data.question_snapshot as { answer_options?: Array<{ id: string }> })?.answer_options ?? [];
    const knownIds = new Set(snapshotOptions.map((o) => o.id));
    if (!knownIds.has(selected_option_id)) {
      return errorResponse('Selected option does not belong to this question', 400);
    }
  }

  // Лог расхождения (если клиент соврал — флагируем, но не реджектим)
  const mismatch = client_reported_correct !== undefined && client_reported_correct !== isCorrect;
  if (mismatch) {
    console.warn('[test-manager][submit_answer] 🚨 Client/server mismatch', {
      user_id: profileId,
      session_id,
      test_session_question_id,
      client: client_reported_correct,
      server: isCorrect,
    });
  }

  const { error: insertError } = await supabase
    .from('test_session_answers')
    .insert({
      session_id,
      user_id: profileId,
      test_session_question_id,
      selected_option_id: selected_option_id ?? null,
      is_correct: isCorrect,
      is_skipped: wasSkipped,
      time_taken_ms,
      client_reported_correct: client_reported_correct ?? null,
    });

  if (insertError) {
    // Дубль (race condition) — возвращаем существующий
    if ((insertError as { code?: string }).code === '23505') {
      const { data: dup } = await supabase
        .from('test_session_answers')
        .select('is_correct')
        .eq('test_session_question_id', test_session_question_id)
        .maybeSingle();
      return jsonResponse({
        success: true,
        is_correct: dup?.is_correct ?? false,
        already_answered: true,
      });
    }
    return errorResponse('Failed to save answer', 500, { details: insertError.message });
  }

  return jsonResponse({
    success: true,
    is_correct: isCorrect,
  });
}

// ============================================================
// completeSession — финализирует сессию, считает score, награды
// ============================================================
export async function handleCompleteSession({ supabase, profileId, ipHash, params }: Ctx): Promise<Response> {
  const rl = await checkRateLimit(supabase, {
    user_id: profileId,
    ip_hash: ipHash,
    action: 'test_complete_session',
    limit: 20,
    window_seconds: 60,
  });
  if (!rl.allowed) {
    return errorResponse('Too many requests', 429, { retry_after_seconds: rl.retry_after_seconds });
  }

  const parsed = completeTestSessionSchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse('Invalid params', 400, { issues: parsed.error.issues });
  }
  const { session_id, client_correct_count, test_duration_seconds, premium_flag, double_sp_active } = parsed.data;

  const { data: session, error: sessionError } = await supabase
    .from('test_sessions')
    .select('*')
    .eq('session_id', session_id)
    .single();

  if (sessionError || !session) return errorResponse('Session not found', 404);
  if (session.user_id !== profileId) return errorResponse('Forbidden', 403);

  // Idempotency
  if (session.completed_at) {
    return jsonResponse({
      success: true,
      already_completed: true,
      score: session.score,
      correct_count: session.correct_count,
      speed_cheat_detected: session.speed_cheat_detected,
    });
  }

  // СЕРВЕРНЫЙ ПОДСЧЁТ из test_session_answers
  const { data: answers, error: answersError } = await supabase
    .from('test_session_answers')
    .select('is_correct, is_skipped, time_taken_ms')
    .eq('session_id', session_id);

  if (answersError) return errorResponse('Failed to fetch answers', 500, { details: answersError.message });

  const correctCount = (answers ?? []).filter((a) => a.is_correct && !a.is_skipped).length;
  const totalQuestions = session.questions_count ?? 0;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Длительность — берём min(client, server)
  const startedAt = new Date(session.started_at).getTime();
  const serverDuration = Math.floor((Date.now() - startedAt) / 1000);
  const durationSec = test_duration_seconds !== undefined
    ? Math.min(test_duration_seconds, serverDuration)
    : serverDuration;

  // Anti speed-cheat
  const speedCheat = isSpeedCheat(durationSec, totalQuestions);

  // ===== Запись результата в сессию =====
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('test_sessions')
    .update({
      score,
      correct_count: correctCount,
      test_duration_seconds: durationSec,
      client_correct_count: client_correct_count ?? null,
      speed_cheat_detected: speedCheat,
      status: 'completed',
      completed_at: now,
      finished_at: now,
    })
    .eq('session_id', session_id);

  if (updateError) return errorResponse('Failed to finalize session', 500, { details: updateError.message });

  // Расхождение клиент/сервер — флаг к ручному ревью
  if (client_correct_count !== undefined && client_correct_count !== correctCount) {
    console.warn('[test-manager][complete_session] 🚨 correct_count mismatch', {
      user_id: profileId,
      session_id,
      client_correct_count,
      server_correct_count: correctCount,
    });
  }

  // ===== Делегируем расчёт SP/coins существующей complete-test-and-award =====
  // Это сохраняет совместимость с текущей системой наград и лидерборда.
  let rewardData: Record<string, unknown> | null = null;
  try {
    const { data, error } = await supabase.functions.invoke('complete-test-and-award', {
      body: {
        user_id: profileId,
        session_id,
        test_id: session.test_id ?? null,
        score,
        questions_count: totalQuestions,
        correct_count: correctCount,
        test_duration_seconds: Math.max(0, durationSec),
        premium_flag: Boolean(premium_flag),
        double_sp_active: Boolean(double_sp_active),
        mode: session.mode,
      },
    });
    if (error) {
      console.error('[test-manager][complete_session] reward error:', error);
    } else if (data) {
      rewardData = data as Record<string, unknown>;
    }
  } catch (err) {
    console.error('[test-manager][complete_session] reward exception:', err);
  }

  return jsonResponse({
    success: true,
    score,
    correct_count: correctCount,
    questions_count: totalQuestions,
    test_duration_seconds: durationSec,
    speed_cheat_detected: speedCheat,
    reward: rewardData,
  });
}
