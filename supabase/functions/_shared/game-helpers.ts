// ============================================================
// Shared helpers for game-like Edge Functions (tests, duels, etc.)
// ============================================================
// Zod schemas, CORS, rate limiting, auth — общее место.
// Используется test-manager, потенциально refactor для duel-manager.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ===== CORS =====
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ===== Zod schemas: TEST MANAGER =====
export const startTestSessionSchema = z.object({
  test_id: z.string().uuid().nullable().optional(),
  mode: z.enum([
    'practice', 'exam', 'exam-russia', 'blitz', 'module', 'mastery', 'marathon',
    'pdd-ticket', 'pdd-random', 'pdd-sequential', 'pdd-topic',
    'sequential', 'redemption', 'round-retry',
  ]),
  question_ids: z.array(z.string().uuid()).min(1).max(60),
  country: z.enum(['russia', 'spain', 'ru', 'es', 'en']).nullable().optional(),
  topic_id: z.string().uuid().nullable().optional(),
});

export const submitTestAnswerSchema = z.object({
  session_id: z.string().min(1),
  test_session_question_id: z.string().uuid(),
  selected_option_id: z.string().uuid().nullable().optional(),
  time_taken_ms: z.number().int().min(0).max(600_000), // до 10 минут на вопрос
  client_reported_correct: z.boolean().optional(),
  is_skipped: z.boolean().optional().default(false),
});

export const completeTestSessionSchema = z.object({
  session_id: z.string().min(1),
  client_correct_count: z.number().int().min(0).optional(),
  test_duration_seconds: z.number().int().min(0).max(7200).optional(),
  premium_flag: z.boolean().optional().default(false),
  double_sp_active: z.boolean().optional().default(false),
});

// ===== AUTH =====
export async function getProfileId(
  supabase: SupabaseClient,
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .single();

  return profile?.id ?? null;
}

// ===== RATE LIMITING =====
export type RateLimitResult = {
  allowed: boolean;
  retry_after_seconds?: number;
  current_count?: number;
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  params: {
    user_id?: string | null;
    ip_hash?: string | null;
    action: string;
    limit: number;
    window_seconds: number;
  }
): Promise<RateLimitResult> {
  const { user_id, ip_hash, action, limit, window_seconds } = params;
  if (!user_id && !ip_hash) {
    return { allowed: true };
  }

  const since = new Date(Date.now() - window_seconds * 1000).toISOString();
  let query = supabase
    .from('api_rate_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', action)
    .gt('created_at', since);

  if (user_id) query = query.eq('user_id', user_id);
  else if (ip_hash) query = query.eq('ip_hash', ip_hash);

  const { count } = await query;
  const current = count ?? 0;

  if (current >= limit) {
    return { allowed: false, retry_after_seconds: window_seconds, current_count: current };
  }

  await supabase.from('api_rate_log').insert({
    user_id: user_id ?? null,
    ip_hash: ip_hash ?? null,
    action,
  });

  return { allowed: true, current_count: current + 1 };
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  // Простая нормализация — обрезаем порт, нижний регистр.
  // Полное хеширование (crypto.subtle) добавим позже, если будет нужно скрыть IP из логов.
  return String(ip).split(',')[0].trim().toLowerCase();
}

// ===== TIME-BASED ANTI-CHEAT =====
export const MIN_SECONDS_PER_QUESTION = 5;

export function isSpeedCheat(
  duration_seconds: number,
  questions_count: number
): boolean {
  if (duration_seconds <= 0 || questions_count <= 0) return false;
  return duration_seconds < questions_count * MIN_SECONDS_PER_QUESTION;
}

// ===== SNAPSHOT BUILDER =====
// Снимаем вопрос так, чтобы клиент НЕ видел is_correct.
export type AnswerOptionRow = {
  id: string;
  text_ru: string;
  text_es: string | null;
  text_en: string | null;
  is_correct: boolean;
  position: number;
};

export type QuestionRow = {
  id: string;
  question_ru: string;
  question_es: string | null;
  question_en: string | null;
  image_url: string | null;
  difficulty: string | null;
  explanation_ru: string | null;
  explanation_es: string | null;
  explanation_en: string | null;
  topic_id: string | null;
  answer_options: AnswerOptionRow[];
};

export function buildQuestionSnapshot(q: QuestionRow) {
  return {
    question_ru: q.question_ru,
    question_es: q.question_es,
    question_en: q.question_en,
    image_url: q.image_url,
    difficulty: q.difficulty,
    explanation_ru: q.explanation_ru,
    explanation_es: q.explanation_es,
    explanation_en: q.explanation_en,
    topic_id: q.topic_id,
    answer_options: q.answer_options
      .sort((a, b) => a.position - b.position)
      .map((opt) => ({
        id: opt.id,
        text_ru: opt.text_ru,
        text_es: opt.text_es,
        text_en: opt.text_en,
        position: opt.position,
        // is_correct ИНТЕНЦИОНАЛЬНО НЕ ВКЛЮЧАЕТСЯ
      })),
  };
}

export function extractCorrectOptionIds(q: QuestionRow): string[] {
  return q.answer_options.filter((o) => o.is_correct).map((o) => o.id);
}

// ===== JSON RESPONSE HELPERS =====
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return jsonResponse({ error: message, ...extra }, status);
}
