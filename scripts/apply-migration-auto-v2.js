#!/usr/bin/env node

/**
 * Автоматическое применение миграций через Edge Function
 * Использует Service Role Key для выполнения SQL
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Получаем PROJECT_ID из переменных окружения или используем дефолтный
const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || 
                   process.env.SUPABASE_PROJECT_ID || 
                   'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL;

async function applyMigration(sqlFile, description) {
  console.log(`🚀 Применяю ${description}...\n`);

  // Читаем SQL из файла
  const sqlPath = join(projectRoot, sqlFile);
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log(`📄 Файл: ${sqlFile}`);
  console.log(`📝 Описание: ${description}\n`);

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY не установлен');
    process.exit(1);
  }

  try {
    console.log('📤 Отправляю SQL через Edge Function...\n');

    // Вызываем Edge Function для выполнения SQL
    const response = await fetch(`${SUPABASE_URL}/functions/v1/apply-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Ошибка при применении миграции:');
      console.error(result);
      
      if (response.status === 404) {
        console.log('\n⚠️  Edge Function apply-sql не найдена');
        console.log('📝 Нужно задеплоить функцию: supabase functions deploy apply-sql');
        console.log('📝 Или примените миграцию вручную через SQL Editor:');
        console.log(`🔗 https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new\n`);
      }
      
      return false;
    }

    console.log('✅ Миграция успешно применена!\n');
    console.log('Результат:', result);
    return true;

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n📝 Примените миграцию вручную через SQL Editor:');
    console.log(`🔗 https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new\n`);
    return false;
  }
}

// Парсим аргументы
const sqlFile = process.argv[2] || 'APPLY_NOW.sql';
const description = process.argv[3] || 'миграцию';

// Запускаем
const success = await applyMigration(sqlFile, description);
process.exit(success ? 0 : 1);


