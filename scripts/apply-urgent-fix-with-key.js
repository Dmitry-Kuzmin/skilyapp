#!/usr/bin/env node

/**
 * Применение URGENT_FIX.sql через Supabase Client с Service Role Key
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

async function applyUrgentFix() {
  console.log('🚨 Применяю срочное исправление URGENT_FIX.sql...\n');

  // Читаем SQL из файла
  const sqlFile = join(projectRoot, 'URGENT_FIX.sql');
  const sql = readFileSync(sqlFile, 'utf-8');

  // Получаем Service Role Key из аргументов или переменной окружения
  const serviceRoleKey = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY не указан');
    console.log('\n📝 Использование:');
    console.log('   node scripts/apply-urgent-fix-with-key.js <service-role-key>');
    console.log('   или: export SUPABASE_SERVICE_ROLE_KEY="ваш-ключ" && node scripts/apply-urgent-fix-with-key.js');
    console.log('\n📋 Или примените миграцию вручную через SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
    process.exit(1);
  }

  try {
    console.log('📤 Подключаюсь к Supabase...\n');

    // Создаем клиент с Service Role Key
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    // Разбиваем SQL на отдельные команды
    // Но Supabase JS Client не поддерживает произвольный SQL напрямую
    // Нужно использовать другой подход - через REST API для выполнения SQL
    
    console.log('⚠️  Supabase JS Client не поддерживает выполнение произвольного SQL напрямую.');
    console.log('📝 Примените миграцию вручную через SQL Editor:\n');
    console.log('🔗 https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new\n');
    console.log('📄 Содержимое файла URGENT_FIX.sql:\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
    console.log('\n✅ Или используйте Supabase CLI:');
    console.log('   supabase db push --db-url "postgres://..."');
    console.log('   (используйте db_url из ответа функции get-service-key)');
    
    process.exit(1);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n📝 Примените миграцию вручную через SQL Editor.');
    console.log('Файл: URGENT_FIX.sql');
    process.exit(1);
  }
}

// Запускаем
applyUrgentFix();


