
import { createClient } from '@supabase/supabase-client'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser(email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, is_premium, subscription_status, subscription_end_date')
    .eq('email', email)
    .single()
  
  if (error) {
    console.error('Error fetching user:', error)
    return
  }
  
  console.log('User Data:', JSON.stringify(data, null, 2))
}

checkUser('kuzmin.public@gmail.com')
