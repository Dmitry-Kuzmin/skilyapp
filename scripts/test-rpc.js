
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testRpc() {
    // Get a valid profile ID first
    const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
    if (!profile) {
        console.error('No profile found to test with');
        return;
    }

    console.log('Testing get_dashboard_super with ID:', profile.id);
    const { data, error } = await supabase.rpc('get_dashboard_super', { p_user_id: profile.id });

    if (error) {
        console.error('RPC Error:', error);
    } else {
        console.log('RPC Success:', JSON.stringify(data).substring(0, 100) + '...');
    }
}

testRpc();
