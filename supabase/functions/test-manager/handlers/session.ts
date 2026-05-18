// ============================================================
// test-manager → session.ts: startSession
// ============================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import {
  buildQuestionSnapshot,
  checkRateLimit,
  errorResponse,
  extractCorrectOptionIds,
  jsonResponse,
  startTestSessionSchema,
  type QuestionRow,
} from '../../_shared/game-helpers.ts';

type Ctx = {
  supabase: SupabaseClient;
  profileId: string;
  ipHash: string | null;
  params: unknown;
};

export async function handleStartSession({ supabase, profileId, ipHash, params }: Ctx): Promise<Response> {
  // Rate limit: max 10 новых сессий в 60 сек на пользователя
  const rl = await checkRateLimit(supabase, {
    user_id: profileId,
    ip_hash: ipHash,
    action: 'test_start_session',
    limit: 10,
    window_seconds: 60,
  });
  if (!rl.allowed) {
    return errorResponse('Too many requests', 429, { retry_after_seconds: rl.retry_after_seconds });
  }

  const parsed = startTestSessionSchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse('Invalid params', 400, { issues: parsed.error.issues });
  }
  const { test_id, mode, question_ids, country, topic_id } = parsed.data;

  // Cooldown: между завершёнными тестами минимум 10 секунд
  const COOLDOWN_SEC = 10;
  const { data: lastCompleted } = await supabase
    .from('test_sessions')
    .select('completed_at')
    .eq('user_id', profileId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCompleted?.completed_at) {
    const ageMs = Date.now() - new Date(lastCompleted.completed_at).getTime();
    if (ageMs < COOLDOWN_SEC * 1000) {
      return errorResponse('Test cooldown active', 429, {
        retry_after_seconds: Math.ceil((COOLDOWN_SEC * 1000 - ageMs) / 1000),
      });
    }
  }

  // Загружаем вопросы пачкой
  const { data: questions, error: qError } = await supabase
    .from('questions_new')
    .select(`
      id, question_ru, question_es, question_en, image_url, difficulty,
      explanation_ru, explanation_es, explanation_en, topic_id,
      answer_options (
        id, text_ru, text_es, text_en, is_correct, position
      )
    `)
    .in('id', question_ids);

  if (qError || !questions || questions.length === 0) {
    return errorResponse('Failed to load questions', 500, { details: qError?.message });
  }

  if (questions.length !== question_ids.length) {
    return errorResponse('Some question IDs not found', 400, {
      requested: question_ids.length,
      found: questions.length,
    });
  }

  // session_id генерируем на сервере (клиентский UUID не принимаем — снижает поверхность атаки)
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Создаём сессию
  const { error: sessionError } = await supabase
    .from('test_sessions')
    .insert({
      session_id: sessionId,
      user_id: profileId,
      test_id: test_id || null,
      questions_count: questions.length,
      questions_snapshot_count: questions.length,
      mode,
      country: country ?? null,
      topic_id: topic_id ?? null,
      status: 'started',
      started_at: now,
    });

  if (sessionError) {
    return errorResponse('Failed to create session', 500, { details: sessionError.message });
  }

  // Создаём snapshot вопросов в порядке, заданном клиентом (question_ids)
  const orderedQuestions = question_ids
    .map((qid) => questions.find((q) => q.id === qid))
    .filter((q): q is QuestionRow => Boolean(q));

  const insertRows = orderedQuestions.map((q, idx) => ({
    session_id: sessionId,
    question_id: q.id,
    position: idx + 1,
    question_snapshot: buildQuestionSnapshot(q),
    correct_option_ids: extractCorrectOptionIds(q),
  }));

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('test_session_questions')
    .insert(insertRows)
    .select('id, position, question_id, question_snapshot');

  if (insertError) {
    // Откатываем сессию, если snapshot не записался
    await supabase.from('test_sessions').delete().eq('session_id', sessionId);
    return errorResponse('Failed to snapshot questions', 500, { details: insertError.message });
  }

  // Отдаём клиенту: session_id + список вопросов БЕЗ correct_option_ids
  const clientQuestions = (insertedQuestions ?? [])
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      test_session_question_id: q.id,
      question_id: q.question_id,
      position: q.position,
      ...q.question_snapshot,
    }));

  return jsonResponse({
    success: true,
    session_id: sessionId,
    started_at: now,
    questions: clientQuestions,
  });
}
