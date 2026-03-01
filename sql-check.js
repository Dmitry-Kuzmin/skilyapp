import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key) env[key] = val.join('=').trim().replace(/^"|"$/g, '')
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data, error } = await supabase.from('user_challenge_questions').insert({
    user_id: env.VITE_TEST_USER_ID || '123e4567-e89b-12d3-a456-426614174000', // Just try an insert and see if we get an FK error
    question_id: '123e4567-e89b-12d3-a456-426614174000',
    times_wrong: 1
  });
  console.log("user_challenge_questions error:", error);
}

check();
