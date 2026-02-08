
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testFetchRandomQuestions() {
    console.log('Testing fetchRandomQuestions logic...');

    // 1. Get a random ID from questions_new (Russia)
    const { data: ids } = await supabase
        .from('questions_new')
        .select('id')
        .eq('country', 'ru')
        .limit(1);

    if (!ids?.length) {
        console.log('No questions found');
        return;
    }

    const id = ids[0].id;
    console.log('Testing with ID:', id);

    // 2. Fetch details exactly like the Edge Function does
    const { data: questions, error } = await supabase
        .from('questions_new')
        .select(`
      id, question_ru, question_es, question_en, image_url, difficulty,
      answer_options (id, text_ru, text_es, text_en, is_correct, position)
    `)
        .eq('id', id);

    if (error) {
        console.error('Error fetching details:', error);
        return;
    }

    const q = questions[0];
    console.log('Question:', q.question_ru);
    console.log('Answer Options Count:', q.answer_options?.length);

    if (q.answer_options?.length) {
        console.log('First Answer:', q.answer_options[0]);
    } else {
        console.log('❌ NO ANSWERS FOUND IN FETCH RESULT');
    }
}

testFetchRandomQuestions();
