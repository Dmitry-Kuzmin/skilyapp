// ============================================================
// Client for test-manager Edge Function (server-validated tests).
// ============================================================
// Все запросы к test-manager идут через один invoke с разными action.
// Защита от подмены: is_correct приходит только от сервера в ответ на submit_answer.

import { supabase } from '@/integrations/supabase/client';

// ===== Types =====

export type TestMode =
  | 'practice'
  | 'exam'
  | 'exam-russia'
  | 'blitz'
  | 'module'
  | 'mastery'
  | 'marathon'
  | 'pdd-ticket'
  | 'pdd-random'
  | 'pdd-sequential'
  | 'pdd-topic'
  | 'sequential'
  | 'redemption'
  | 'round-retry';

export type TestSessionCountry = 'russia' | 'spain' | 'ru' | 'es' | 'en';

export type AnswerOptionPublic = Readonly<{
  id: string;
  text_ru: string;
  text_es: string | null;
  text_en: string | null;
  position: number;
  // is_correct intentionally absent
}>;

export type TestSessionQuestion = Readonly<{
  test_session_question_id: string;
  question_id: string;
  position: number;
  question_ru: string;
  question_es: string | null;
  question_en: string | null;
  image_url: string | null;
  difficulty: string | null;
  explanation_ru: string | null;
  explanation_es: string | null;
  explanation_en: string | null;
  topic_id: string | null;
  answer_options: AnswerOptionPublic[];
}>;

export type StartSessionResult = {
  success: true;
  session_id: string;
  started_at: string;
  questions: TestSessionQuestion[];
};

export type SubmitAnswerResult = {
  success: true;
  is_correct: boolean;
  already_answered?: boolean;
  /** ID правильного варианта — раскрывается ТОЛЬКО после ответа клиента.
   *  Используется для подсветки правильного ответа в UI без локального is_correct. */
  correct_option_id?: string | null;
  /** Для multi-correct вопросов (теоретическая поддержка) */
  correct_option_ids?: string[];
};

export type CompleteSessionResult = {
  success: true;
  score: number;
  correct_count: number;
  questions_count: number;
  test_duration_seconds: number;
  speed_cheat_detected: boolean;
  already_completed?: boolean;
  reward?: Record<string, unknown> | null;
};

export type TestManagerError = {
  error: string;
  retry_after_seconds?: number;
  details?: string;
  issues?: unknown;
};

// ===== Invoke wrappers =====

async function callTestManager<T>(
  action: 'start_session' | 'submit_answer' | 'complete_session',
  params: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('test-manager', {
    body: { action, params },
  });

  if (error) {
    const msg = error instanceof Error ? error.message : 'test-manager invocation failed';
    throw new Error(`[test-manager:${action}] ${msg}`);
  }

  if (!data || (data as { error?: string }).error) {
    throw new Error(`[test-manager:${action}] ${(data as { error?: string })?.error ?? 'unknown error'}`);
  }

  return data as T;
}

export function startTestSession(params: {
  question_ids: string[];
  mode: TestMode;
  test_id?: string | null;
  country?: TestSessionCountry | null;
  topic_id?: string | null;
}): Promise<StartSessionResult> {
  return callTestManager<StartSessionResult>('start_session', params);
}

export function submitTestAnswer(params: {
  session_id: string;
  test_session_question_id: string;
  selected_option_id: string | null;
  time_taken_ms: number;
  client_reported_correct?: boolean;
  is_skipped?: boolean;
}): Promise<SubmitAnswerResult> {
  return callTestManager<SubmitAnswerResult>('submit_answer', params);
}

export function completeTestSession(params: {
  session_id: string;
  client_correct_count?: number;
  test_duration_seconds?: number;
  premium_flag?: boolean;
  double_sp_active?: boolean;
  effective_question_count?: number;
}): Promise<CompleteSessionResult> {
  return callTestManager<CompleteSessionResult>('complete_session', params);
}
