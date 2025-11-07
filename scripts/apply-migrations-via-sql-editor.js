#!/usr/bin/env node

/**
 * Применение миграций через SQL Editor API
 * Использует Service Role Key для выполнения SQL
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY не установлен');
  console.log('\n📝 Для применения миграций через API нужен Service Role Key.');
  console.log('\n🔑 Получить Service Role Key:');
  console.log('1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api');
  console.log('2. Найдите раздел "Project API keys"');
  console.log('3. Скопируйте "service_role" key (секретный!)');
  console.log('4. Установите: export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.log('5. Затем запустите этот скрипт снова');
  console.log('\n📋 Или примените миграции вручную через SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new');
  process.exit(1);
}

// Читаем все миграции из папки
function getMigrations() {
  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const filePath = join(migrationsDir, file);
      const stats = statSync(filePath);
      return {
        name: file,
        path: filePath,
        content: readFileSync(filePath, 'utf-8'),
        modified: stats.mtime
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return files;
}

// Применяем миграцию через SQL Editor API
async function applyMigration(migration) {
  const migrationName = migration.name.replace('.sql', '');
  
  console.log(`📝 Применяю миграцию: ${migrationName}`);

  try {
    // Используем Supabase Management API для выполнения SQL
    // Примечание: Supabase не предоставляет прямой REST API для произвольного SQL
    // Поэтому используем альтернативный метод - через Edge Function или напрямую через psql
    
    // Попробуем использовать REST API для выполнения SQL через RPC функцию
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        query: migration.content
      })
    });

    if (!response.ok) {
      // Если RPC не существует, используем альтернативный метод
      console.log(`⚠️  Автоматическое применение через API не удалось для ${migrationName}`);
      console.log(`📝 Примените миграцию вручную через SQL Editor:`);
      console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
      console.log(`📄 Файл: ${migration.name}\n`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Миграция ${migrationName} применена успешно`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при применении миграции ${migrationName}:`, error.message);
    console.log(`📝 Примените миграцию вручную через SQL Editor:`);
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
    console.log(`📄 Файл: ${migration.name}\n`);
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🚀 Начинаю применение миграций через SQL Editor API...\n');
  console.log('⚠️  Примечание: Supabase не предоставляет прямой REST API для произвольного SQL.');
  console.log('📝 Рекомендуется использовать Supabase CLI или применить миграции вручную.\n');

  try {
    // Получаем список миграций
    const migrations = getMigrations();
    console.log(`📋 Найдено миграций: ${migrations.length}\n`);

    // Применяем каждую миграцию
    let successCount = 0;
    let failCount = 0;

    for (const migration of migrations) {
      const success = await applyMigration(migration);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      // Небольшая задержка между миграциями
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Итоги
    console.log('='.repeat(50));
    console.log(`✅ Успешно применено: ${successCount}`);
    if (failCount > 0) {
      console.log(`❌ Ошибок: ${failCount}`);
      console.log(`\n📝 Примените оставшиеся миграции вручную через SQL Editor:`);
      console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
    }
    console.log('='.repeat(50));

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем скрипт
main();

