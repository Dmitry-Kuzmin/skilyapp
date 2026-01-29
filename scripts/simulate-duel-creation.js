import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function testDuelCreation() {
    console.log('🧪 Simulating duel question creation...\n');

    // Fetch ONE question with answer_options (same as Edge Function does)
    const { data: questions, error } = await supabase
        .from('questions_new')
        .select(`
            id, question_ru, question_es, question_en, image_url, difficulty,
            answer_options (id, text_ru, text_es, text_en, is_correct, position)
        `)
        .eq('country', 'es')
        .limit(1);

    if (error) {
        console.error('❌ Error fetching questions:', error);
        return;
    }

    if (!questions || questions.length === 0) {
        console.log('❌ No questions found');
        return;
    }

    const q = questions[0];

    console.log('Question fetched:', q.id);
    console.log('Question text:', q.question_ru?.substring(0, 60));
    console.log('\nAnswer options:', q.answer_options);

    if (!q.answer_options || q.answer_options.length === 0) {
        console.log('\n🚨 CRITICAL: answer_options is EMPTY or NULL!');
        console.log('This will result in empty correct_option_ids.');
        return;
    }

    // Simulate what Edge Function does
    const correctOptionIds = (q.answer_options || [])
        .filter(opt => opt.is_correct)
        .map(opt => opt.id);

    console.log('\n✅ Simulated correct_option_ids:', correctOptionIds);

    if (correctOptionIds.length === 0) {
        console.log('🚨 PROBLEM: correct_option_ids is EMPTY!');
    } else {
        console.log('✅ SUCCESS: correct_option_ids contains:', correctOptionIds.length, 'IDs');
    }
}

testDuelCreation();
