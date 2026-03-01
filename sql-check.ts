import { supabase } from './src/integrations/supabase/client';

async function check() {
  const { data, error } = await supabase.from('user_challenge_questions').select('*').limit(1);
  console.log("data:", data, "error:", error);
}

check();
