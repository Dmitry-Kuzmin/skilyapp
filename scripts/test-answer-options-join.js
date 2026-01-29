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

async function test() {
    console.log('🧪 Testing question + answer_options fetch...\n');

    // Получаем любой вопрос
    const { data: question, error } = await supabase
        .from('questions_new')
        .select(`
            id, question_ru,
            answer_options (id, text_ru, is_correct, position)
        `)
        .limit(1)
        .single();

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log('Question:', question.id);
    console.log('Question text:', question.question_ru?.substring(0, 60));
    console.log('\nAnswer options returned:', question.answer_options);

    if (!question.answer_options || question.answer_options.length === 0) {
        console.log('\n🚨 PROBLEM: answer_options are NOT being fetched!');
        console.log('This is why correct_option_ids is empty.');

        // Try direct query
        console.log('\n🔍 Trying direct query to answer_options...');
        const { data: directAnswers } = await supabase
            .from('answer_options')
            .select('*')
            .eq('question_id', question.id);

        console.log('Direct query result:', directAnswers?.length || 0, 'answers');

        if (directAnswers && directAnswers.length > 0) {
            console.log('✅ Answers exist, but JOIN is not working!');
            console.log('This might be an RLS or relationship issue.');
        }
    } else {
        console.log('\n✅ Answer options fetched successfully!');
        question.answer_options.forEach(a => {
            console.log(`  ${a.is_correct ? '✅' : '❌'} ${a.id}`);
        });
    }
}

test();
