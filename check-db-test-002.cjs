// Quick check script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    // 1. Check questions
    const { data: questions, error: qError } = await supabase
        .from('questions_new')
        .select('id, question_ru, metadata')
        .ilike('metadata->>test_id', '%test-002%')
        .limit(5);

    console.log('\n=== QUESTIONS (first 5) ===');
    if (qError) {
        console.error('Error:', qError);
    } else {
        console.log(`Found ${questions.length} questions for test-002`);
        questions.forEach(q => {
            console.log(`- ${q.id.slice(0, 8)}... : ${q.question_ru.slice(0, 50)}...`);
        });
    }

    // 2. Check if test exists in tests table
    const { data: tests, error: tError } = await supabase
        .from('tests')
        .select('*')
        .ilike('title_ru', '%тест%002%')
        .or('title_ru.ilike.%тест 2%');

    console.log('\n=== TESTS TABLE ===');
    if (tError) {
        console.error('Error:', tError);
    } else {
        console.log(`Found ${tests?.length || 0} matching tests`);
        if (tests && tests.length > 0) {
            tests.forEach(t => console.log(`- ${t.title_ru} (test_number: ${t.test_number})`));
        } else {
            console.log('⚠️ No test record found in tests table!');
        }
    }

    // 3. Check topics
    const { data: topics, error: topicError } = await supabase
        .from('topics')
        .select('id, name_ru')
        .limit(5);

    console.log('\n=== TOPICS (first 5) ===');
    if (topicError) {
        console.error('Error:', topicError);
    } else {
        topics.forEach(t => console.log(`- ${t.id.slice(0, 8)}... : ${t.name_ru}`));
    }
}

check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
