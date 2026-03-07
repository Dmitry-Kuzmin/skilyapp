const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function run() {
  const { data, error } = await supabase.from('road_signs').select('sign_number, image_url').in('sign_number', ['R-2', 'P-1', 'R-1', 'R-3']).limit(5);
  console.log("Signs:", data, "Error:", error);
}
run();
