import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function deepAudit() {
    console.log('🔍 Глубокий аудит базы данных вопросов РФ...\n');

    const tables = ['questions_new', 'pdd_russia_questions'];

    for (const table of tables) {
        console.log(`--- Таблица: ${table} ---`);

        const { data: qData, error } = await supabase
            .from(table)
            .select('id, metadata, country')
            .in('country', ['ru', 'russia']);

        if (error) {
            console.log(`❌ Ошибка доступа к таблице или колонки не найдены: ${error.message}\n`);
            continue;
        }

        const all = qData || [];
        console.log(`📊 Всего записей (ru/russia): ${all.length}`);

        const ab = all.filter(q => !q.metadata?.ticket_category || q.metadata?.ticket_category !== 'C_D');
        const cd = all.filter(q => q.metadata?.ticket_category === 'C_D');
        const ruCodes = all.filter(q => q.country === 'ru').length;
        const russiaCodes = all.filter(q => q.country === 'russia').length;

        console.log(`   🔸 Код 'ru': ${ruCodes}`);
        console.log(`   🔸 Код 'russia': ${russiaCodes}`);
        console.log(`   🔸 A/B (включая null): ${ab.length}`);
        console.log(`   🔸 C/D: ${cd.length}`);

        const getTicketNum = (q) => q.metadata?.original_ticket_number || q.metadata?.ticket_number;
        const ticketsAB = new Set(ab.map(getTicketNum).filter(Boolean));
        const ticketsCD = new Set(cd.map(getTicketNum).filter(Boolean));

        console.log(`   🎫 Билетов A/B: ${ticketsAB.size} (должно быть 40)`);
        console.log(`   🎫 Билетов C/D: ${ticketsCD.size} (должно быть 40)`);

        if (ticketsAB.size < 40) {
            const missing = [];
            for (let i = 1; i <= 40; i++) if (!ticketsAB.has(i)) missing.push(i);
            if (missing.length < 40) console.log(`   ❌ Отсутствуют билеты A/B: ${missing.join(', ')}`);
        }
        console.log('');
    }
}

deepAudit().catch(console.error);
