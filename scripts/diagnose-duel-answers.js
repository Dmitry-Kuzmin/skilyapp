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

async function check() {
    console.log('🔍 Checking most recent duel question...\n');

    // Получаем последний активный дуэль
    const { data: duel } = await supabase
        .from('duels')
        .select('id, status')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!duel) {
        console.log('❌ No duels found');
        return;
    }

    console.log(`Duel ID: ${duel.id}`);
    console.log(`Status: ${duel.status}\n`);

    // Получаем первый вопрос из этого дуэля
    const { data: duelQuestion } = await supabase
        .from('duel_questions')
        .select('*')
        .eq('duel_id', duel.id)
        .order('position')
        .limit(1)
        .single();

    if (!duelQuestion) {
        console.log('❌ No questions in this duel');
        return;
    }

    console.log(`Question ID: ${duelQuestion.question_id}`);
    console.log(`Position: ${duelQuestion.position}`);
    console.log(`Correct Option IDs from duel_questions:`, duelQuestion.correct_option_ids);
    console.log('');

    // Получаем РЕАЛЬНЫЕ ответы из answer_options
    const { data: realAnswers } = await supabase
        .from('answer_options')
        .select('*')
        .eq('question_id', duelQuestion.question_id)
        .order('position');

    if (!realAnswers || realAnswers.length === 0) {
        console.log('⚠️  NO ANSWERS IN answer_options!');
        return;
    }

    console.log('Real answers from answer_options:');
    realAnswers.forEach(a => {
        const marker = a.is_correct ? '✅' : '❌';
        console.log(`  ${marker} ${a.id} (Pos ${a.position}): ${a.text_ru?.substring(0, 40)}...`);
    });
    console.log('');

    const correctAnswer = realAnswers.find(a => a.is_correct);

    if (!correctAnswer) {
        console.log('🚨 CRITICAL: No correct answer!');
        return;
    }

    const storedCorrectIds = duelQuestion.correct_option_ids || [];
    const isMatch = storedCorrectIds.includes(correctAnswer.id);

    console.log(`Expected correct ID: ${correctAnswer.id}`);
    console.log(`Stored in duel_questions: ${JSON.stringify(storedCorrectIds)}`);
    console.log('');

    if (isMatch) {
        console.log('✅ MATCH: Stored IDs are correct');
    } else {
        console.log('🚨 MISMATCH: The correct answer ID is NOT in duel_questions.correct_option_ids!');
        console.log('   This is why all answers show as wrong.');
    }
}

check();
