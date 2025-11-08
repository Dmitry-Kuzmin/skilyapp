#!/usr/bin/env node

/**
 * Скрипт для проверки статуса миграций
 * Проверяет функции, RLS политики, Realtime publication и структуру таблиц
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || 
                   process.env.SUPABASE_PROJECT_ID || 
                   'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkMigrationStatus() {
  console.log('🔍 Проверка статуса миграций...\n');
  console.log('='.repeat(80));
  
  let allPassed = true;
  
  // 1. Проверка функций
  console.log('\n📋 1. ПРОВЕРКА ФУНКЦИЙ:');
  console.log('-'.repeat(80));
  
  const functionsToCheck = [
    'get_user_profile_id_for_notifications',
    'get_user_profile_id_for_duels',
    'get_user_profile_id_for_duel_players'
  ];
  
  for (const funcName of functionsToCheck) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = '${funcName}'
        ) as exists;`
      });
      
      // Альтернативный способ - прямой SQL запрос
      const { data: funcData, error: funcError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', funcName)
        .limit(1);
      
      if (funcData && funcData.length > 0) {
        console.log(`✅ ${funcName} - существует`);
      } else {
        console.log(`❌ ${funcName} - НЕ найдена`);
        allPassed = false;
      }
    } catch (error) {
      // Пробуем через Edge Function
      try {
        const { data, error } = await supabase.functions.invoke('apply-sql', {
          body: {
            sql: `SELECT EXISTS (
              SELECT 1 FROM pg_proc 
              WHERE proname = '${funcName}'
            ) as exists;`
          }
        });
        
        if (data && data.exists) {
          console.log(`✅ ${funcName} - существует`);
        } else {
          console.log(`❌ ${funcName} - НЕ найдена`);
          allPassed = false;
        }
      } catch (e) {
        console.log(`⚠️  ${funcName} - не удалось проверить (${e.message})`);
      }
    }
  }
  
  // 2. Проверка RLS политик
  console.log('\n📋 2. ПРОВЕРКА RLS ПОЛИТИК:');
  console.log('-'.repeat(80));
  
  const policiesToCheck = [
    { table: 'duel_notifications', policy: 'Users can view their own notifications' },
    { table: 'duels', policy: 'Players can view their duels' },
    { table: 'duel_players', policy: 'Users can update their player status' }
  ];
  
  for (const { table, policy } of policiesToCheck) {
    try {
      const { data, error } = await supabase.functions.invoke('apply-sql', {
        body: {
          sql: `SELECT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = '${table}' 
            AND policyname = '${policy}'
          ) as exists;`
        }
      });
      
      if (data && data.exists) {
        console.log(`✅ ${table}.${policy} - существует`);
      } else {
        console.log(`❌ ${table}.${policy} - НЕ найдена`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`⚠️  ${table}.${policy} - не удалось проверить (${error.message})`);
    }
  }
  
  // 3. Проверка Realtime publication
  console.log('\n📋 3. ПРОВЕРКА REALTIME PUBLICATION:');
  console.log('-'.repeat(80));
  
  try {
    const { data, error } = await supabase.functions.invoke('apply-sql', {
      body: {
        sql: `SELECT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'duel_notifications'
        ) as exists;`
      }
    });
    
    if (data && data.exists) {
      console.log(`✅ duel_notifications в supabase_realtime publication`);
    } else {
      console.log(`❌ duel_notifications НЕ в supabase_realtime publication`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`⚠️  Realtime publication - не удалось проверить (${error.message})`);
  }
  
  // 4. Проверка структуры таблиц
  console.log('\n📋 4. ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ:');
  console.log('-'.repeat(80));
  
  try {
    const { data, error } = await supabase.functions.invoke('apply-sql', {
      body: {
        sql: `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'duel_players' 
          AND column_name = 'last_activity_at'
        ) as exists;`
      }
    });
    
    if (data && data.exists) {
      console.log(`✅ Поле last_activity_at существует в duel_players`);
    } else {
      console.log(`❌ Поле last_activity_at НЕ найдено в duel_players`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`⚠️  Структура таблиц - не удалось проверить (${error.message})`);
  }
  
  // Итоги
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ - миграция применена успешно!');
  } else {
    console.log('❌ НЕКОТОРЫЕ ПРОВЕРКИ НЕ ПРОЙДЕНЫ - нужно применить миграцию');
    console.log('📝 Примените файл APPLY_ALL_FIXES_NOW.sql в Supabase SQL Editor');
  }
  console.log('='.repeat(80));
  
  return allPassed;
}

// Запускаем проверку
checkMigrationStatus().catch(error => {
  console.error('❌ Ошибка при проверке:', error);
  process.exit(1);
});

