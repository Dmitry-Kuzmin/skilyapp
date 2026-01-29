import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ТОЧНО как в Edge Function
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    {
        db: {
            schema: 'public',
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

async function testFetchQuestions() {
    console.log('🧪 Testing EXACT Edge Function query...\n');

    // Step 1: Get IDs (like Edge Function does)
    let query = supabase.from('questions_new').select('id');
    query = query.eq('country', 'es');

    const { data: ids, error: idsError } = await query;

    if (idsError) {
        console.error('❌ Error fetching IDs:', idsError);
        return;
    }

    console.log(`Found ${ids?.length || 0} question IDs`);

    if (!ids || ids.length === 0) {
        console.log('❌ No questions found');
        return;
    }

    // Step 2: Fetch details (like Edge Function does)
    const selectedIds = ids.slice(0, 3).map(x => x.id);

    console.log(`\nFetching details for ${selectedIds.length} questions...`);

    const { data: questions, error: detailsError } = await supabase
        .from('questions_new')
        .select(`
            id, question_ru, question_es, question_en, image_url, difficulty,
            answer_options (id, text_ru, text_es, text_en, is_correct, position)
        `)
        .in('id', selectedIds);

    if (detailsError) {
        console.error('❌ Error fetching details:', detailsError);
        return;
    }

    console.log(`\nReceived ${questions?.length || 0} questions\n`);

    // Step 3: Simulate duel question creation
    if (questions && questions.length > 0) {
        for (const q of questions) {
            console.log(`Question: ${q.id}`);
            console.log(`  answer_options received:`, q.answer_options ? `${q.answer_options.length} answers` : 'NULL or EMPTY');

            if (!q.answer_options || q.answer_options.length === 0) {
                console.log('  🚨 PROBLEM: answer_options is empty!');
            } else {
                const correctIds = q.answer_options.filter(opt => opt.is_correct).map(opt => opt.id);
                console.log(`  ✅ correct_option_ids would be:`, correctIds);
            }
            console.log('');
        }
    }
}

testFetchQuestions();
