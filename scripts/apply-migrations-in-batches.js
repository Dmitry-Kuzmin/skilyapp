#!/usr/bin/env node

/**
 * Применение миграций по частям через SQL Editor API
 * Использует Service Role Key
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';

// Читаем все миграции
function getMigrations() {
  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: join(migrationsDir, file),
      content: readFileSync(join(migrationsDir, file), 'utf-8')
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return files;
}

// Применяем миграцию через SQL Editor API
async function applyMigration(migration) {
  const migrationName = migration.name.replace('.sql', '');
  
  console.log(`📝 ${migrationName}...`);

  try {
    // Используем Supabase Management API для выполнения SQL
    // Примечание: Supabase не предоставляет прямой REST API для произвольного SQL
    // Поэтому используем альтернативный метод - через Edge Function apply-sql
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/apply-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql: migration.content })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ⚠️  Не применена через API: ${errorText.substring(0, 100)}`);
      console.log(`   📝 Примените вручную через SQL Editor:`);
      console.log(`      https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
      return false;
    }

    const result = await response.json();
    console.log(`   ✅ Применена успешно`);
    return true;
  } catch (error) {
    console.log(`   ⚠️  Ошибка: ${error.message}`);
    console.log(`   📝 Примените вручную через SQL Editor:`);
    console.log(`      https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🚀 Применение миграций через Edge Function apply-sql...\n');
  console.log('='.repeat(60));

  const migrations = getMigrations();
  console.log(`📋 Найдено миграций: ${migrations.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`[${i + 1}/${migrations.length}]`);
    
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Задержка между миграциями
    if (i < migrations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Успешно применено: ${successCount}`);
  if (failCount > 0) {
    console.log(`⚠️  Не применено: ${failCount}`);
    console.log(`\n📝 Для применения оставшихся миграций:`);
    console.log(`1. Откройте SQL Editor: https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
    console.log(`2. Откройте файл ALL_MIGRATIONS.sql`);
    console.log(`3. Скопируйте и примените оставшиеся миграции`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);

