import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRussiaQuestions() {
    console.log('🔍 Checking Russia questions metadata...\n');

    // Проверяем первые 20 записей
    const { data: sample, error: sampleError } = await supabase
        .from('questions_new')
        .select('id, country, metadata, question_ru')
        .eq('country', 'ru')
        .limit(20);

    if (sampleError) {
        console.error('❌ Error fetching sample:', sampleError);
        return;
    }

    console.log('📋 Sample questions:');
    sample?.forEach((q, i) => {
        console.log(`\n${i + 1}. ID: ${q.id}`);
        console.log(`   ticket_category: ${q.metadata?.ticket_category || 'NULL'}`);
        console.log(`   ticket_number: ${q.metadata?.ticket_number || 'NULL'}`);
        console.log(`   original_ticket_number: ${q.metadata?.original_ticket_number || 'NULL'}`);
        console.log(`   question_number: ${q.metadata?.question_number || 'NULL'}`);
        console.log(`   question: ${q.question_ru?.substring(0, 50)}...`);
    });

    // Проверяем распределение по ticket_category
    const { data: all, error: allError } = await supabase
        .from('questions_new')
        .select('metadata')
        .eq('country', 'ru');

    if (allError) {
        console.error('❌ Error fetching all:', allError);
        return;
    }

    const distribution = {};
    all?.forEach(q => {
        const category = q.metadata?.ticket_category || 'NULL';
        distribution[category] = (distribution[category] || 0) + 1;
    });

    console.log('\n\n📊 Distribution by ticket_category:');
    Object.entries(distribution).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} questions`);
    });

    console.log(`\n✅ Total Russia questions: ${all?.length}`);
}

checkRussiaQuestions().then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
