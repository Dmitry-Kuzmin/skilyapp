import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY).trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

async function inspectBadQuestions() {
    console.log('🕵️‍♂️ ИНСПЕКЦИЯ ПРОБЛЕМНЫХ ВОПРОСОВ (v2)\n');

    // 1. Получаем ID всех вопросов, у которых ЕСТЬ ответы
    const { data: answeredIdsRaw, error: err1 } = await supabase
        .from('answer_options')
        .select('question_id');

    if (err1) { console.error(err1); return; }

    // Создаем Set для быстрого поиска
    const answeredSet = new Set(answeredIdsRaw.map(x => x.question_id));

    // 2. Получаем ВСЕ вопросы и ищем те, которых нет в Set
    const { data: allQuestions, error: err2 } = await supabase
        .from('questions_new')
        .select('id, question_ru, image_url, created_at, topic_id')
        .order('created_at', { ascending: false }); // Свежие сверху

    if (err2) { console.error(err2); return; }

    const questionsWithoutAnswers = allQuestions.filter(q => !answeredSet.has(q.id));

    console.log(`❌ Вопросов БЕЗ ОТВЕТОВ: ${questionsWithoutAnswers.length}\n`);

    if (questionsWithoutAnswers.length > 0) {
        console.log('📋 Примеры (первые 10):');
        questionsWithoutAnswers.slice(0, 10).forEach((q, i) => {
            console.log(`\n--- [${i + 1}] ---`);
            console.log(`ID: ${q.id}`);
            console.log(`Тема: ${q.topic_id}`);
            console.log(`Текст: "${(q.question_ru || '').substring(0, 100)}..."`);
            console.log(`Картинка: ${q.image_url || '(нет картинки)'}`);
            console.log(`Создан: ${new Date(q.created_at).toLocaleString()}`);
        });
    } else {
        console.log('🎉 Все вопросы имеют ответы!');
    }

    // 3. Проверяем вопросы без правильных ответов
    // (только среди тех, у которых вообще есть ответы)
    console.log('\n\n🔍 Поиск вопросов БЕЗ ПРАВИЛЬНЫХ ответов (среди живых)...');

    // Для этого нам нужны ответы для "живых" вопросов. 
    // Возьмем пачку последних вопросов, чтобы не грузить всю базу
    const { data: questionsWithAnswers } = await supabase
        .from('questions_new')
        .select(`
      id, 
      question_ru, 
      image_url,
      answer_options (
        id, is_correct
      )
    `)
        .limit(500); // Проверим 500 последних

    const reallyBadQs = questionsWithAnswers.filter(q => {
        // Есть ли ответы вообще? И есть ли среди них правильный?
        if (!q.answer_options || q.answer_options.length === 0) return false; // Это "без ответов", мы их уже нашли выше
        const hasCorrect = q.answer_options.some(a => a.is_correct);
        return !hasCorrect;
    });

    if (reallyBadQs.length === 0) {
        console.log('✅ В проверенной выборке (500 шт) проблем нет.');
    } else {
        console.log(`🚨 Найдено ${reallyBadQs.length} вопросов без правильного ответа:\n`);
        reallyBadQs.forEach((q, i) => {
            console.log(`\n--- [${i + 1}] ---`);
            console.log(`ID: ${q.id}`);
            console.log(`Текст: "${(q.question_ru || '').substring(0, 100)}..."`);
            console.log(`Картинка: ${q.image_url}`);
            console.log(`Ответов: ${q.answer_options.length} (все false)`);
        });
    }
}

inspectBadQuestions();
