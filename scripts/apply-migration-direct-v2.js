#!/usr/bin/env node

/**
 * Применение миграции через прямой SQL запрос к базе данных
 * Использует Edge Function apply-sql или прямой SQL запрос
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySQL(sql) {
  console.log('📝 Применяю SQL через Edge Function apply-sql...');
  
  try {
    const { data, error } = await supabase.functions.invoke('apply-sql', {
      body: { sql }
    });

    if (error) {
      throw error;
    }

    console.log('   ✅ SQL применен успешно');
    return { success: true, result: data };
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
    console.log('\n📋 Результат:', JSON.stringify(result, null, 2));
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

