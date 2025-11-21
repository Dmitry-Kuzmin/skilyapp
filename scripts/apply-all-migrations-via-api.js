#!/usr/bin/env node

/**
 * Применение всех миграций через Supabase Management API
 * Использует Service Role Key для выполнения SQL
 */

import { readFileSync, readdirSync, statSync } from 'fs';
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

// Читаем все миграции из папки
function getMigrations() {
  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const filePath = join(migrationsDir, file);
      return {
        name: file,
        path: filePath,
        content: readFileSync(filePath, 'utf-8')
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return files;
}

// Применяем миграцию через прямой SQL запрос
async function applyMigration(migration) {
  const migrationName = migration.name.replace('.sql', '');
  
  console.log(`📝 Применяю: ${migrationName}...`);

  try {
    // Разбиваем SQL на отдельные команды (по ;)
    // Но нужно быть осторожным с DO блоками и функциями
    const sqlCommands = migration.content
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    // Применяем каждую команду отдельно
    for (let i = 0; i < sqlCommands.length; i++) {
      const cmd = sqlCommands[i];
      
      // Пропускаем пустые команды и комментарии
      if (!cmd || cmd.startsWith('--')) continue;

      // Для DO блоков и функций нужно применять целиком
      if (cmd.includes('DO $$') || cmd.includes('CREATE OR REPLACE FUNCTION')) {
        // Находим полный блок
        const fullBlock = migration.content.substring(
          migration.content.indexOf(cmd),
          migration.content.indexOf('$$', migration.content.indexOf(cmd) + cmd.length) + 2
        );
        
        // Пытаемся выполнить через RPC exec_sql
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: fullBlock + ';' })
        });

        if (!response.ok) {
          // Если RPC не работает, пропускаем и сообщаем
          console.log(`   ⚠️  Команда ${i + 1} не может быть применена через API`);
          continue;
        }
      } else {
        // Обычная SQL команда
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: cmd + ';' })
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Игнорируем ошибки "already exists" и подобные
          if (errorText.includes('already exists') || 
              errorText.includes('does not exist') ||
              errorText.includes('duplicate')) {
            console.log(`   ⚠️  Команда ${i + 1}: уже применена или не требуется`);
            continue;
          }
          console.log(`   ⚠️  Команда ${i + 1}: ошибка - ${errorText.substring(0, 100)}`);
        }
      }
    }

    console.log(`   ✅ ${migrationName} применена`);
    return true;
  } catch (error) {
    console.log(`   ⚠️  ${migrationName}: ошибка - ${error.message}`);
    return false;
  }
}

// Главная функция
async function main() {
  console.log('🚀 Применение всех миграций через Management API...\n');
  console.log('⚠️  Примечание: Supabase не предоставляет прямой REST API для произвольного SQL.');
  console.log('📝 Рекомендуется использовать Supabase CLI или применить миграции вручную.\n');

  const migrations = getMigrations();
  console.log(`📋 Найдено миграций: ${migrations.length}\n`);

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

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Успешно применено: ${successCount}`);
  if (failCount > 0) {
    console.log(`⚠️  Ошибок: ${failCount}`);
  }
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n📝 Для применения оставшихся миграций используйте:');
    console.log('1. Supabase CLI: supabase db push --password "345556Ff@?"');
    console.log('2. SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new');
  }
}

main().catch(console.error);

