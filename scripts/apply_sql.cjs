const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const sql = fs.readFileSync('supabase/migrations/20260311000000_update_get_profile_rpc.sql', 'utf8');

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('No SUPABASE_SERVICE_KEY found in env');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yffjnqegeiorunyvcxkn.supabase.co';

fetch(`${SUPABASE_URL}/functions/v1/apply-sql`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ sql })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
