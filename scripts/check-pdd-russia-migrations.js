#!/usr/bin/env node

/**
 * Скрипт для проверки статуса миграций ПДД России
 * 
 * Использование:
 * node scripts/check-pdd-russia-migrations.js
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

// Проверка таблиц
async function checkTables() {
  console.log('\n📊 Проверка таблиц...\n');
  
  const tables = [
    { name: 'countries', description: 'Таблица стран' },
    { name: 'pdd_russia_questions', description: 'Вопросы ПДД России' },
    { name: 'pdd_russia_answers', description: 'Ответы ПДД России' },
    { name: 'pdd_russia_signs', description: 'Дорожные знаки ПДД России' },
    { name: 'pdd_russia_penalties', description: 'Штрафы ПДД России' },
  ];

  const results = [];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          results.push({
            table: table.name,
            status: '❌ НЕ СУЩЕСТВУЕТ',
            description: table.description,
            count: 0,
          });
        } else {
          results.push({
            table: table.name,
            status: '⚠️  ОШИБКА',
            description: table.description,
            error: error.message,
          });
        }
      } else {
        results.push({
          table: table.name,
          status: '✅ СУЩЕСТВУЕТ',
          description: table.description,
          count: count || 0,
        });
      }
    } catch (error) {
      results.push({
        table: table.name,
        status: '❌ ОШИБКА',
        description: table.description,
        error: error.message,
      });
    }
  }

  // Вывод результатов
  results.forEach(result => {
    const countStr = result.count !== undefined ? ` (${result.count} записей)` : '';
    const errorStr = result.error ? ` - ${result.error}` : '';
    console.log(`${result.status} ${result.table}${countStr}${errorStr}`);
    if (result.description) {
      console.log(`   ${result.description}`);
    }
  });

  return results;
}

// Проверка Storage bucket
async function checkStorageBucket() {
  console.log('\n📦 Проверка Storage bucket...\n');

  try {
    // Пытаемся получить список файлов в bucket
    const { data, error } = await supabase.storage
      .from('pdd_russia')
      .list('', {
        limit: 1,
      });

    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('Bucket not found')) {
        console.log('❌ Bucket "pdd_russia" НЕ СУЩЕСТВУЕТ');
        console.log('   Нужно применить миграцию: 20251218000003_create_pdd_russia_storage_bucket.sql');
        return false;
      } else {
        console.log('⚠️  Ошибка при проверке bucket:', error.message);
        return false;
      }
    } else {
      console.log('✅ Bucket "pdd_russia" СУЩЕСТВУЕТ');
      return true;
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке bucket:', error.message);
    return false;
  }
}

// Проверка функций через прямой SQL запрос
async function checkFunctions() {
  console.log('\n🔧 Проверка функций...\n');

  const functions = [
    { name: 'get_pdd_russia_ticket', description: 'Получение билета ПДД России' },
    { name: 'get_pdd_russia_question_by_source', description: 'Получение вопроса по source_id' },
  ];

  const results = [];

  for (const func of functions) {
    try {
      // Проверяем существование функции через SQL запрос к pg_proc
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT EXISTS (
            SELECT 1 
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = '${func.name}'
          ) as exists;
        `
      });

      // Альтернативный способ - проверка через information_schema
      const { data: altData, error: altError } = await supabase
        .from('_realtime')
        .select('*')
        .limit(0); // Просто проверка подключения

      // Пробуем вызвать функцию напрямую
      let functionExists = false;
      
      if (func.name === 'get_pdd_russia_ticket') {
        const { error: callError } = await supabase.rpc(func.name, { 
          p_ticket_number: 1
        });
        // Если функция не существует, будет ошибка "function does not exist"
        // Если существует, может быть ошибка валидации данных (что нормально)
        if (callError) {
          functionExists = !callError.message?.includes('does not exist') && 
                          !callError.message?.includes('function') &&
                          !callError.message?.includes('No function matches');
        } else {
          functionExists = true;
        }
      } else if (func.name === 'get_pdd_russia_question_by_source') {
        const { error: callError } = await supabase.rpc(func.name, { 
          p_source_id: 'test-non-existent-id'
        });
        if (callError) {
          functionExists = !callError.message?.includes('does not exist') && 
                          !callError.message?.includes('function') &&
                          !callError.message?.includes('No function matches');
        } else {
          functionExists = true;
        }
      }

      results.push({
        function: func.name,
        status: functionExists ? '✅ СУЩЕСТВУЕТ' : '❌ НЕ СУЩЕСТВУЕТ',
        description: func.description,
      });
    } catch (error) {
      // Если ошибка не про "не существует", значит функция есть
      const errorMsg = error.message?.toLowerCase() || '';
      const notExists = errorMsg.includes('does not exist') || 
                       errorMsg.includes('no function matches') ||
                       errorMsg.includes('function') && errorMsg.includes('not found');
      
      results.push({
        function: func.name,
        status: notExists ? '❌ НЕ СУЩЕСТВУЕТ' : '✅ СУЩЕСТВУЕТ',
        description: func.description,
      });
    }
  }

  results.forEach(result => {
    console.log(`${result.status} ${result.function}`);
    if (result.description) {
      console.log(`   ${result.description}`);
    }
  });

  return results;
}

// Проверка seed данных (стран)
async function checkSeedData() {
  console.log('\n🌍 Проверка seed данных (стран)...\n');

  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*');

    if (error) {
      console.log('❌ Ошибка при проверке стран:', error.message);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  Таблица countries пуста');
      console.log('   Нужно применить seed данные из миграции');
      return false;
    }

    console.log(`✅ Найдено стран: ${data.length}`);
    data.forEach(country => {
      console.log(`   - ${country.flag_emoji} ${country.name_ru} (${country.code})`);
    });

    // Проверяем наличие России
    const russia = data.find(c => c.code === 'PDD_RUSSIA');
    if (russia) {
      console.log('✅ ПДД Россия найдена в списке стран');
    } else {
      console.log('⚠️  ПДД Россия НЕ найдена в списке стран');
    }

    return true;
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🔍 Проверка статуса миграций ПДД России\n');
  console.log('=' .repeat(50));

  const tableResults = await checkTables();
  const bucketExists = await checkStorageBucket();
  const functionResults = await checkFunctions();
  await checkSeedData();

  // Итоговый статус
  console.log('\n' + '='.repeat(50));
  console.log('\n📋 ИТОГОВЫЙ СТАТУС:\n');

  const allTablesExist = tableResults.every(r => r.status === '✅ СУЩЕСТВУЕТ');
  const allFunctionsExist = functionResults.every(r => r.status === '✅ СУЩЕСТВУЕТ');

  if (allTablesExist && bucketExists && allFunctionsExist) {
    console.log('✅ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО!');
    console.log('\nСледующий шаг: импорт данных');
    console.log('npm run import:pdd-russia /path/to/pdd_russia');
  } else {
    console.log('⚠️  НЕ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ');
    console.log('\nНужно применить следующие миграции:');
    
    if (!allTablesExist) {
      console.log('  - 20251218000001_create_countries_table.sql');
      console.log('  - 20251218000002_create_pdd_russia_tables.sql');
    }
    
    if (!bucketExists) {
      console.log('  - 20251218000003_create_pdd_russia_storage_bucket.sql');
    }
    
    console.log('\nИнструкция:');
    console.log('1. Открой Supabase Dashboard → SQL Editor');
    console.log('2. Скопируй содержимое миграции');
    console.log('3. Вставь в редактор и нажми Run');
  }

  console.log('');
}

main().catch(console.error);

