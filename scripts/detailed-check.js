import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('questions_new')
        .select('country, metadata')
        .eq('country', 'russia');

    console.log(`Total Russia questions: ${data?.length || 0}`);

    const stats = {
        A_B: 0,
        C_D: 0,
        NULL: 0,
        OTHERS: {}
    };

    data?.forEach(q => {
        const cat = q.metadata?.ticket_category;
        if (cat === 'A_B') stats.A_B++;
        else if (cat === 'C_D') stats.C_D++;
        else if (!cat) stats.NULL++;
        else {
            stats.OTHERS[cat] = (stats.OTHERS[cat] || 0) + 1;
        }
    });

    console.log('Stats for Russia:', stats);

    if (data && data.length > 0) {
        console.log('Sample metadata:', JSON.stringify(data[0].metadata, null, 2));
    }
}
check();
