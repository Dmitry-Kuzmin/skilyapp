import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTopicTests() {
    console.log('🔍 Ищем темы Topic 1 и Topic 2 в таблице topics...\n');

    // Найдем UUID тем по названию или номеру
    const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, title_ru, order_num')
        .eq('country', 'es')
        .in('order_num', [1, 2]);

    if (topicsError || !topics || topics.length === 0) {
        console.error('❌ Не найдены темы Topic 1-2:', topicsError);
        console.log('\nПопробуем найти ВСЕ испанские темы:');
        const { data: allTopics } = await supabase
            .from('topics')
            .select('id, title_ru, order_num')
            .eq('country', 'es')
            .order('order_num');
        console.log(allTopics);
        return;
    }

    console.log(`✅ Найдено тем: ${topics.length}`);
    topics.forEach(t => console.log(`  - ${t.title_ru} (order: ${t.order_num}, id: ${t.id})`));

    // Создаем тесты для каждой темы
    const tests = [];

    topics.forEach(topic => {
        // Тест 1
        tests.push({
            topic_id: topic.id,
            title_ru: 'Билет 1',
            title_es: 'Test 1',
            title_en: 'Test 1',
            question_count: 30,
            min_pass_percent: 80,
            is_skip_test: false
        });

        // Тест 2
        tests.push({
            topic_id: topic.id,
            title_ru: 'Билет 2',
            title_es: 'Test 2',
            title_en: 'Test 2',
            question_count: 30,
            min_pass_percent: 80,
            is_skip_test: false
        });
    });

    console.log(`\n📤 Создаем ${tests.length} тестов...`);

    const { data, error } = await supabase
        .from('topic_tests')
        .insert(tests)
        .select();

    if (error) {
        console.error('❌ Ошибка:', error);
    } else {
        console.log(`✅ Создано ${data?.length || 0} тестов`);
        data?.forEach(test => {
            console.log(`  - ${test.title_ru}: ${test.question_count} вопросов`);
        });
    }
}

createTopicTests().catch(console.error);
