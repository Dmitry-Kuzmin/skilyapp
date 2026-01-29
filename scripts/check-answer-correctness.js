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
    // Получаем несколько вопросов для проверки
    const { data: questions } = await supabase
        .from('questions_new')
        .select('id, question_ru')
        .limit(3);

    if (!questions || questions.length === 0) {
        console.log('❌ No questions found');
        return;
    }

    console.log(`🔍 Checking ${questions.length} questions...\n`);

    for (const question of questions) {
        console.log(`Question: ${question.question_ru.substring(0, 60)}...`);
        console.log(`ID: ${question.id}\n`);

        // Получаем все ответы
        const { data: answers } = await supabase
            .from('answer_options')
            .select('*')
            .eq('question_id', question.id)
            .order('position');

        if (!answers || answers.length === 0) {
            console.log('  ⚠️  NO ANSWERS FOUND!\n');
            continue;
        }

        console.log(`  Answers (${answers.length} total):`);
        answers.forEach(a => {
            const marker = a.is_correct ? '✅' : '❌';
            console.log(`    ${marker} Pos ${a.position}: ${a.text_ru.substring(0, 40)}...`);
        });

        const correctCount = answers.filter(a => a.is_correct).length;

        if (correctCount === 0) {
            console.log('  🚨 CRITICAL: NO correct answer marked!');
        } else if (correctCount > 1) {
            console.log(`  ⚠️  WARNING: ${correctCount} correct answers (should be 1)`);
        } else {
            console.log('  ✅ OK: Exactly 1 correct answer');
        }

        console.log('');
    }
}

check();
