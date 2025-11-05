#!/usr/bin/env node

/**
 * Применение срочного исправления URGENT_FIX.sql через Supabase Management API
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'ijijcrucqqnnjbkclqhb';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

async function applyUrgentFix() {
  console.log('🚨 Применяю срочное исправление URGENT_FIX.sql...\n');

  // Читаем SQL из файла
  const sqlFile = join(projectRoot, 'URGENT_FIX.sql');
  const sql = readFileSync(sqlFile, 'utf-8');

  // Проверяем наличие Service Role Key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY не установлен');
    console.log('\n📝 Для автоматического применения миграции нужен Service Role Key.');
    console.log('\n🔑 Получить Service Role Key:');
    console.log('1. Откройте: https://supabase.com/dashboard/project/' + PROJECT_ID + '/settings/api');
    console.log('2. Найдите раздел "Project API keys"');
    console.log('3. Скопируйте "service_role" key (секретный!)');
    console.log('4. Установите: export SUPABASE_SERVICE_ROLE_KEY="your-key"');
    console.log('5. Затем запустите этот скрипт снова');
    console.log('\n📋 Или примените миграцию вручную:');
    console.log('1. Откройте: https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
    console.log('2. Скопируйте содержимое файла URGENT_FIX.sql');
    console.log('3. Вставьте в SQL Editor и нажмите Run');
    process.exit(1);
  }

  try {
    console.log('📤 Отправляю SQL в Supabase через Management API...\n');

    // Разбиваем SQL на отдельные команды (по ;)
    // Но некоторые команды могут быть в DO блоках, нужно обработать правильно
    const sqlCommands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Найдено ${sqlCommands.length} команд для выполнения\n`);

    // К сожалению, Supabase не предоставляет прямой API для выполнения произвольного SQL
    // через REST API. Нужно использовать Management API или выполнять через Dashboard.
    
    // Попробуем использовать pgAdmin API или другой метод
    // Но на самом деле, самый надежный способ - через SQL Editor в Dashboard
    
    console.log('⚠️  Supabase не предоставляет прямой REST API для выполнения произвольного SQL.');
    console.log('📝 Примените миграцию вручную через SQL Editor:\n');
    console.log('🔗 https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new\n');
    console.log('📄 Содержимое файла URGENT_FIX.sql:\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
    
    process.exit(1);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n📝 Примените миграцию вручную через SQL Editor.');
    console.log('Файл: URGENT_FIX.sql');
    process.exit(1);
  }
}

// Запускаем
applyUrgentFix();


