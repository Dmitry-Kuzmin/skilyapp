<<<<<<< Current (Your changes)
=======
#!/usr/bin/env node

/**
 * Скрипт для деплоя Edge Function через Supabase CLI
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const FUNCTION_NAME = process.argv[2] || 'duel-manager';
const FUNCTION_PATH = join(projectRoot, 'supabase', 'functions', FUNCTION_NAME);

console.log(`🚀 Деплой Edge Function: ${FUNCTION_NAME}\n`);

// Проверяем существование функции
if (!existsSync(FUNCTION_PATH)) {
  console.error(`❌ Функция ${FUNCTION_NAME} не найдена в ${FUNCTION_PATH}`);
  process.exit(1);
}

// Проверяем наличие index.ts
const indexPath = join(FUNCTION_PATH, 'index.ts');
if (!existsSync(indexPath)) {
  console.error(`❌ index.ts не найден в ${FUNCTION_PATH}`);
  process.exit(1);
}

try {
  // Проверяем, установлен ли Supabase CLI
  console.log('1️⃣ Проверяю Supabase CLI...');
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    console.log('✅ Supabase CLI установлен\n');
  } catch (error) {
    console.error('❌ Supabase CLI не установлен');
    console.log('📦 Установите через: npm install -g supabase');
    process.exit(1);
  }

  // Проверяем авторизацию
  console.log('2️⃣ Проверяю авторизацию...');
  try {
    execSync('supabase projects list', { stdio: 'ignore' });
    console.log('✅ Авторизован\n');
  } catch (error) {
    console.error('❌ Не авторизован в Supabase');
    console.log('🔐 Выполните: supabase login');
    process.exit(1);
  }

  // Деплоим функцию
  console.log(`3️⃣ Деплою функцию ${FUNCTION_NAME}...\n`);
  execSync(`supabase functions deploy ${FUNCTION_NAME}`, {
    stdio: 'inherit',
    cwd: projectRoot
  });

  console.log(`\n✅ Функция ${FUNCTION_NAME} успешно задеплоена!`);
  console.log(`\n📊 Проверьте логи: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions/${FUNCTION_NAME}/logs`);

} catch (error) {
  console.error(`\n❌ Ошибка при деплое функции ${FUNCTION_NAME}:`, error.message);
  process.exit(1);
}
>>>>>>> Incoming (Background Agent changes)
