const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function run() {
  const { data } = await supabase.from('road_signs').select('sign_number, name_ru, description_ru, image_url').ilike('sign_number', 'S-11').maybeSingle();
  console.log("S-11 in DB:", JSON.stringify(data, null, 2));
  const { data: nearby } = await supabase.from('road_signs').select('sign_number, name_ru, image_url').ilike('sign_number', 'S-%').order('sign_number').limit(20);
  console.log("\nAll S signs:", nearby?.map(s => `${s.sign_number}: ${s.name_ru} → ${s.image_url}`).join('\n'));
}
run();
