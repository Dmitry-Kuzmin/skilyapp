
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSpecificQuestion() {
    const textPart = "Запрещается перевозка детей в легковом автомобиле без использования соответствующих детских удерживающих систем";

    console.log(`Searching for question containing: "${textPart}"`);

    // 1. Search in questions_new
    const { data: questions, error } = await supabase
        .from('questions_new')
        .select('id, question_ru, country')
        .ilike('question_ru', `%${textPart}%`);

    if (error) {
        console.error('Error searching questions:', error);
        return;
    }

    if (questions.length === 0) {
        console.log('❌ Question not found in questions_new');
        return;
    }

    console.log(`Found ${questions.length} matching questions.`);

    for (const q of questions) {
        console.log(`\nChecking Question ID: ${q.id} (Country: ${q.country})`);
        console.log(`Text: ${q.question_ru}`);

        // 2. Check answers
        const { data: answers, error: aError } = await supabase
            .from('answer_options')
            .select('*')
            .eq('question_id', q.id);

        if (aError) {
            console.error('Error fetching answers:', aError);
        } else {
            console.log(`✅ Answers found: ${answers.length}`);
            answers.forEach(a => console.log(` - [${a.is_correct ? 'X' : ' '}] ${a.text_ru}`));
        }
    }
}

checkSpecificQuestion();
