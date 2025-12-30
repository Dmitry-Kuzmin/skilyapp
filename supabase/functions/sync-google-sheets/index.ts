import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else { current += char; }
  }
  result.push(current.trim());
  return result;
}

interface QuestionRow {
  source_id: string | null;
  topic_number: number;
  difficulty?: string;
  is_premium?: string;
  type?: string;
  image_url?: string;
  sign_code?: string;
  source?: string;
  question_ru?: string;
  question_es?: string;
  question_en?: string;
  explanation_ru?: string;
  explanation_es?: string;
  explanation_en?: string;
  tags?: string;
  [key: string]: string | number | undefined | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createPooledSupabaseClient();
    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const syncType = body.syncType || 'all';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    const sheetsId = Deno.env.get('GOOGLE_SHEETS_ID');
    if (!sheetsId) throw new Error('GOOGLE_SHEETS_ID not configured');

    console.log(`[sync] Starting sync: ${syncType}`);

    // Topics Sync (Base)
    const topicsCsv = await (await fetch(`https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Topics`)).text();
    const topicsRows = topicsCsv.split('\n').slice(1).filter(r => r.trim());

    for (const row of topicsRows) {
      const cols = parseCSVRow(row);
      if (!cols[0]) continue;
      await supabase.from('topics').upsert({
        number: parseInt(cols[0]),
        title_ru: cols[1],
        title_es: cols[2],
        title_en: cols[3],
        cover_image: cols[4] || null,
        is_premium: cols[5] === 'TRUE',
        gradient_from: cols[6] || '#00BFFF',
        gradient_to: cols[7] || '#39FF14'
      }, { onConflict: 'number' });
    }

    const { data: topics } = await supabase.from('topics').select('id, number');
    const topicMap = new Map(topics?.map(t => [t.number, t.id]) || []);

    let qProcessed = 0;
    if (syncType === 'all' || syncType === 'questions') {
      const qCsv = await (await fetch(`https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Questions`)).text();
      const qRows = qCsv.split('\n').slice(1).filter(r => r.trim());

      for (const row of qRows) {
        const cols = parseCSVRow(row);
        const source_id = cols[0]?.trim();
        if (!source_id) continue;

        const topicId = topicMap.get(parseInt(cols[1]));
        if (!topicId) continue;

        const { data: q } = await supabase.from('questions_new').upsert({
          source_id,
          topic_id: topicId,
          difficulty: cols[2]?.toLowerCase() || 'medium',
          is_premium: cols[3] === 'TRUE',
          question_ru: cols[8],
          question_es: cols[9],
          question_en: cols[10],
          explanation_ru: cols[11] || null,
          image_url: cols[5] || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'source_id' }).select('id').single();

        if (q) {
          await supabase.from('answer_options').delete().eq('question_id', q.id);
          const answers = [];
          for (let i = 0; i < 4; i++) {
            const base = 15 + (i * 4);
            if (cols[base]) {
              answers.push({
                question_id: q.id,
                text_ru: cols[base],
                text_es: cols[base + 1],
                text_en: cols[base + 2],
                is_correct: cols[base + 3] === 'TRUE',
                position: i + 1
              });
            }
          }
          if (answers.length) await supabase.from('answer_options').insert(answers);
        }
        qProcessed++;
      }
    }

    return new Response(JSON.stringify({ success: true, questions: qProcessed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    console.error('[sync] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: corsHeaders });
  }
});
