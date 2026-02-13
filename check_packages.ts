
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yffjnqegeiorunyvcxkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data, error } = await supabase.from('pricing_packages').select('*').eq('is_active', true)
    if (error) {
        console.error(error)
        return
    }
    console.log('Packages:', data.map(p => ({ key: p.package_key, stars: p.price_stars, coins: p.price_coins })))
}

check()
