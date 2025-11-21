#!/usr/bin/env node

/**
 * Скрипт для импорта данных из старой базы Lovable в новую базу Supabase
 * 
 * ВАЖНО: Этот скрипт требует доступа к старой базе данных Lovable
 * Если у вас нет доступа, используйте скрипт create-test-data.js для создания тестовых данных
 */

import { createClient } from '@supabase/supabase-js';

// Новая база данных (ваша)
const NEW_PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const NEW_SUPABASE_URL = `https://${NEW_PROJECT_ID}.supabase.co`;
const NEW_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required!');
  console.error('Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

// Старая база данных Lovable (замените на ваши данные)
const OLD_PROJECT_ID = process.env.OLD_PROJECT_ID || 'ijijcrucqqnnjbkclqhb';
const OLD_SUPABASE_URL = `https://${OLD_PROJECT_ID}.supabase.co`;
const OLD_SERVICE_ROLE_KEY = process.env.OLD_SERVICE_ROLE_KEY || '';

const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const oldSupabase = OLD_SERVICE_ROLE_KEY ? createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

async function importTable(tableName, options = {}) {
  const { transform, skipIfEmpty = false } = options;
  
  console.log(`\n📥 Импорт таблицы: ${tableName}`);
  
  if (!oldSupabase) {
    console.log(`   ⚠️  Старая база данных не настроена. Пропускаем ${tableName}`);
    return { imported: 0, errors: 0 };
  }

  try {
    // Получаем данные из старой базы
    const { data: oldData, error: fetchError } = await oldSupabase
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.log(`   ❌ Ошибка получения данных: ${fetchError.message}`);
      return { imported: 0, errors: 1 };
    }

    if (!oldData || oldData.length === 0) {
      if (skipIfEmpty) {
        console.log(`   ⚠️  Таблица пуста, пропускаем`);
        return { imported: 0, errors: 0 };
      }
      console.log(`   ⚠️  Таблица пуста`);
      return { imported: 0, errors: 0 };
    }

    console.log(`   📊 Найдено записей: ${oldData.length}`);

    // Трансформируем данные, если нужно
    let dataToImport = transform ? oldData.map(transform) : oldData;

    // Удаляем поля, которых нет в новой таблице
    // (это можно настроить для каждой таблицы отдельно)

    // Вставляем данные в новую базу
    const { data: insertedData, error: insertError } = await newSupabase
      .from(tableName)
      .insert(dataToImport)
      .select();

    if (insertError) {
      console.log(`   ❌ Ошибка вставки: ${insertError.message}`);
      
      // Пробуем вставлять по одной записи для лучшей диагностики
      let successCount = 0;
      let errorCount = 0;
      
      for (const record of dataToImport) {
        const { error: singleError } = await newSupabase
          .from(tableName)
          .insert(record);
        
        if (singleError) {
          console.log(`   ⚠️  Ошибка при вставке записи: ${singleError.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      console.log(`   ✅ Импортировано: ${successCount}, ошибок: ${errorCount}`);
      return { imported: successCount, errors: errorCount };
    }

    console.log(`   ✅ Импортировано: ${insertedData?.length || 0} записей`);
    return { imported: insertedData?.length || 0, errors: 0 };

  } catch (error) {
    console.log(`   ❌ Исключение: ${error.message}`);
    return { imported: 0, errors: 1 };
  }
}

async function importAllData() {
  console.log('🚀 Начало импорта данных из старой базы в новую...\n');
  console.log('='.repeat(80));

  const results = {
    totalImported: 0,
    totalErrors: 0,
    tables: {}
  };

  // Импортируем таблицы по порядку (с учетом зависимостей)
  const tablesToImport = [
    // Сначала справочные таблицы
    { name: 'road_signs', skipIfEmpty: true },
    { name: 'language_terms', skipIfEmpty: true },
    
    // Затем вопросы (зависят от topics и tags, которые уже есть)
    { name: 'questions_new', skipIfEmpty: true },
    { name: 'answer_options', skipIfEmpty: true },
    { name: 'question_tags', skipIfEmpty: true },
    
    // Подтемы и материалы
    { name: 'subtopics', skipIfEmpty: true },
    { name: 'materials', skipIfEmpty: true },
    { name: 'material_versions', skipIfEmpty: true },
    
    // Прогресс пользователей
    { name: 'user_progress', skipIfEmpty: true },
    { name: 'user_topic_progress', skipIfEmpty: true },
    { name: 'topic_tests', skipIfEmpty: true },
    
    // Игровые данные
    { name: 'game_sessions', skipIfEmpty: true },
    { name: 'duels', skipIfEmpty: true },
    { name: 'duel_players', skipIfEmpty: true },
    { name: 'duel_questions', skipIfEmpty: true },
    { name: 'duel_answers', skipIfEmpty: true },
    { name: 'duel_stats', skipIfEmpty: true },
    { name: 'duel_notifications', skipIfEmpty: true },
    { name: 'daily_duel_limits', skipIfEmpty: true },
    
    // Другие данные
    { name: 'achievements', skipIfEmpty: true },
    { name: 'boost_inventory', skipIfEmpty: true },
  ];

  for (const table of tablesToImport) {
    const result = await importTable(table.name, { skipIfEmpty: table.skipIfEmpty });
    results.tables[table.name] = result;
    results.totalImported += result.imported;
    results.totalErrors += result.errors;
  }

  // Итоговая статистика
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('-'.repeat(80));
  console.log(`✅ Всего импортировано: ${results.totalImported} записей`);
  console.log(`❌ Всего ошибок: ${results.totalErrors}`);
  
  console.log('\n📋 Детали по таблицам:');
  for (const [tableName, result] of Object.entries(results.tables)) {
    const status = result.errors > 0 ? '⚠️' : result.imported > 0 ? '✅' : '⚪';
    console.log(`   ${status} ${tableName}: ${result.imported} записей, ${result.errors} ошибок`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Следующие шаги:');
  console.log('1. Проверьте импортированные данные в Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${NEW_PROJECT_ID}/editor`);
  console.log('2. Если какие-то таблицы не импортировались, проверьте ошибки выше');
  console.log('3. Если у вас нет доступа к старой базе, используйте create-test-data.js');
}

// Запуск импорта
if (OLD_SERVICE_ROLE_KEY) {
  importAllData().catch(console.error);
} else {
  console.log('⚠️  Старая база данных не настроена.');
  console.log('Установите переменные окружения:');
  console.log('  OLD_PROJECT_ID=ijijcrucqqnnjbkclqhb');
  console.log('  OLD_SERVICE_ROLE_KEY=your_old_service_role_key');
  console.log('\nИли используйте скрипт create-test-data.js для создания тестовых данных');
}

