// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartTestRequest {
  profile_id: string;
  count?: number;
  category?: string;
  country?: string;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SmartTestRequest = await req.json();
    const { profile_id, count = 20, country = 'es' } = body;

    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'profile_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createPooledSupabaseClient();
    const countryCode = country === 'spain' ? 'es' : country === 'ru' ? 'russia' : country;

    // Premium gating
    const { data: profile } = await supabase
      .from('profiles')
      .select('premium_until, trial_until')
      .eq('id', profile_id)
      .single();
    const nowIso = new Date().toISOString();
    const hasPremium =
      (profile?.premium_until && profile.premium_until > nowIso) ||
      (profile?.trial_until && profile.trial_until > nowIso);

    // All eligible questions for this country
    let qQuery = supabase
      .from('questions_new')
      .select('id, topic_id, difficulty, percent_correct')
      .eq('country', countryCode)
      .not('topic_id', 'is', null);
    if (!hasPremium) qQuery = qQuery.eq('is_premium', false);
    const { data: allQuestions, error: qErr } = await qQuery;
    if (qErr) throw qErr;
    if (!allQuestions?.length) {
      return new Response(JSON.stringify({ question_ids: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    type QMeta = { id: string; topic_id: string | null; difficulty: string | null; percent_correct: number | null };
    const qById = new Map<string, QMeta>();
    for (const q of allQuestions as QMeta[]) qById.set(q.id, q);

    // User's SR state
    const { data: progressRows } = await supabase
      .from('user_progress')
      .select('question_id, is_correct, attempts, correct_count, wrong_count, last_attempt_at, next_review_at, repetitions')
      .eq('user_id', profile_id);

    type Progress = {
      question_id: string;
      is_correct: boolean;
      attempts: number | null;
      correct_count: number | null;
      wrong_count: number | null;
      last_attempt_at: string | null;
      next_review_at: string | null;
      repetitions: number | null;
    };
    const progressMap = new Map<string, Progress>();
    for (const p of (progressRows || []) as Progress[]) progressMap.set(p.question_id, p);

    // ---- Per-topic weakness ----
    const topicStats = new Map<string, { wrong: number; total: number }>();
    for (const p of progressMap.values()) {
      const meta = qById.get(p.question_id);
      if (!meta?.topic_id) continue;
      const s = topicStats.get(meta.topic_id) || { wrong: 0, total: 0 };
      const w = p.wrong_count || 0;
      const c = p.correct_count || 0;
      s.wrong += w;
      s.total += w + c;
      topicStats.set(meta.topic_id, s);
    }
    const weakTopics = new Set<string>(
      [...topicStats.entries()]
        .filter(([, s]) => s.total >= 3)
        .map(([t, s]) => [t, s.wrong / s.total] as [string, number])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .filter(([, ratio]) => ratio > 0.3)
        .map(([t]) => t)
    );

    const nowMs = Date.now();
    const DAY_MS = 86_400_000;

    // ---- Bucket A: due reviews (have progress + next_review_at <= now) ----
    type Scored = { id: string; score: number; topic_id: string | null };
    const dueScored: Scored[] = [];
    for (const p of progressMap.values()) {
      const meta = qById.get(p.question_id);
      if (!meta) continue; // question filtered out (premium/country)
      const due = p.next_review_at ? new Date(p.next_review_at).getTime() : nowMs;
      if (due > nowMs) continue;

      const attempts = Math.max(1, p.attempts || 0);
      const wrongRatio = (p.wrong_count || 0) / attempts;
      const overdueDays = Math.max(0, (nowMs - due) / DAY_MS);
      const overdueFactor = Math.min(5, Math.log1p(overdueDays));
      const weakTopicBoost = meta.topic_id && weakTopics.has(meta.topic_id) ? 1 : 0;
      const globalHardness = meta.percent_correct != null
        ? Math.max(0, 1 - meta.percent_correct / 100)
        : 0.3;

      const score =
        wrongRatio * 3 +
        overdueFactor * 0.5 +
        weakTopicBoost +
        globalHardness * 0.5;

      dueScored.push({ id: meta.id, score, topic_id: meta.topic_id });
    }
    dueScored.sort((a, b) => b.score - a.score);

    // ---- Bucket B: unseen in weak topics ----
    const seenIds = new Set<string>(progressMap.keys());
    const weakTopicUnseen: Scored[] = [];
    if (weakTopics.size > 0) {
      for (const q of allQuestions as QMeta[]) {
        if (seenIds.has(q.id)) continue;
        if (!q.topic_id || !weakTopics.has(q.topic_id)) continue;
        const hardness = q.percent_correct != null ? 1 - q.percent_correct / 100 : 0.3;
        weakTopicUnseen.push({ id: q.id, score: hardness, topic_id: q.topic_id });
      }
      shuffle(weakTopicUnseen);
    }

    // ---- Bucket C: fresh unseen with topic diversity ----
    const freshByTopic = new Map<string, string[]>();
    for (const q of allQuestions as QMeta[]) {
      if (seenIds.has(q.id)) continue;
      if (q.topic_id && weakTopics.has(q.topic_id)) continue; // already in B
      const key = q.topic_id || '__none__';
      const arr = freshByTopic.get(key) || [];
      arr.push(q.id);
      freshByTopic.set(key, arr);
    }
    for (const arr of freshByTopic.values()) shuffle(arr);
    // Round-robin across topics for diversity
    const freshDiverse: string[] = [];
    {
      const topicKeys = shuffle([...freshByTopic.keys()]);
      let idx = 0;
      while (freshDiverse.length < count * 2 && topicKeys.length > 0) {
        const key = topicKeys[idx % topicKeys.length];
        const arr = freshByTopic.get(key)!;
        const next = arr.shift();
        if (next) freshDiverse.push(next);
        if (!arr.length) {
          topicKeys.splice(idx % topicKeys.length, 1);
          if (topicKeys.length === 0) break;
          continue;
        }
        idx++;
      }
    }

    // ---- Adaptive distribution ----
    const hasHistory = progressMap.size >= 5;
    let dueQuota: number, weakQuota: number, freshQuota: number;

    if (!hasHistory) {
      // Cold start: all fresh, diverse
      dueQuota = 0;
      weakQuota = 0;
      freshQuota = count;
    } else {
      // Cap due at 50% even if many are due — keep variety
      dueQuota = Math.min(dueScored.length, Math.round(count * 0.5));
      weakQuota = Math.min(weakTopicUnseen.length, Math.round(count * 0.3));
      freshQuota = count - dueQuota - weakQuota;
      // If due bucket is small, redistribute slack to fresh
      if (dueQuota < Math.round(count * 0.5)) {
        freshQuota = count - dueQuota - weakQuota;
      }
    }

    const selected: string[] = [];
    const taken = new Set<string>();
    const take = (id: string) => {
      if (!taken.has(id)) {
        taken.add(id);
        selected.push(id);
      }
    };

    for (let i = 0; i < dueQuota && i < dueScored.length; i++) take(dueScored[i].id);
    for (let i = 0; i < weakQuota && i < weakTopicUnseen.length; i++) take(weakTopicUnseen[i].id);
    for (let i = 0; selected.length < dueQuota + weakQuota + freshQuota && i < freshDiverse.length; i++) take(freshDiverse[i]);

    // Backfill if anything short (e.g. premium pool exhausted)
    if (selected.length < count) {
      const fallback = shuffle((allQuestions as QMeta[]).map(q => q.id).filter(id => !taken.has(id)));
      for (const id of fallback) {
        if (selected.length >= count) break;
        take(id);
      }
    }

    // Mild shuffle of final order so due questions aren't all at front
    const finalIds = shuffle(selected.slice(0, count));

    return new Response(
      JSON.stringify({
        question_ids: finalIds,
        meta: {
          total_pool: allQuestions.length,
          due_available: dueScored.length,
          weak_topics: [...weakTopics],
          cold_start: !hasHistory,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[smart-test-builder]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
