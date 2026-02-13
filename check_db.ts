
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yffjnqegeiorunyvcxkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw' // SERVICE KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking profiles for a test telegram_id...')
    // Try to find a profile with a known id or just any
    const { data, error } = await supabase.from('profiles').select('id, telegram_id').limit(5)
    if (error) {
        console.error('Error fetching profiles:', error)
    } else {
        console.log('Profiles sample:', data)
    }

    console.log('\nChecking pricing_packages policies (simulated)...')
    // We can't easily check policies without psql, but we can check if they exist by querying
}

check()
