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

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle([...arr]).slice(0, n);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SmartTestRequest = await req.json();
    const { profile_id, count = 20, category = 'B', country = 'es' } = body;

    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'profile_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createPooledSupabaseClient();

    // country is expected to already be the DB value ('es' or 'russia')
    // Normalize just in case: 'spain' → 'es', 'ru' → 'russia'
    const countryCode = country === 'spain' ? 'es' : country === 'ru' ? 'russia' : country;

    // Fetch all questions for this country
    const { data: allQuestions, error: qErr } = await supabase
      .from('questions_new')
      .select('id, topic_id, difficulty, percent_correct')
      .eq('country', countryCode)
      .not('topic_id', 'is', null);

    if (qErr) throw qErr;
    if (!allQuestions?.length) {
      return new Response(JSON.stringify({ question_ids: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's answer history
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('question_id, is_correct, last_attempt_at, attempts')
      .eq('user_id', profile_id);

    const progressMap = new Map<string, { is_correct: boolean; last_attempt_at: string; attempts: number }>();
    for (const p of (userProgress || [])) {
      progressMap.set(p.question_id, p);
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Categorize questions
    const errorQuestions: string[] = [];      // answered wrong
    const staleQuestions: string[] = [];      // not seen in 7+ days or never seen
    const unseenQuestions: string[] = [];     // never seen
    const progressionQuestions: string[] = []; // seen correctly but medium difficulty

    for (const q of allQuestions) {
      const p = progressMap.get(q.id);

      if (!p) {
        unseenQuestions.push(q.id);
        staleQuestions.push(q.id);
        continue;
      }

      // Wrong answers → error bucket
      if (!p.is_correct) {
        errorQuestions.push(q.id);
      }

      // Not seen in 7+ days → stale bucket
      if (p.last_attempt_at < sevenDaysAgo) {
        staleQuestions.push(q.id);
      }

      // Answered correctly but medium difficulty → progression bucket
      if (p.is_correct && q.difficulty === 'medium') {
        progressionQuestions.push(q.id);
      }
    }

    // Distribution: 40% errors, 30% stale/unseen, 20% progression, 10% random unseen
    const bucket1Count = Math.round(count * 0.40); // weak/errors
    const bucket2Count = Math.round(count * 0.30); // spaced repetition
    const bucket3Count = Math.round(count * 0.20); // progression
    const bucket4Count = count - bucket1Count - bucket2Count - bucket3Count; // random unseen

    const selected = new Set<string>();

    const addFromBucket = (bucket: string[], needed: number) => {
      const candidates = bucket.filter(id => !selected.has(id));
      const picks = pickN(candidates, needed);
      picks.forEach(id => selected.add(id));
      return picks.length;
    };

    // Fill each bucket, fallback to unseen if bucket is too small
    let got = addFromBucket(errorQuestions, bucket1Count);
    if (got < bucket1Count) addFromBucket(unseenQuestions, bucket1Count - got);

    got = addFromBucket(staleQuestions, bucket2Count);
    if (got < bucket2Count) addFromBucket(unseenQuestions, bucket2Count - got);

    addFromBucket(progressionQuestions, bucket3Count);
    addFromBucket(unseenQuestions, Math.max(bucket4Count, count - selected.size));

    // If still not enough, fill from all questions
    if (selected.size < count) {
      const remaining = allQuestions.map(q => q.id).filter(id => !selected.has(id));
      pickN(remaining, count - selected.size).forEach(id => selected.add(id));
    }

    const question_ids = shuffle([...selected]).slice(0, count);

    return new Response(JSON.stringify({ question_ids }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[smart-test-builder]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
