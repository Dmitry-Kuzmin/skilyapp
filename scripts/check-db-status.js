import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabase() {
    console.log('🔍 Проверяем состояние базы данных...\n');

    // 1. Общее количество испанских вопросов
    const { count: totalCount } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .eq('country', 'es');

    console.log(`📊 Всего испанских вопросов: ${totalCount}`);

    // 2. Разбивка по темам
    console.log('\n📂 Разбивка по темам:');

    for (let topicNum = 1; topicNum <= 2; topicNum++) {
        const { data: topicQuestions } = await supabase
            .from('questions_new')
            .select('id, metadata')
            .eq('country', 'es')
            .eq('metadata->topic_number', topicNum);

        if (!topicQuestions || topicQuestions.length === 0) {
            console.log(`  Тема ${topicNum}: 0 вопросов`);
            continue;
        }

        // Группируем по тестам
        const byTest = {};
        topicQuestions.forEach(q => {
            const testNum = q.metadata?.test_number || 'unknown';
            byTest[testNum] = (byTest[testNum] || 0) + 1;
        });

        console.log(`  Тема ${topicNum}: ${topicQuestions.length} вопросов`);
        Object.keys(byTest).sort().forEach(testNum => {
            console.log(`    - Тест ${testNum}: ${byTest[testNum]} вопросов`);
        });
    }

    // 3. Проверяем наличие переводов
    console.log('\n🌍 Проверка переводов:');
    const { data: sample } = await supabase
        .from('questions_new')
        .select('question_es, question_ru, question_en, explanation_ru')
        .eq('country', 'es')
        .limit(10);

    const withRU = sample.filter(q => q.question_ru).length;
    const withEN = sample.filter(q => q.question_en).length;
    const withExplanation = sample.filter(q => q.explanation_ru).length;

    console.log(`  Русский перевод вопросов: ${withRU}/10 (в выборке)`);
    console.log(`  Английский перевод вопросов: ${withEN}/10 (в выборке)`);
    console.log(`  Русские объяснения: ${withExplanation}/10 (в выборке)`);

    // 4. Проверяем ответы
    console.log('\n📝 Проверка ответов:');
    const { data: firstQuestion } = await supabase
        .from('questions_new')
        .select('id')
        .eq('country', 'es')
        .limit(1)
        .single();

    if (firstQuestion) {
        const { count: answerCount } = await supabase
            .from('answer_options')
            .select('*', { count: 'exact', head: true })
            .eq('question_id', firstQuestion.id);

        console.log(`  Пример: у первого вопроса ${answerCount} ответов`);
    }

    console.log('\n✅ Проверка завершена\n');
}

checkDatabase().catch(console.error);
