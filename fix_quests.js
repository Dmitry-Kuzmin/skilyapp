import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Updating category to duel_wins...");
  const { error: err1 } = await supabase.from('daily_quest_definitions')
    .update({ category: 'duel_wins' })
    .eq('id', 'winner');
  console.log("duel_wins update:", err1 || "success");

  console.log("Updating category to perfect_exams...");
  const { error: err2 } = await supabase.from('daily_quest_definitions')
    .update({ category: 'perfect_exams' })
    .eq('id', 'perfect_exam');
  console.log("perfect_exams update:", err2 || "success");
}

run();
