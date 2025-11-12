#!/usr/bin/env node

/**
 * Скрипт для деплоя Edge Function через Supabase CLI
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

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
  // Используем npx для запуска Supabase CLI (не требует глобальной установки)
  const SUPABASE_CMD = 'npx supabase';
  
  // Проверяем доступность Supabase CLI через npx
  console.log('1️⃣ Проверяю Supabase CLI через npx...');
  try {
    execSync(`${SUPABASE_CMD} --version`, { stdio: 'ignore' });
    console.log('✅ Supabase CLI доступен через npx\n');
  } catch (error) {
    console.error('❌ Supabase CLI недоступен через npx');
    console.log('📦 Установите зависимости: npm install');
    process.exit(1);
  }

  // Проверяем авторизацию или наличие токена
  console.log('2️⃣ Проверяю авторизацию...');
  
  // Пытаемся получить токен из разных источников
  let accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  // Пытаемся прочитать токен из файла (если авторизация была выполнена ранее)
  if (!accessToken) {
    const tokenFile = join(homedir(), '.supabase', 'access-token');
    if (existsSync(tokenFile)) {
      try {
        accessToken = readFileSync(tokenFile, 'utf-8').trim();
        console.log('✅ Используется сохраненный токен из ~/.supabase/access-token\n');
      } catch (error) {
        // Игнорируем ошибку чтения файла
      }
    }
  }
  
  if (accessToken) {
    if (!process.env.SUPABASE_ACCESS_TOKEN) {
      console.log('✅ Используется токен из переменной окружения SUPABASE_ACCESS_TOKEN\n');
    }
  } else {
    // Пытаемся проверить авторизацию, но не блокируем деплой
    // (авторизация может быть сохранена в другом месте)
    try {
      execSync(`${SUPABASE_CMD} projects list`, { stdio: 'ignore' });
    console.log('✅ Авторизован\n');
  } catch (error) {
      console.warn('⚠️  Авторизация не проверена (может потребоваться при деплое)');
      console.log('💡 Если деплой не удастся, выполните авторизацию:');
      console.log('   npx supabase login');
      console.log('   Или установите: export SUPABASE_ACCESS_TOKEN="your-token"');
      console.log('   Получить токен: https://supabase.com/dashboard/account/tokens');
      console.log('   📖 Подробнее: см. DEPLOY_EDGE_FUNCTION.md\n');
    }
  }

  // Деплоим функцию
  console.log(`3️⃣ Деплою функцию ${FUNCTION_NAME}...\n`);
  
  // Если есть токен, передаем его через переменную окружения
  const deployEnv = { ...process.env };
  if (accessToken) {
    deployEnv.SUPABASE_ACCESS_TOKEN = accessToken;
  }
  
  try {
    execSync(`${SUPABASE_CMD} functions deploy ${FUNCTION_NAME}`, {
    stdio: 'inherit',
      cwd: projectRoot,
      env: deployEnv
  });
  } catch (error) {
    console.error(`\n❌ Ошибка при деплое функции ${FUNCTION_NAME}`);
    console.error('💡 Возможные причины:');
    console.error('   1. Не авторизован в Supabase - выполните: npx supabase login');
    console.error('   2. Неправильный project_ref - проверьте конфигурацию');
    console.error('   3. Нет доступа к проекту - проверьте права доступа');
    throw error;
  }

  console.log(`\n✅ Функция ${FUNCTION_NAME} успешно задеплоена!`);
  console.log(`\n📊 Проверьте логи: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/${FUNCTION_NAME}/logs`);

} catch (error) {
  console.error(`\n❌ Ошибка при деплое функции ${FUNCTION_NAME}:`, error.message);
  process.exit(1);
}
