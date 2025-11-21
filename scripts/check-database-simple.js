#!/usr/bin/env node

/**
 * Простая проверка состояния базы данных
 */

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required!');
  console.error('Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabase() {
  console.log('🔍 Проверка состояния базы данных...\n');
  console.log('='.repeat(60));

  // Список основных таблиц для проверки
  const mainTables = [
    'profiles',
    'topics',
    'questions_new',
    'user_progress',
    'duels',
    'duel_players',
    'duel_notifications',
    'game_sessions',
    'tags',
    'question_tags',
    'language_terms',
    'road_signs',
    'subtopics',
    'materials',
    'topic_tests',
    'user_topic_progress'
  ];

  console.log('\n📊 Проверка таблиц и данных:');
  let tablesFound = 0;
  let tablesWithData = 0;

  for (const table of mainTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`   ❌ ${table}: таблица не найдена`);
        } else {
          console.log(`   ⚠️  ${table}: ошибка - ${error.message}`);
        }
      } else {
        tablesFound++;
        const recordCount = count || 0;
        if (recordCount > 0) {
          tablesWithData++;
          console.log(`   ✅ ${table}: ${recordCount} записей`);
        } else {
          console.log(`   ⚠️  ${table}: таблица существует, но пуста (0 записей)`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${table}: ошибка - ${error.message}`);
    }
  }

  console.log(`\n📈 Итого: ${tablesFound} таблиц найдено, ${tablesWithData} с данными`);

  // Проверка функций
  console.log('\n⚙️  Проверка функций:');
  const functions = ['get_user_profile_id', 'has_role', 'modify_boost_inventory'];
  
  for (const func of functions) {
    try {
      const { data, error } = await supabase.rpc(func);
      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`   ❌ ${func}: функция не найдена`);
        } else {
          console.log(`   ⚠️  ${func}: ошибка при вызове - ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${func}: функция существует`);
      }
    } catch (error) {
      console.log(`   ❌ ${func}: ошибка - ${error.message}`);
    }
  }

  // Проверка RLS через попытку чтения
  console.log('\n🔒 Проверка RLS (через попытку чтения с anon key):');
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!anonKey) {
    console.log('   ⚠️  Anon key не установлен, пропускаем проверку RLS через anon client');
    return;
  }
  const anonClient = createClient(SUPABASE_URL, anonKey);

  const rlsTables = ['profiles', 'topics', 'questions_new'];
  for (const table of rlsTables) {
    try {
      const { data, error } = await anonClient.from(table).select('*').limit(1);
      if (error) {
        if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          console.log(`   ✅ ${table}: RLS включен (доступ ограничен)`);
        } else {
          console.log(`   ⚠️  ${table}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  ${table}: RLS может быть не настроен (доступ разрешен)`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${table}: ошибка проверки RLS`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Следующие шаги:');
  console.log('1. Проверьте таблицы в Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/editor');
  console.log('2. Проверьте RLS политики: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/policies');
  console.log('3. Проверьте примененные миграции: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/migrations');
  console.log('4. Если таблицы пустые - это нормально, данные нужно импортировать отдельно');
  console.log('5. Если RLS политики отсутствуют - нужно применить оставшиеся миграции');
}

checkDatabase().catch(console.error);

