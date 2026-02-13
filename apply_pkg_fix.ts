
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yffjnqegeiorunyvcxkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw' // SERVICE KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    const packages = [
        {
            package_key: 'premium_monthly',
            package_type: 'premium',
            price_coins: 66000,
            price_stars: 660,
            premium_days: 30,
            title_ru: 'Premium на 1 месяц',
            icon: '👑',
            is_active: true
        },
        {
            package_key: 'premium_yearly',
            package_type: 'premium',
            price_coins: 399000,
            price_stars: 3990,
            premium_days: 365,
            title_ru: 'Premium на 1 год',
            icon: '👑',
            is_active: true
        }
    ];

    for (const pkg of packages) {
        const { error } = await supabase.from('pricing_packages').upsert(pkg, { onConflict: 'package_key' });
        if (error) console.error(`Error upserting ${pkg.package_key}:`, error);
        else console.log(`Successfully upserted ${pkg.package_key}`);
    }
}

run()
