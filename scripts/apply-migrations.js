<<<<<<< Current (Your changes)
=======
#!/usr/bin/env node

/**
 * Скрипт для автоматического применения миграций в Supabase
 * Использует Supabase Management API для применения миграций
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Конфигурация из config.toml
const PROJECT_ID = 'ijijcrucqqnnjbkclqhb';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

// Получаем access token из переменных окружения или Supabase CLI
async function getAccessToken() {
  // Проверяем переменную окружения
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }

  // Пытаемся получить из Supabase CLI
  try {
    const { execSync } = await import('child_process');
    const token = execSync('supabase access-token', { encoding: 'utf-8' }).trim();
    if (token) return token;
  } catch (error) {
    console.warn('⚠️  Supabase CLI не найден или не авторизован');
  }

  throw new Error(
    '❌ SUPABASE_ACCESS_TOKEN не установлен.\n' +
    'Установите переменную окружения SUPABASE_ACCESS_TOKEN или авторизуйтесь через Supabase CLI:\n' +
    '  supabase login\n' +
    '  supabase link --project-ref ' + PROJECT_ID
  );
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

// Применяем миграцию через Management API
async function applyMigration(migration, accessToken) {
  const migrationName = migration.name.replace('.sql', '');
  
  console.log(`📝 Применяю миграцию: ${migrationName}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_migration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      },
      body: JSON.stringify({
        migration_name: migrationName,
        sql: migration.content
      })
    });

    if (!response.ok) {
      // Альтернативный способ: прямой SQL запрос
      return await applyMigrationDirect(migration, accessToken);
    }

    const result = await response.json();
    console.log(`✅ Миграция ${migrationName} применена успешно`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при применении миграции ${migrationName}:`, error.message);
    return false;
  }
}

// Применяем миграцию напрямую через SQL Editor API
async function applyMigrationDirect(migration, accessToken) {
  const migrationName = migration.name.replace('.sql', '');
  
  console.log(`📝 Применяю миграцию напрямую: ${migrationName}`);

  try {
    // Используем SQL Editor API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      },
      body: JSON.stringify({
        query: migration.content
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log(`✅ Миграция ${migrationName} применена успешно`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при применении миграции ${migrationName}:`, error.message);
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🚀 Начинаю применение миграций...\n');

  try {
    // Получаем access token
    const accessToken = await getAccessToken();
    console.log('✅ Access token получен\n');

    // Получаем список миграций
    const migrations = getMigrations();
    console.log(`📋 Найдено миграций: ${migrations.length}\n`);

    // Применяем каждую миграцию
    let successCount = 0;
    let failCount = 0;

    for (const migration of migrations) {
      const success = await applyMigration(migration, accessToken);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      console.log(''); // Пустая строка для читаемости
    }

    // Итоги
    console.log('='.repeat(50));
    console.log(`✅ Успешно применено: ${successCount}`);
    if (failCount > 0) {
      console.log(`❌ Ошибок: ${failCount}`);
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
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
