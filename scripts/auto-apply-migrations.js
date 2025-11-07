#!/usr/bin/env node

/**
 * Автоматическое применение всех новых миграций
 * Использует Supabase Management API для применения миграций
 * 
 * Использование:
 *   node scripts/auto-apply-migrations.js                    # Применить все новые миграции
 *   node scripts/auto-apply-migrations.js <migration_file>   # Применить конкретную миграцию
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_e0fc4539dc610aa0bc5d969f82f4b3312cd8fcfc';

async function applySQL(sql) {
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'apikey': ACCESS_TOKEN
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Игнорируем ошибки "already exists" - это нормально для идемпотентных миграций
      if (errorText.includes('already exists') || 
          errorText.includes('does not exist') ||
          errorText.includes('duplicate') ||
          errorText.includes('already member')) {
        return { success: true, skipped: true, message: 'Уже применена' };
      }
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    throw error;
  }
}

async function applyMigration(migrationPath) {
  const migrationName = migrationPath.split('/').pop();
  console.log(`📝 [${migrationName}] Применяю...`);

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    const result = await applySQL(sql);

    if (result.skipped) {
      console.log(`   ⚠️  ${result.message}`);
    } else {
      console.log(`   ✅ Применена успешно`);
    }
    return { success: true, skipped: result.skipped };
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function applyAllMigrations() {
  console.log('🚀 Автоматическое применение миграций\n');
  console.log('='.repeat(80));

  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  
  if (!readdirSync(migrationsDir).some(f => f.endsWith('.sql'))) {
    console.log('📋 Миграции не найдены');
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`📋 Найдено миграций: ${files.length}\n`);

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const migrationPath = join(migrationsDir, file);
    const result = await applyMigration(migrationPath);
    
    if (result.success) {
      if (result.skipped) {
        skipped++;
      } else {
        applied++;
      }
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Применено: ${applied}`);
  if (skipped > 0) {
    console.log(`⚠️  Пропущено (уже применены): ${skipped}`);
  }
  if (failed > 0) {
    console.log(`❌ Ошибок: ${failed}`);
  }
  console.log('='.repeat(80));
}

// Применяем конкретную миграцию или все новые
const migrationFile = process.argv[2];

if (migrationFile) {
  const migrationPath = migrationFile.startsWith('/') ? migrationFile : join(projectRoot, migrationFile);
  applyMigration(migrationPath).then(result => {
    if (!result.success) {
      process.exit(1);
    }
  }).catch(console.error);
} else {
  applyAllMigrations().catch(console.error);
}

