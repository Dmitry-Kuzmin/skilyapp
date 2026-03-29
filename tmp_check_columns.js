
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://yffjnqegeiorunyvcxkn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("🔍 Проверка структуры questions_new...");
    const { data, error } = await supabase.from('questions_new').select('*').limit(1);
    
    if (error) {
        console.error("❌ Ошибка:", error.message);
    } else {
        console.log("✅ Колокни questions_new:", Object.keys(data[0] || {}));
    }

    console.log("🔍 Проверка структуры answers_golden...");
    const { data: aData, error: aError } = await supabase.from('answers_golden').select('*').limit(1);
    if (aError) {
        console.error("❌ Ошибка answers_golden:", aError.message);
    } else {
        console.log("✅ Колонки answers_golden:", Object.keys(aData[0] || {}));
    }
}

main().catch(console.error);
