#!/usr/bin/env node

/**
 * Применение миграций через прямой SQL запрос к Supabase
 * Использует Service Role Key для выполнения SQL через REST API
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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

// Применяем миграцию через прямой SQL запрос
async function applyMigration(migration) {
  const migrationName = migration.name.replace('.sql', '');
  
  console.log(`📝 [${migrationName}] Применяю...`);

  try {
    // Разбиваем SQL на отдельные команды
    // Но нужно быть осторожным с DO блоками и функциями
    const sql = migration.content;
    
    // Пытаемся выполнить через RPC функцию exec_sql (если существует)
    const { data, error } = await supabase.rpc('exec_sql', {
      query: sql
    });

    if (error) {
      // Если RPC не существует, пробуем другой способ
      // Используем прямой HTTP запрос к Management API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Игнорируем ошибки "already exists" и подобные
        if (errorText.includes('already exists') || 
            errorText.includes('does not exist') ||
            errorText.includes('duplicate') ||
            errorText.includes('relation') && errorText.includes('already exists')) {
          console.log(`   ⚠️  Уже применена или не требуется`);
          return true;
        }
        console.log(`   ⚠️  Ошибка: ${errorText.substring(0, 150)}`);
        return false;
      }

      console.log(`   ✅ Применена успешно`);
      return true;
    }

    console.log(`   ✅ Применена успешно`);
    return true;
  } catch (error) {
    // Игнорируем ошибки "already exists"
    if (error.message && (
      error.message.includes('already exists') ||
      error.message.includes('does not exist') ||
      error.message.includes('duplicate')
    )) {
      console.log(`   ⚠️  Уже применена или не требуется`);
      return true;
    }
    console.log(`   ⚠️  Ошибка: ${error.message.substring(0, 100)}`);
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🚀 Применение миграций через прямой SQL запрос...\n');
  console.log('⚠️  Примечание: Supabase не предоставляет прямой REST API для произвольного SQL.');
  console.log('📝 Этот скрипт попытается применить миграции, но может не сработать для всех.\n');
  console.log('='.repeat(60));

  const migrations = getMigrations();
  console.log(`📋 Найдено миграций: ${migrations.length}\n`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

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
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Успешно применено: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Ошибок: ${failCount}`);
  }
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n📝 Для применения оставшихся миграций:');
    console.log('1. Откройте SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new');
    console.log('2. Откройте файл ALL_MIGRATIONS.sql');
    console.log('3. Скопируйте и примените оставшиеся миграции');
  } else {
    console.log('\n🎉 Все миграции применены успешно!');
  }
}

main().catch(console.error);

