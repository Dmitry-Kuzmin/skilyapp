#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function compareCategories() {
    console.log('📊 Сравнение категорий A/B и C/D для России\n');

    // Получаем все вопросы России
    const { data: allQuestions, error } = await supabase
        .from('questions_new')
        .select('id, metadata, question_ru')
        .eq('country', 'ru');

    if (error) {
        console.error('❌ Ошибка:', error);
        return;
    }

    console.log(`✅ Всего вопросов России: ${allQuestions?.length}\n`);

    // Разделяем по категориям
    const cdQuestions = allQuestions?.filter(q => q.metadata?.ticket_category === 'C_D') || [];
    const abQuestions = allQuestions?.filter(q => !q.metadata?.ticket_category || q.metadata?.ticket_category !== 'C_D') || [];

    console.log(`🚗 Категория A/B: ${abQuestions.length} вопросов`);
    console.log(`🚚 Категория C/D: ${cdQuestions.length} вопросов\n`);

    // Группируем A/B по билетам
    const abTickets = new Map();
    abQuestions.forEach(q => {
        const ticketNum = q.metadata?.ticket_number;
        if (ticketNum) {
            if (!abTickets.has(ticketNum)) {
                abTickets.set(ticketNum, []);
            }
            abTickets.get(ticketNum).push(q);
        }
    });

    // Группируем C/D по original_ticket_number
    const cdTickets = new Map();
    cdQuestions.forEach(q => {
        const ticketNum = q.metadata?.original_ticket_number;
        if (ticketNum) {
            if (!cdTickets.has(ticketNum)) {
                cdTickets.set(ticketNum, []);
            }
            cdTickets.get(ticketNum).push(q);
        }
    });

    console.log(`📋 A/B: ${abTickets.size} билетов`);
    console.log(`📋 C/D: ${cdTickets.size} билетов\n`);

    // Сравним первые вопросы из билета 1
    console.log('🔍 Сравнение вопроса #1 из билета #1:\n');

    const ab1 = abTickets.get(1)?.[0];
    const cd1 = cdTickets.get(1)?.[0];

    if (ab1) {
        console.log('📗 A/B Билет 1, Вопрос 1:');
        console.log(`   ID: ${ab1.id}`);
        console.log(`   Текст: ${ab1.question_ru?.substring(0, 100)}...`);
        console.log(`   ticket_category: ${ab1.metadata?.ticket_category || 'NULL'}\n`);
    }

    if (cd1) {
        console.log('📘 C/D Билет 1, Вопрос 1:');
        console.log(`   ID: ${cd1.id}`);
        console.log(`   Текст: ${cd1.question_ru?.substring(0, 100)}...`);
        console.log(`   ticket_category: ${cd1.metadata?.ticket_category}\n`);
    }

    // Проверим, есть ли совпадения в текстах вопросов
    console.log('🔬 Проверка уникальности вопросов...\n');

    const abTexts = new Set(abQuestions.map(q => q.question_ru?.trim().toLowerCase()));
    const cdTexts = cdQuestions.map(q => q.question_ru?.trim().toLowerCase());

    const duplicates = cdTexts.filter(text => abTexts.has(text));

    console.log(`❓ Дубликаты (вопросы C/D, которые есть в A/B): ${duplicates.length}`);
    console.log(`✨ Уникальные вопросы C/D: ${cdTexts.length - duplicates.length}\n`);

    if (duplicates.length > 0) {
        console.log('⚠️  ВНИМАНИЕ: Большинство вопросов C/D совпадают с A/B!');
        console.log('   Возможно, в базе импортированы одинаковые данные для обеих категорий.\n');
    } else {
        console.log('✅ Вопросы C/D полностью уникальны!\n');
    }

    // Покажем примеры уникальных вопросов C/D (если есть)
    const uniqueCdQuestions = cdQuestions.filter(q =>
        !abTexts.has(q.question_ru?.trim().toLowerCase())
    );

    if (uniqueCdQuestions.length > 0) {
        console.log('📝 Примеры уникальных вопросов C/D (первые 3):\n');
        uniqueCdQuestions.slice(0, 3).forEach((q, i) => {
            console.log(`${i + 1}. ${q.question_ru?.substring(0, 120)}...`);
            console.log(`   Билет: ${q.metadata?.original_ticket_number || q.metadata?.ticket_number}\n`);
        });
    }
}

compareCategories().then(() => {
    console.log('✅ Анализ завершен!');
    process.exit(0);
}).catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
});
