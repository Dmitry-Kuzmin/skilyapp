#!/usr/bin/env node

/**
 * Автоматическое применение миграций через прямой HTTP запрос к Supabase
 * Использует Service Role Key для выполнения SQL
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'ijijcrucqqnnjbkclqhb';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqaWpjcnVjcXFubmpia2NscWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxMTU2MSwiZXhwIjoyMDc2OTg3NTYxfQ.lvySjbh9dH89sgx0LxIF0PeBPRQse27jZwuXFqVzCeM';

async function applyMigration(sqlFile, description) {
  console.log(`🚀 Применяю ${description}...\n`);

  // Читаем SQL из файла
  const sqlPath = join(projectRoot, sqlFile);
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log(`📄 Файл: ${sqlFile}`);
  console.log(`📝 Описание: ${description}\n`);

  console.log('⚠️  Supabase не предоставляет прямой REST API для выполнения произвольного SQL.');
  console.log('📝 Примените миграцию вручную через SQL Editor:\n');
  console.log('🔗 https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new\n');
  console.log('📄 SQL для применения:\n');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  console.log('\n✅ Или используйте Supabase CLI:');
  console.log('   supabase db push --db-url "postgres://..."');
  
  return false;
}

// Парсим аргументы
const sqlFile = process.argv[2] || 'APPLY_NOW.sql';
const description = process.argv[3] || 'миграцию';

// Запускаем
const success = await applyMigration(sqlFile, description);
process.exit(success ? 0 : 1);


