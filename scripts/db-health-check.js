#!/usr/bin/env node

/**
 * 🔍 ПОЛНАЯ ПРОВЕРКА ЦЕЛОСТНОСТИ БД
 * Ищет скрытые проблемы:
 * - Вопросы без ответов
 * - Ответы без вопросов (orphans)
 * - Вопросы без правильного ответа
 * - Дыры в позициях ответов
 * - NULL в критичных полях
 */

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

async function fullCheck() {
    console.log('🔍 ПОЛНАЯ ПРОВЕРКА БАЗЫ ДАННЫХ\n');
    console.log('='.repeat(80) + '\n');

    const issues = [];

    // 1. Проверка: вопросы без ответов
    console.log('📋 1. Проверка вопросов без ответов...');
    const { data: questionsWithoutAnswers } = await supabase
        .from('questions_new')
        .select('id, question_ru')
        .not('id', 'in',
            `(select question_id from answer_options)`
        );

    // Альтернативный способ (более надёжный)
    const { data: allQuestions } = await supabase
        .from('questions_new')
        .select('id');

    const { data: allAnswers } = await supabase
        .from('answer_options')
        .select('question_id');

    const questionIds = new Set(allQuestions.map(q => q.id));
    const answeredQuestionIds = new Set(allAnswers.map(a => a.question_id));

    const noAnswers = [...questionIds].filter(id => !answeredQuestionIds.has(id));

    if (noAnswers.length > 0) {
        issues.push(`❌ ${noAnswers.length} вопросов БЕЗ ОТВЕТОВ!`);
        console.log(`   ❌ Найдено: ${noAnswers.length}`);
        console.log(`   Примеры: ${noAnswers.slice(0, 3).join(', ')}`);
    } else {
        console.log('   ✅ OK');
    }

    // 2. Проверка: ответы-сироты (без вопроса)
    console.log('\n📋 2. Проверка ответов-сирот...');
    const orphanAnswers = [...answeredQuestionIds].filter(id => !questionIds.has(id));

    if (orphanAnswers.length > 0) {
        issues.push(`❌ ${orphanAnswers.length} ответов без вопроса (orphans)!`);
        console.log(`   ❌ Найдено: ${orphanAnswers.length}`);
    } else {
        console.log('   ✅ OK');
    }

    // 3. Проверка: вопросы БЕЗ правильного ответа
    console.log('\n📋 3. Проверка вопросов без правильного ответа...');
    const { data: answersData } = await supabase
        .from('answer_options')
        .select('question_id, is_correct');

    const correctByQuestion = {};
    answersData.forEach(a => {
        if (!correctByQuestion[a.question_id]) {
            correctByQuestion[a.question_id] = false;
        }
        if (a.is_correct) {
            correctByQuestion[a.question_id] = true;
        }
    });

    const noCorrectAnswer = Object.entries(correctByQuestion)
        .filter(([_, hasCorrect]) => !hasCorrect)
        .map(([qid, _]) => qid);

    if (noCorrectAnswer.length > 0) {
        issues.push(`🚨 ${noCorrectAnswer.length} вопросов БЕЗ правильного ответа!`);
        console.log(`   🚨 Найдено: ${noCorrectAnswer.length}`);
        console.log(`   Примеры: ${noCorrectAnswer.slice(0, 3).join(', ')}`);
    } else {
        console.log('   ✅ OK');
    }

    // 4. Проверка: дыры в позициях (0,1,3 вместо 0,1,2,3)
    console.log('\n📋 4. Проверка последовательности позиций...');
    const { data: positionData } = await supabase
        .from('answer_options')
        .select('question_id, position')
        .order('question_id, position');

    const positionsByQuestion = {};
    positionData.forEach(a => {
        if (!positionsByQuestion[a.question_id]) {
            positionsByQuestion[a.question_id] = [];
        }
        positionsByQuestion[a.question_id].push(a.position);
    });

    const gapsFound = [];
    Object.entries(positionsByQuestion).forEach(([qid, positions]) => {
        const sorted = [...new Set(positions)].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] !== sorted[i] + 1) {
                gapsFound.push(qid);
                break;
            }
        }
        // Также проверяем что начинается с 0
        if (sorted[0] !== 0) {
            if (!gapsFound.includes(qid)) gapsFound.push(qid);
        }
    });

    if (gapsFound.length > 0) {
        issues.push(`⚠️  ${gapsFound.length} вопросов с дырами в позициях!`);
        console.log(`   ⚠️  Найдено: ${gapsFound.length}`);
    } else {
        console.log('   ✅ OK');
    }

    // 5. Проверка: NULL в критичных полях
    console.log('\n📋 5. Проверка NULL в критичных полях...');

    const { count: nullQuestionEs } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true })
        .or('question_es.is.null,question_es.eq.');

    const { count: nullAnswerEs } = await supabase
        .from('answer_options')
        .select('*', { count: 'exact', head: true })
        .or('text_es.is.null,text_es.eq.');

    if (nullQuestionEs > 0 || nullAnswerEs > 0) {
        issues.push(`⚠️  NULL в ES полях: ${nullQuestionEs} вопросов, ${nullAnswerEs} ответов`);
        console.log(`   ⚠️  Вопросов без ES: ${nullQuestionEs}`);
        console.log(`   ⚠️  Ответов без ES: ${nullAnswerEs}`);
    } else {
        console.log('   ✅ OK');
    }

    // 6. Проверка уникального индекса
    console.log('\n📋 6. Проверка уникального индекса (защита от дубликатов)...');

    // Проверяем есть ли индекс через информационную схему
    const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'answer_options')
        .eq('indexname', 'answer_options_question_position_unique');

    if (!indexes || indexes.length === 0) {
        issues.push('🚨 КРИТИЧНО: Уникальный индекс НЕ СОЗДАН! Дубликаты могут вернуться!');
        console.log('   🚨 ИНДЕКС НЕ НАЙДЕН!');
    } else {
        console.log('   ✅ Индекс на месте (защита работает)');
    }

    // ИТОГ
    console.log('\n' + '='.repeat(80));
    if (issues.length === 0) {
        console.log('\n✅ ВСЁ ОТЛИЧНО! Проблем не найдено.\n');
    } else {
        console.log('\n⚠️  НАЙДЕНО ПРОБЛЕМ: ' + issues.length + '\n');
        issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
        console.log('');
    }
}

fullCheck().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
