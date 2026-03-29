import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

async function test() {
  console.log("Fetching profiles...");
  const { data: p } = await supabase.from('profiles').select('id').limit(1);
  const uid = p[0].id;
  
  console.log("Fetching topics...");
  const { data: t, error } = await supabase.from('user_topic_progress').select(`
    topic_id,
    completed,
    topics (name_ru)
  `).eq('user_id', uid).limit(5);
  console.dir(t, {depth: null});
  if (error) console.error(error);
}
test();
