
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixCDMetadata() {
    console.log('🔍 Searching for C/D questions with incorrect ticket numbers...');

    // Fetch all C/D questions
    // Since we can't filter JSON efficiently without RPC or index, we fetch a batch.
    // Or filter using contains C_D.

    let { data: questions, error } = await supabase
        .from('questions_new')
        .select('id, metadata')
        .eq('country', 'ru')
        .contains('metadata', { ticket_category: 'C_D' });

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`Found ${questions.length} C/D questions.`);

    let updatedCount = 0;

    for (const q of questions) {
        const meta = q.metadata;
        // Check if ticket_number needs offset
        if (meta.ticket_number <= 40) { // Assuming A/B max 40
            const oldTick = meta.ticket_number;
            const newTick = oldTick + 100;

            const newMeta = {
                ...meta,
                ticket_number: newTick,
                original_ticket_number: oldTick
            };

            const { error: updateError } = await supabase
                .from('questions_new')
                .update({ metadata: newMeta })
                .eq('id', q.id);

            if (updateError) {
                console.error(`Failed to update ${q.id}:`, updateError);
            } else {
                updatedCount++;
                // visible log every 50
                if (updatedCount % 50 === 0) console.log(`Updated ${updatedCount}...`);
            }
        }
    }

    console.log(`✅ Fixed meta for ${updatedCount} questions.`);
}

fixCDMetadata();
