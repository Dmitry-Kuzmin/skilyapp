import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { mulberry32, fisherYatesShuffle } from '../../_shared/duel-helpers.ts';

/** Получить запись игрока в дуэли по userId */
export async function getPlayer(supabase: SupabaseClient, duelId: string, userId: string) {
  const { data, error } = await supabase
    .from('duel_players')
    .select('*')
    .eq('duel_id', duelId)
    .eq('user_id', userId)
    .single();
  return { data, error };
}

/** Получить дуэль по ID */
export async function getDuel(supabase: SupabaseClient, duelId: string) {
  const { data, error } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();
  return { data, error };
}

/** Подсчитать количество ответов игрока в дуэли */
export async function countPlayerAnswers(supabase: SupabaseClient, playerId: string, duelId: string): Promise<number> {
  const { count } = await supabase
    .from('duel_answers')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('duel_id', duelId);
  return count || 0;
}

/** Получить всех игроков дуэли */
export async function getPlayersByDuel(supabase: SupabaseClient, duelId: string) {
  const { data, error } = await supabase
    .from('duel_players')
    .select('id, user_id, score, correct_count, is_bot, bot_name, name')
    .eq('duel_id', duelId);
  return { data, error };
}

// Helper to fetch random questions efficiently (avoiding SELECT * on large table and RPC issues)
export async function fetchRandomQuestions(
  supabase: SupabaseClient,
  count: number,
  country: string,
  seed: number,
  categories: string[] | null | undefined,
  difficulty: string | null | undefined,
  licenseCategory: string = 'A_B'
) {
  const t1 = Date.now();
  let query = supabase.from('questions_new').select('id');

  // Map country: 'russia'/'ru' -> 'ru', 'spain'/'es' -> 'es', others -> 'es'
  let countryCode = 'es';
  let internalLicenseCategory = licenseCategory;

  const c = country ? country.toLowerCase().trim() : 'spain';

  if (c === 'russia' || c === 'ru') {
    countryCode = 'ru';
  } else if (c === 'ru_cd') {
    countryCode = 'ru';
    internalLicenseCategory = 'C_D';
  } else if (c === 'spain' || c === 'es') {
    countryCode = 'es';
  } else {
    countryCode = c;
  }

  query = query.eq('country', countryCode);

  // License Category Filtering (Russia only)
  if (countryCode === 'ru') {
    if (internalLicenseCategory === 'C_D') {
      query = query.contains('metadata', { ticket_category: 'C_D' });
    } else {
      // A_B (Default): metadata does NOT contain ticket_category: C_D
      query = query.not('metadata', 'cs', '{"ticket_category": "C_D"}');
    }
  }

  if (difficulty && difficulty !== 'mix') {
    query = query.eq('difficulty', difficulty);
  }

  const { data: ids, error: idsError } = await query;

  if (idsError) {
    console.error('[fetchRandomQuestions] Error fetching IDs:', idsError);
    throw idsError;
  }

  if (!ids || ids.length === 0) return [];

  console.log(`[fetchRandomQuestions] Found ${ids.length} potential questions for country = ${countryCode}, diff = ${difficulty}, cat = ${licenseCategory} `);
  const t2 = Date.now();
  console.log(`[fetchRandomQuestions] ⏱️ ID fetch took ${t2 - t1} ms`);

  // Shuffle IDs
  const rng = mulberry32(seed);
  const shuffledIds = fisherYatesShuffle(ids.map((x: any) => x.id), rng);
  const selectedIds = shuffledIds.slice(0, count);

  console.log(`[fetchRandomQuestions] Selected ${selectedIds.length} IDs`);
  const t3 = Date.now();
  console.log(`[fetchRandomQuestions] ⏱️ Shuffle took ${t3 - t2} ms`);

  // Fetch details with options
  const { data: questions, error: detailsError } = await supabase
    .from('questions_new')
    .select(`
      id, question_ru, question_es, question_en, image_url, difficulty,
      answer_options(id, text_ru, text_es, text_en, is_correct, position)
    `)
    .in('id', selectedIds);

  const t4 = Date.now();
  console.log(`[fetchRandomQuestions] ⏱️ Details fetch took ${t4 - t3} ms`);
  console.log(`[fetchRandomQuestions] ⏱️ Total fetch time ${t4 - t1} ms`);

  if (detailsError) {
    console.error('[fetchRandomQuestions] Error fetching details:', detailsError);
    throw detailsError;
  }

  // Restore order from selectedIds (important for seed consistency)
  const questionsMap = new Map((questions || []).map((q: any) => [q.id, q]));
  return selectedIds.map(id => questionsMap.get(id)).filter(q => !!q);
}
