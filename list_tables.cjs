const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_table_names'); // If this RPC exists
  if (error) {
    const { data: tables, error: err2 } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
    console.log("Tables:", tables || err2);
  } else {
    console.log("Tables:", data);
  }
}
run();
