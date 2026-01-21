
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Используем Service Role если есть, иначе Anon (но для select count должно хватить и anon, если RLS позволяет)
// Лучше Service Role для чистоты эксперимента.
const clientKey = serviceRoleKey || supabaseKey;

if (!supabaseUrl || !clientKey) {
    console.error('❌ Missing Supabase credentials in .env or .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, clientKey);

async function checkTopicCounts() {
    console.log('🔍 Checking questions count per topic in Supabase...');

    // 1. Сначала узнаем ID темы "Alumbrado"
    const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, name, order_index')
        .ilike('name', '%Alumbrado%'); // Ищем по названию, так надежнее

    if (topicsError) {
        console.error('❌ Error fetching topics:', topicsError);
        return;
    }

    if (!topics || topics.length === 0) {
        console.error('❌ Topic "Alumbrado" not found in DB!');
        console.log('   Listing ALL topics to help you find the right one:');
        const { data: allTopics } = await supabase.from('topics').select('id, name, order_index').order('order_index');
        console.table(allTopics);
        return;
    }

    console.log(`✅ Found topic(s) matching "Alumbrado":`);
    console.table(topics);

    const targetTopicId = topics[0].id; // Берем первый найденный

    // 2. Считаем вопросы для этого topic_id
    console.log(`\n📊 Counting questions for Topic ID: ${targetTopicId} (${topics[0].name})...`);

    const { count, error: countError } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', targetTopicId);

    if (countError) {
        console.error('❌ Error counting questions:', countError);
    } else {
        console.log(`\n🔢 Total questions in DB for this topic: **${count}**`);
    }

    // 3. Проверим разбивку по тестам внутри этой темы (если есть поле test_id или metadata)
    // Обычно вопросы привязаны к теме, но не всегда жестко к "тесту" (test object). 
    // Но давай попробуем сгруппировать, если получится. 
    // В questions_new часто нет явного test_id, но есть external_id, где зашит номер теста.

    console.log('\n🕵️‍♂️ Analyzing external_ids to find Source Tests...');
    const { data: questions, error: qError } = await supabase
        .from('questions_new')
        .select('external_id')
        .eq('topic_id', targetTopicId)
        .limit(1000);

    if (qError) {
        console.error('❌ Error fetching question details:', qError);
    } else {
        // Парсим external_id (обычно формата: topic-04_test-001_UUID)
        const testCounts = {};
        let unknownFormat = 0;

        questions.forEach(q => {
            // Пытаемся извлечь test-XXX
            const match = q.external_id?.match(/(test-\d{3})/);
            if (match) {
                const testKey = match[1];
                testCounts[testKey] = (testCounts[testKey] || 0) + 1;
            } else {
                unknownFormat++;
            }
        });

        console.log('📦 Breakdown by Test (from external_id):');
        console.table(testCounts);
        if (unknownFormat > 0) console.log(`⚠️ Questions with unknown ID format: ${unknownFormat}`);

        // 4. Проверяем deployed_tests таблицу (если она есть)
        console.log('\n📚 Checking "tests" table for deployed records...');
        const { data: deployedTests } = await supabase
            .from('tests')
            .select('*')
            .eq('topic_id', targetTopicId);

        if (deployedTests && deployedTests.length > 0) {
            console.table(deployedTests.map(t => ({ id: t.id, external_id: t.external_id, is_active: t.is_active })));
        } else {
            console.log('❌ No records found in "tests" table for this topic.');
        }
    }
}

checkTopicCounts();
