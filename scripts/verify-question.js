
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verify() {
    const { data: question } = await supabase
        .from('pdd_russia_questions')
        .select('question_text, correct_answer_text')
        .eq('ticket_number', 1)
        .eq('question_number', 1)
        .single();

    console.log('DB Question:', question.question_text);
    // console.log('DB Correct Answer:', question.correct_answer_text); // Note: correct_answer_text might be the full text or just the key, let's check
}

verify();
