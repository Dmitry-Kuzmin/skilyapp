
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSchema() {
    // Check columns
    const { data: columns, error } = await supabase.rpc('get_table_info', { table_name: 'pdd_russia_questions' });

    if (error) {
        // Fallback if RPC doesn't exist, try inserting a dummy row to see constraint error details or just inspect via error
        console.log("RPC get_table_info failed, trying to infer from error on duplicate insert...");
    } else {
        console.log("Columns:", columns);
    }

    // Lets just try to update existing rows to ticket_category = 'A_B' where it is null
    const { data, error: updateError } = await supabase
        .from('pdd_russia_questions')
        .update({ ticket_category: 'A_B' })
        .is('ticket_category', null)
        .select('id');

    if (updateError) {
        console.error("Error updating existing rows:", updateError);
    } else {
        console.log(`Updated ${data.length} existing rows to category A_B`);
    }
}

checkSchema();
