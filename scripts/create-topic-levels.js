import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTopicLevels() {
    console.log('🔍 Проверяем topic_levels...\n');

    // Проверяем существующие
    const { data: existing } = await supabase
        .from('topic_levels')
        .select('*')
        .eq('country', 'es')
        .in('topic_id', [1, 2]);

    console.log(`Найдено существующих записей: ${existing?.length || 0}`);

    // Создаем topic_levels для наших тестов
    const topicLevels = [
        // Topic 1, Test 1
        {
            topic_id: 1,
            level: 1,
            country: 'es',
            total_questions: 30,
            metadata: {
                test_number: 1,
                name_es: 'Билет 1',
                name_ru: 'Билет 1',
                name_en: 'Ticket 1'
            }
        },
        // Topic 1, Test 2
        {
            topic_id: 1,
            level: 2,
            country: 'es',
            total_questions: 30,
            metadata: {
                test_number: 2,
                name_es: 'Билет 2',
                name_ru: 'Билет 2',
                name_en: 'Ticket 2'
            }
        },
        // Topic 2, Test 1
        {
            topic_id: 2,
            level: 1,
            country: 'es',
            total_questions: 30,
            metadata: {
                test_number: 1,
                name_es: 'Билет 1',
                name_ru: 'Билет 1',
                name_en: 'Ticket 1'
            }
        },
        // Topic 2, Test 2
        {
            topic_id: 2,
            level: 2,
            country: 'es',
            total_questions: 30,
            metadata: {
                test_number: 2,
                name_es: 'Билет 2',
                name_ru: 'Билет 2',
                name_en: 'Ticket 2'
            }
        }
    ];

    console.log('\n📤 Создаем topic_levels...');

    const { data, error } = await supabase
        .from('topic_levels')
        .upsert(topicLevels, {
            onConflict: 'topic_id,level,country',
            ignoreDuplicates: false
        })
        .select();

    if (error) {
        console.error('❌ Ошибка:', error);
    } else {
        console.log(`✅ Создано ${data?.length || 0} записей topic_levels`);
        data?.forEach(tl => {
            console.log(`  - Topic ${tl.topic_id}, Level ${tl.level}: ${tl.total_questions} вопросов`);
        });
    }
}

createTopicLevels().catch(console.error);
