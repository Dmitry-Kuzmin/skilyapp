import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const sql = fs.readFileSync('supabase/migrations/20260302000000_fix_use_boost_attack_aliases.sql', 'utf8');

const run = async () => {
    const res = await fetch("https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/apply-sql", {
        method: "POST",
        headers: {
            // Using SUPABASE_SERVICE_KEY from .env
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ sql })
    });

    if (!res.ok) {
        throw new Error(await res.text());
    }
    console.log("Migration applied successfully!");
};

run().catch(console.error);
