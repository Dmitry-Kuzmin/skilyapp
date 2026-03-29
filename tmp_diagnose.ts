
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = "https://yffjnqegeiorunyvcxkn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("🔍 Диагностика таблиц для проекта yffjnqegeiorunyvcxkn...");

    const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.error("❌ Ошибка при получении списка таблиц (information_schema):", error.message);
        
        // Попробуем просто дернуть questions через RPC или прямой селект
        console.log("🛠️ Пробуем прямой селект из questions...");
        const { count, error: qError } = await supabase.from('questions').select('*', { count: 'exact', head: true });
        if (qError) {
           console.error("❌ Ошибка прямого селекта из questions:", qError.message);
        } else {
           console.log(`✅ Таблица questions найдена! Всего записей: ${count}`);
        }
    } else {
        console.log("📜 Список таблиц в схеме public:");
        tables.forEach(t => console.log(` - ${t.table_name}`));
    }
}

main().catch(console.error);
