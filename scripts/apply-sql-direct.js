#!/usr/bin/env node

/**
 * Применение SQL миграции напрямую через Supabase Management API
 * Использует Service Role Key для выполнения SQL
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'ijijcrucqqnnjbkclqhb';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

async function applySQL(sqlFile, description) {
  console.log(`🚀 Применяю ${description}...\n`);

  // Читаем SQL из файла
  const sqlPath = join(projectRoot, sqlFile);
  const sql = readFileSync(sqlPath, 'utf-8');

  // Проверяем наличие Service Role Key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY не установлен');
    console.log('\n📝 Для применения миграции через API нужен Service Role Key.');
    console.log('\n🔑 Получить Service Role Key:');
    console.log('1. Задеплойте временную функцию: supabase/functions/get-service-key/');
    console.log('2. Откройте: https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/get-service-key');
    console.log('3. Скопируйте service_role_key из ответа');
    console.log('4. Установите: export SUPABASE_SERVICE_ROLE_KEY="your-key"');
    console.log('5. УДАЛИТЕ функцию get-service-key после использования!');
    console.log('\n📋 Или примените миграцию вручную через SQL Editor:');
    console.log('https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
    process.exit(1);
  }

  try {
    console.log('📤 Отправляю SQL в Supabase через Management API...\n');

    // Используем Supabase JS Client для выполнения SQL
    // Примечание: Supabase JS Client не поддерживает произвольный SQL напрямую
    // Нужно использовать другой подход - через pgAdmin API или напрямую через psql
    
    // Попробуем использовать REST API для выполнения SQL
    // Но Supabase не предоставляет прямой endpoint для произвольного SQL
    
    // Альтернатива: использовать Edge Function для выполнения SQL
    // Или использовать pgAdmin API, если доступен
    
    console.log('⚠️  Supabase не предоставляет прямой REST API для выполнения произвольного SQL.');
    console.log('📝 Примените миграцию вручную через SQL Editor:\n');
    console.log('🔗 https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new\n');
    console.log('📄 Содержимое файла:\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
    console.log('\n📋 Или используйте Service Role Key через Edge Function для выполнения SQL.');
    
    process.exit(1);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n📝 Примените миграцию вручную через SQL Editor.');
    console.log('Файл:', sqlFile);
    process.exit(1);
  }
}

// Парсим аргументы
const sqlFile = process.argv[2] || 'URGENT_FIX.sql';
const description = process.argv[3] || 'миграцию';

// Запускаем
applySQL(sqlFile, description);


