
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function debugQuestion() {
    const questionText = "Разрешается ли водителям транспортных средств остановка в указанных местах?";

    console.log(`Searching for question: "${questionText}"`);

    // 1. Check Legacy Table
    const { data: legacyQ, error: lError } = await supabase
        .from('pdd_russia_questions')
        .select('id, ticket_number, question_number')
        .eq('question_text', questionText);

    if (legacyQ && legacyQ.length > 0) {
        console.log('✅ Found in pdd_russia_questions:', legacyQ);

        // Check answers for legacy
        for (const q of legacyQ) {
            const { data: answers, error: aError } = await supabase
                .from('pdd_russia_answers')
                .select('*')
                .eq('question_id', q.id);
            console.log(`   Answers for ${q.id} (Legacy):`, answers?.length || 0);
            if (answers?.length) console.log(answers);
        }
    } else {
        console.log('❌ Not found in pdd_russia_questions');
    }

    // 2. Check Unified Table
    const { data: newQ, error: nError } = await supabase
        .from('questions_new')
        .select('id, metadata')
        .eq('question_ru', questionText)
        .eq('country', 'ru');

    if (newQ && newQ.length > 0) {
        console.log('✅ Found in questions_new:', newQ);

        // Check answers for unified
        for (const q of newQ) {
            const { data: answers, error: aError } = await supabase
                .from('answer_options')
                .select('*')
                .eq('question_id', q.id);
            console.log(`   Answers for ${q.id} (Unified):`, answers?.length || 0);
            // if(answers?.length) console.log(answers);
        }
    } else {
        console.log('❌ Not found in questions_new');
    }
}

debugQuestion();
