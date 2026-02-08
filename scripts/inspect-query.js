import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function inspect() {
    const { data, error } = await supabase
        .from('questions_new')
        .select('id, country, metadata')
        .eq('country', 'russia')
        .limit(5);

    console.log('Sample Russia questions:');
    console.log(JSON.stringify(data, null, 2));

    // Test the query that fails
    const ticketNumber = 1;
    const { data: q, error: e } = await supabase
        .from('questions_new')
        .select('id')
        .eq('country', 'russia')
        .or(`metadata->>ticket_category.is.null,metadata->>ticket_category.neq.C_D`)
        .eq('metadata->>ticket_number', ticketNumber.toString());

    console.log(`\nTest Query (A/B Ticket ${ticketNumber}):`);
    console.log(`Found: ${q?.length || 0} questions`);
    if (e) console.error('Query Error:', e);
}
inspect();
