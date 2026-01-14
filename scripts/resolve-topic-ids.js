/**
 * ========================================
 * TOPIC ID RESOLVER
 * ========================================
 * Преобразует topic_number в topic_id (UUID) из БД
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Ошибка: SUPABASE переменные не установлены');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resolveTopicIds(jsonPath) {
    console.log('🔄 Загрузка тем из Supabase...');

    // Получаем все темы из БД
    const { data: topics, error } = await supabase
        .from('topics')
        .select('id, number')
        .order('number');

    if (error) {
        console.error('❌ Ошибка получения тем:', error.message);
        process.exit(1);
    }

    // Создаём mapping number → UUID
    const topicMap = {};
    topics.forEach(topic => {
        topicMap[topic.number] = topic.id;
    });

    console.log(`✅ Загружено ${topics.length} тем`);
    console.log('Mapping:');
    Object.entries(topicMap).forEach(([num, id]) => {
        console.log(`  Тема ${num} → ${id.substring(0, 8)}...`);
    });

    // Читаем JSON
    console.log(`\n📖 Читаем файл: ${jsonPath}`);
    const rawData = await fs.readFile(jsonPath, 'utf-8');
    const questions = JSON.parse(rawData);

    if (!Array.isArray(questions)) {
        console.error('❌ JSON должен быть массивом вопросов');
        process.exit(1);
    }

    console.log(`✅ Найдено ${questions.length} вопросов\n`);

    // Обновляем topic_id
    let updated = 0;
    let notFound = 0;

    questions.forEach((q, i) => {
        if (q.topic_number && topicMap[q.topic_number]) {
            q.topic_id = topicMap[q.topic_number];
            updated++;
        } else if (q.topic_number) {
            console.warn(`⚠️  Вопрос #${i + 1}: тема ${q.topic_number} не найдена в БД`);
            notFound++;
        }
    });

    console.log(`✅ Обновлено topic_id: ${updated}`);
    if (notFound > 0) {
        console.log(`⚠️  Не найдено в БД: ${notFound}`);
    }

    // Сохраняем
    await fs.writeFile(jsonPath, JSON.stringify(questions, null, 2));
    console.log(`\n💾 Файл обновлён: ${jsonPath}`);
}

const jsonPath = process.argv[2];

if (!jsonPath) {
    console.error('❌ Укажите путь к JSON файлу');
    console.error('Использование: node scripts/resolve-topic-ids.js <file.json>');
    process.exit(1);
}

resolveTopicIds(jsonPath).catch(console.error);
