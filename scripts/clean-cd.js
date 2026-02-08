
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanCD() {
    console.log('🧹 Cleaning C/D questions...');

    // Select IDs only
    let { data: questions, error } = await supabase
        .from('questions_new')
        .select('id')
        .eq('country', 'ru')
        .contains('metadata', { ticket_category: 'C_D' });

    if (!questions?.length) {
        console.log("No C/D questions found.");
        return;
    }

    // Delete answers first? Cascade? Usually cascade works if set up.
    // But let's delete answers manually to be safe or just try deleting questions.
    // Supabase/Postgres usually CASCADE on FK.

    console.log(`Found ${questions.length} to delete.`);

    // Batch deletes
    const batchSize = 100;
    for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        const { error } = await supabase
            .from('questions_new')
            .delete()
            .in('id', batch.map(x => x.id));

        if (error) {
            console.error('Error deleting batch:', error);
        } else {
            console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}`);
        }
    }

    console.log('✅ C/D cleanup complete!');
}

cleanCD();
