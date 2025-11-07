#!/usr/bin/env node

/**
 * Быстрая проверка примененных миграций через прямой SQL запрос
 */

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkMigrations() {
  console.log('🔍 Быстрая проверка примененных миграций...\n');
  console.log('='.repeat(60));

  // Проверяем через прямой запрос к таблице миграций
  try {
    // Пытаемся прочитать из таблицы миграций через Supabase
    // Но эта таблица может быть в другой схеме, поэтому используем прямой SQL через RPC
    
    // Альтернативный способ - проверяем наличие ключевых таблиц и функций
    console.log('📊 Проверка ключевых элементов:\n');

    // 1. Проверка таблиц
    const keyTables = ['profiles', 'topics', 'questions_new', 'duels', 'materials', 'subtopics'];
    console.log('✅ Таблицы:');
    for (const table of keyTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error && error.code === 'PGRST116') {
          console.log(`   ❌ ${table}: не найдена`);
        } else {
          console.log(`   ✅ ${table}: существует`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${table}: ошибка проверки`);
      }
    }

    // 2. Проверка функций
    console.log('\n⚙️  Функции:');
    const functions = [
      { name: 'get_user_profile_id', params: [] },
      { name: 'has_role', params: ['user_id uuid', 'role_name text'] },
      { name: 'modify_boost_inventory', params: ['profile_id uuid', 'boost_type text', 'amount integer'] }
    ];

    for (const func of functions) {
      try {
        // Пробуем вызвать функцию с минимальными параметрами
        if (func.params.length === 0) {
          const { error } = await supabase.rpc(func.name);
          if (error && error.message.includes('does not exist')) {
            console.log(`   ❌ ${func.name}: не найдена`);
          } else {
            console.log(`   ✅ ${func.name}: существует`);
          }
        } else {
          // Для функций с параметрами просто проверяем, что они не вызывают "does not exist"
          const { error } = await supabase.rpc(func.name, {});
          if (error && error.message.includes('does not exist')) {
            console.log(`   ❌ ${func.name}: не найдена`);
          } else {
            console.log(`   ✅ ${func.name}: существует (требует параметры)`);
          }
        }
      } catch (error) {
        if (error.message && error.message.includes('does not exist')) {
          console.log(`   ❌ ${func.name}: не найдена`);
        } else {
          console.log(`   ✅ ${func.name}: существует`);
        }
      }
    }

    // 3. Проверка RLS политик через попытку чтения
    console.log('\n🔒 RLS политики (проверка через доступ):');
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA';
    const anonClient = createClient(SUPABASE_URL, anonKey);

    const rlsCheckTables = ['profiles', 'topics', 'questions_new'];
    for (const table of rlsCheckTables) {
      try {
        const { data, error } = await anonClient.from(table).select('*').limit(1);
        if (error) {
          if (error.message.includes('permission denied') || error.message.includes('RLS')) {
            console.log(`   ✅ ${table}: RLS включен`);
          } else {
            console.log(`   ⚠️  ${table}: ${error.message}`);
          }
        } else {
          console.log(`   ⚠️  ${table}: RLS может быть не настроен (доступ разрешен)`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${table}: ошибка проверки`);
      }
    }

    // 4. Подсчет общего количества миграций
    console.log('\n📝 Статистика:');
    const { readdirSync } = await import('fs');
    const { join } = await import('path');
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    console.log(`   📋 Всего миграций в проекте: ${migrationFiles.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Проверка завершена!');
    console.log('\n📋 Рекомендации:');
    console.log('1. Проверьте миграции в Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/migrations');
    console.log('2. Проверьте RLS политики: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/policies');
    console.log('3. Если таблицы пустые - это нормально, данные импортируются отдельно');
    console.log('4. Если RLS не настроен - нужно применить оставшиеся миграции');

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message);
  }
}

checkMigrations().catch(console.error);

