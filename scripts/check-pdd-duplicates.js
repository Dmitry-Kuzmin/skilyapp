#!/usr/bin/env node

/**
 * Скрипт для проверки и очистки дубликатов вопросов ПДД России
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Ошибка: нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDuplicates() {
  console.log('🔍 Проверка дубликатов вопросов ПДД России...\n');

  // Получаем все вопросы
  const { data: questions, error } = await supabase
    .from('pdd_russia_questions')
    .select('*')
    .order('ticket_number', { ascending: true })
    .order('question_number', { ascending: true });

  if (error) {
    console.error('❌ Ошибка при загрузке вопросов:', error);
    return;
  }

  console.log(`📊 Всего вопросов в базе: ${questions?.length || 0}\n`);

  // Ищем дубликаты по (ticket_number, question_number)
  const duplicates = new Map();
  const uniqueKeys = new Set();

  questions?.forEach((q) => {
    const key = `${q.ticket_number}-${q.question_number}`;
    if (uniqueKeys.has(key)) {
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key).push(q);
    } else {
      uniqueKeys.add(key);
    }
  });

  // Находим первый вопрос для каждого ключа
  const firstQuestions = new Map();
  questions?.forEach((q) => {
    const key = `${q.ticket_number}-${q.question_number}`;
    if (!firstQuestions.has(key)) {
      firstQuestions.set(key, q);
    }
  });

  // Добавляем дубликаты
  questions?.forEach((q) => {
    const key = `${q.ticket_number}-${q.question_number}`;
    const first = firstQuestions.get(key);
    if (first && first.id !== q.id) {
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      if (!duplicates.get(key).find(d => d.id === q.id)) {
        duplicates.get(key).push(q);
      }
    }
  });

  console.log(`🔴 Найдено дубликатов: ${duplicates.size}\n`);

  if (duplicates.size > 0) {
    console.log('Дубликаты:');
    let totalDuplicates = 0;
    duplicates.forEach((dups, key) => {
      console.log(`  Билет ${key.split('-')[0]}, Вопрос ${key.split('-')[1]}: ${dups.length} дубликатов`);
      totalDuplicates += dups.length;
    });
    console.log(`\nВсего дубликатов для удаления: ${totalDuplicates}\n`);

    return { duplicates, totalDuplicates };
  }

  return null;
}

async function removeDuplicates() {
  console.log('🧹 Удаление дубликатов...\n');

  // Получаем все вопросы
  const { data: questions, error } = await supabase
    .from('pdd_russia_questions')
    .select('*')
    .order('created_at', { ascending: true }); // Оставляем самые старые

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  // Группируем по (ticket_number, question_number)
  const groups = new Map();
  questions?.forEach((q) => {
    const key = `${q.ticket_number}-${q.question_number}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(q);
  });

  // Находим дубликаты (оставляем первый, удаляем остальные)
  const toDelete = [];
  groups.forEach((group, key) => {
    if (group.length > 1) {
      // Сортируем по created_at, оставляем самый старый
      group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      // Удаляем все кроме первого
      for (let i = 1; i < group.length; i++) {
        toDelete.push(group[i].id);
      }
    }
  });

  if (toDelete.length === 0) {
    console.log('✅ Дубликатов не найдено!');
    return;
  }

  console.log(`🗑️  Удаляю ${toDelete.length} дубликатов...\n`);

  // Удаляем дубликаты батчами по 100
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    
    // Сначала удаляем ответы
    const { error: answersError } = await supabase
      .from('pdd_russia_answers')
      .delete()
      .in('question_id', batch);

    if (answersError) {
      console.error(`⚠️  Ошибка при удалении ответов:`, answersError.message);
    }

    // Потом удаляем вопросы
    const { error: questionsError } = await supabase
      .from('pdd_russia_questions')
      .delete()
      .in('id', batch);

    if (questionsError) {
      console.error(`❌ Ошибка при удалении вопросов:`, questionsError.message);
    } else {
      deleted += batch.length;
      console.log(`✅ Удалено ${deleted}/${toDelete.length} дубликатов...`);
    }
  }

  console.log(`\n✅ Удалено ${deleted} дубликатов!`);
}

async function showStats() {
  console.log('\n📊 Статистика после очистки:\n');

  const { data: questions, error } = await supabase
    .from('pdd_russia_questions')
    .select('*', { count: 'exact', head: false });

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  const count = questions?.length || 0;
  const byTicket = new Map();
  
  questions?.forEach((q) => {
    const ticket = q.ticket_number;
    byTicket.set(ticket, (byTicket.get(ticket) || 0) + 1);
  });

  console.log(`Всего вопросов: ${count}`);
  console.log(`Билетов: ${byTicket.size}`);
  console.log(`\nВопросов по билетам:`);
  
  Array.from(byTicket.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([ticket, count]) => {
      console.log(`  Билет ${ticket}: ${count} вопросов`);
    });

  // Проверяем, есть ли билеты с неполным количеством вопросов
  const incomplete = Array.from(byTicket.entries())
    .filter(([ticket, count]) => count !== 20);
  
  if (incomplete.length > 0) {
    console.log(`\n⚠️  Билеты с неполным количеством вопросов (не 20):`);
    incomplete.forEach(([ticket, count]) => {
      console.log(`  Билет ${ticket}: ${count} вопросов (ожидается 20)`);
    });
  }
}

async function main() {
  const action = process.argv[2] || 'check';

  if (action === 'check') {
    await checkDuplicates();
    await showStats();
  } else if (action === 'clean') {
    const duplicates = await checkDuplicates();
    if (duplicates && duplicates.totalDuplicates > 0) {
      console.log('\n⚠️  ВНИМАНИЕ: Будут удалены дубликаты!');
      console.log('Для удаления запусти: node scripts/check-pdd-duplicates.js clean --confirm\n');
    } else {
      await removeDuplicates();
      await showStats();
    }
  } else if (action === 'clean' && process.argv[3] === '--confirm') {
    await removeDuplicates();
    await showStats();
  } else {
    console.log('Использование:');
    console.log('  node scripts/check-pdd-duplicates.js check  - проверить дубликаты');
    console.log('  node scripts/check-pdd-duplicates.js clean --confirm  - удалить дубликаты');
  }
}

main().catch(console.error);

