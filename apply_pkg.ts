
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yffjnqegeiorunyvcxkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw' // SERVICE KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function execute() {
    const query = `
    INSERT INTO public.pricing_packages (package_key, package_type, price_coins, price_stars, premium_days, coins_amount, title_ru, description_ru, icon, is_active) VALUES
    ('premium_quarterly', 'premium', 165000, 1650, 90, 0, 'Premium на 3 месяца', 'Полный доступ на 90 дней. Хватит на всю теорию! Все функции Premium.', '👑', true),
    ('premium_biannual', 'premium', 265000, 2650, 180, 0, 'Premium на 6 месяцев', 'Самый популярный выбор! Полный доступ на 180 дней. Все функции Premium.', '👑', true)
    ON CONFLICT (package_key) DO UPDATE SET
      price_stars = EXCLUDED.price_stars,
      price_coins = EXCLUDED.price_coins,
      premium_days = EXCLUDED.premium_days,
      title_ru = EXCLUDED.title_ru,
      description_ru = EXCLUDED.description_ru,
      is_active = true,
      updated_at = NOW();

    UPDATE public.pricing_packages SET price_stars = 660, price_coins = 66000 WHERE package_key = 'premium_monthly';
    UPDATE public.pricing_packages SET price_stars = 3990, price_coins = 198300 WHERE package_key = 'premium_yearly';
  `;

    // Use rpc to execute SQL if available, or just use many updates
    // Actually, Supabase client doesn't have execSQL.
    // I'll do individual upserts.
}

async function run() {
    const packages = [
        {
            package_key: 'premium_quarterly',
            package_type: 'premium',
            price_coins: 165000,
            price_stars: 1650,
            premium_days: 90,
            coins_amount: 0,
            title_ru: 'Premium на 3 месяца',
            description_ru: 'Полный доступ на 90 дней. Хватит на всю теорию! Все функции Premium.',
            icon: '👑',
            is_active: true
        },
        {
            package_key: 'premium_biannual',
            package_type: 'premium',
            price_coins: 265000,
            price_stars: 2650,
            premium_days: 180,
            coins_amount: 0,
            title_ru: 'Premium на 6 месяцев',
            description_ru: 'Самый популярный выбор! Полный доступ на 180 дней. Все функции Premium.',
            icon: '👑',
            is_active: true
        },
        {
            package_key: 'premium_monthly',
            price_stars: 660,
            price_coins: 66000
        },
        {
            package_key: 'premium_yearly',
            price_stars: 3990,
            price_coins: 399000
        }
    ];

    for (const pkg of packages) {
        const { error } = await supabase.from('pricing_packages').upsert(pkg, { onConflict: 'package_key' });
        if (error) console.error(`Error upserting ${pkg.package_key}:`, error);
        else console.log(`Successfully upserted ${pkg.package_key}`);
    }
}

run()
