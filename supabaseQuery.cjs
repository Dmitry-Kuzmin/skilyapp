const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function run() {
  const { data, error } = await supabase.from('profiles').select('id, user_id, xp, coins, duel_pass_level').or(`id.eq.88533a8b-3ca0-40c1-9ee2-619833b79491,user_id.eq.88533a8b-3ca0-40c1-9ee2-619833b79491`);
  console.log("My Profil 3:", data, "Error:", error);
}
run();
