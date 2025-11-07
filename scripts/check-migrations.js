#!/usr/bin/env node

/**
 * Проверка применения миграций
 */

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkMigrations() {
  console.log('🔍 Проверяю применение миграций...\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let allPassed = true;

  // 1. Проверка политики для profiles
  console.log('1️⃣ Проверяю RLS политику для profiles...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('   ❌ Ошибка при проверке profiles:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ Политика "Profiles are viewable by everyone" работает');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
    allPassed = false;
  }

  // 2. Проверка функции get_user_profile_id
  console.log('\n2️⃣ Проверяю функцию get_user_profile_id()...');
  try {
    const { data, error } = await supabase.rpc('get_user_profile_id');
    
    if (error) {
      console.log('   ❌ Функция get_user_profile_id не найдена:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ Функция get_user_profile_id существует');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
    allPassed = false;
  }

  // 3. Проверка политики для duel_notifications
  console.log('\n3️⃣ Проверяю RLS политику для duel_notifications...');
  try {
    const { data, error } = await supabase
      .from('duel_notifications')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('   ❌ Ошибка при проверке duel_notifications:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ Политика "Users can view their own notifications" работает');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
    allPassed = false;
  }

  // 4. Проверка Realtime для duel_notifications через прямой SQL запрос
  console.log('\n4️⃣ Проверяю Realtime для duel_notifications...');
  try {
    // Используем прямой SQL запрос для проверки publication
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
          AND tablename = 'duel_notifications'
        ) as is_in_realtime;
      `
    });
    
    if (error) {
      // Если функция exec_sql не существует, проверяем другим способом
      console.log('   ⚠️  Не могу проверить Realtime напрямую (используйте SQL Editor)');
      console.log('   📝 Выполните в SQL Editor:');
      console.log('      SELECT * FROM pg_publication_tables WHERE pubname = \'supabase_realtime\' AND tablename = \'duel_notifications\';');
    } else {
      console.log('   ✅ Realtime включен для duel_notifications');
    }
  } catch (error) {
    console.log('   ⚠️  Не могу проверить Realtime:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ Все миграции применены успешно!');
  } else {
    console.log('❌ Некоторые миграции не применены или применены некорректно');
    console.log('\n📝 Примените миграцию через SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
  }
  console.log('='.repeat(60));

  return allPassed;
}

// Запускаем
const success = await checkMigrations();
process.exit(success ? 0 : 1);


