#!/usr/bin/env node

/**
 * Скрипт для автоматического применения миграций Supabase
 * Использование: node scripts/apply-migration.js <путь_к_миграции>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Получаем переменные окружения
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY должны быть установлены');
  console.error('   Установите переменные окружения:');
  console.error('   export SUPABASE_URL="https://your-project.supabase.co"');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

// Получаем путь к миграции из аргументов
const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error('❌ Ошибка: Укажите путь к файлу миграции');
  console.error('   Использование: node scripts/apply-migration.js <путь_к_миграции>');
  process.exit(1);
}

// Читаем файл миграции
let migrationSQL;
try {
  const fullPath = join(process.cwd(), migrationPath);
  migrationSQL = readFileSync(fullPath, 'utf-8');
  console.log(`✅ Файл миграции прочитан: ${fullPath}`);
} catch (error) {
  console.error(`❌ Ошибка чтения файла миграции: ${error.message}`);
  process.exit(1);
}

// Создаем клиент Supabase с SERVICE_ROLE_KEY для выполнения SQL
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Применяем миграцию через RPC или прямой SQL запрос
async function applyMigration() {
  console.log('🔄 Применение миграции...');
  console.log(`📄 Файл: ${migrationPath}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
  
  try {
    // Используем Supabase Management API для выполнения SQL
    // Примечание: Supabase не предоставляет прямой REST API для произвольного SQL
    // Поэтому используем альтернативный подход через Edge Function или RPC
    
    // Вариант 1: Через Supabase REST API (если доступен)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });

    if (response.ok) {
      console.log('✅ Миграция применена успешно!');
      return;
    }

    // Если RPC недоступен, выводим инструкцию
    console.log('⚠️  Прямое применение через API недоступно');
    console.log('📋 Инструкция для ручного применения:');
    console.log('');
    console.log('1. Откройте Supabase Dashboard:');
    console.log(`   ${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/').split('.supabase.co')[0]}/sql/new`);
    console.log('');
    console.log('2. Скопируйте и выполните следующий SQL:');
    console.log('');
    console.log('---');
    console.log(migrationSQL);
    console.log('---');
    console.log('');
    console.log('3. Нажмите "Run" для выполнения');
    
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error.message);
    console.log('');
    console.log('📋 Инструкция для ручного применения:');
    console.log('');
    console.log('1. Откройте Supabase Dashboard → SQL Editor');
    console.log('2. Скопируйте содержимое файла миграции');
    console.log('3. Вставьте в SQL Editor и выполните');
    process.exit(1);
  }
}

// Запускаем применение
applyMigration().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

