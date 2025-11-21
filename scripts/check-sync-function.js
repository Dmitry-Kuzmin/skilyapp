#!/usr/bin/env node

/**
 * Скрипт для проверки Edge Function sync-google-sheets
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

async function checkSyncFunction() {
  console.log('🔍 Проверка Edge Function sync-google-sheets...\n');
  console.log('='.repeat(80));

  // 1. Проверяем, что функция существует
  console.log('\n📋 1. Проверка существования функции...');
  try {
    // Пробуем вызвать функцию (даже если она вернет ошибку, это значит, что она существует)
    const { data, error } = await supabase.functions.invoke('sync-google-sheets', {
      body: {}
    });

    if (error) {
      // Если ошибка связана с авторизацией или конфигурацией, функция существует
      if (error.message.includes('Missing authorization') || 
          error.message.includes('Unauthorized') ||
          error.message.includes('GOOGLE_SHEETS_ID') ||
          error.message.includes('Forbidden')) {
        console.log('   ✅ Функция существует');
        console.log(`   ⚠️  Ошибка: ${error.message}`);
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        console.log('   ❌ Функция не найдена (не задеплоена)');
        console.log('   📝 Нужно задеплоить функцию: supabase functions deploy sync-google-sheets');
        return;
      } else {
        console.log(`   ⚠️  Ошибка: ${error.message}`);
      }
    } else {
      console.log('   ✅ Функция существует и работает');
    }
  } catch (error) {
    console.log(`   ❌ Исключение: ${error.message}`);
  }

  // 2. Проверяем переменные окружения (secrets)
  console.log('\n🔐 2. Проверка переменных окружения (secrets)...');
  console.log('   ℹ️  Проверьте в Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/settings');
  console.log('   📋 Необходимые secrets:');
  console.log('      - SUPABASE_URL');
  console.log('      - SUPABASE_SERVICE_ROLE_KEY');
  console.log('      - GOOGLE_SHEETS_ID (ID таблицы Google Sheets)');

  // 3. Проверяем роль admin для пользователя
  console.log('\n👤 3. Проверка роли admin...');
  try {
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log(`   ⚠️  Ошибка получения пользователей: ${usersError.message}`);
    } else {
      const adminUsers = [];
      for (const user of users.users) {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        if (!rolesError && roles && roles.length > 0) {
          adminUsers.push({ email: user.email, id: user.id });
        }
      }
      
      if (adminUsers.length > 0) {
        console.log(`   ✅ Найдено администраторов: ${adminUsers.length}`);
        adminUsers.forEach(admin => {
          console.log(`      - ${admin.email} (ID: ${admin.id})`);
        });
      } else {
        console.log('   ⚠️  Администраторы не найдены');
        console.log('   📝 Используйте скрипт: node scripts/grant-admin-role.js <email>');
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Ошибка проверки ролей: ${error.message}`);
  }

  // 4. Проверяем наличие таблиц
  console.log('\n📊 4. Проверка необходимых таблиц...');
  const requiredTables = ['topics', 'questions_new', 'answer_options', 'tags', 'question_tags'];
  
  for (const table of requiredTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: ошибка - ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: существует (${count || 0} записей)`);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: ошибка - ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Рекомендации:');
  console.log('1. Проверьте, что функция задеплоена:');
  console.log('   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions');
  console.log('2. Проверьте secrets (переменные окружения):');
  console.log('   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/settings');
  console.log('3. Проверьте логи функции:');
  console.log('   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs');
  console.log('4. Убедитесь, что у пользователя есть роль admin');
  console.log('5. Убедитесь, что Google Sheets таблица доступна публично или настроен доступ');
}

checkSyncFunction().catch(console.error);

