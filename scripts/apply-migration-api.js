#!/usr/bin/env node

/**
 * Применение миграции через Supabase Management API
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_e0fc4539dc610aa0bc5d969f82f4b3312cd8fcfc';

async function applySQL(sql) {
  console.log('📝 Применяю SQL через Management API...');
  
  try {
    // Используем Management API для выполнения SQL
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
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('   ✅ SQL применен успешно');
    return { success: true, result };
  } catch (error) {
    console.log(`   ⚠️  Ошибка: ${error.message}`);
    throw error;
  }
}

async function applyMigration(migrationPath) {
  console.log(`\n🚀 Применение миграции: ${migrationPath}\n`);
  console.log('='.repeat(80));

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log(`📋 SQL миграции (${sql.length} символов):`);
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));

    const result = await applySQL(sql);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Миграция применена успешно!');
    if (result.result) {
      console.log('\n📋 Результат:', JSON.stringify(result.result, null, 2));
    }
    return true;
  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.log(`❌ Ошибка применения миграции: ${error.message}`);
    console.log('\n📝 Попробуйте применить миграцию вручную через SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
    console.log('\n📋 SQL для копирования:');
    console.log('─'.repeat(80));
    try {
      const sql = readFileSync(migrationPath, 'utf-8');
      console.log(sql);
    } catch (e) {
      console.log('Не удалось прочитать файл миграции');
    }
    console.log('─'.repeat(80));
    return false;
  }
}

// Применяем конкретную миграцию
const migrationFile = process.argv[2] || 'supabase/migrations/20251107150000_fix_source_id_unique_constraint.sql';
const migrationPath = migrationFile.startsWith('/') ? migrationFile : join(projectRoot, migrationFile);

applyMigration(migrationPath).catch(console.error);

