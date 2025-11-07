#!/usr/bin/env node

/**
 * Срочное применение миграции URGENT_FIX.sql через Supabase Management API
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
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
    console.log('\n📝 Для применения миграции через API нужен Service Role Key.');
    console.log('Получить его можно:');
    console.log('1. Supabase Dashboard → Settings → API');
    console.log('2. Скопировать "service_role" key (секретный!)');
    console.log('3. Установить: export SUPABASE_SERVICE_ROLE_KEY="your-key"');
    console.log('\nИли примените миграцию вручную через SQL Editor:');
    console.log('https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
    process.exit(1);
  }

  try {
    console.log('📤 Отправляю SQL в Supabase...\n');

    // Используем PostgREST для выполнения SQL
    // Примечание: PostgREST не поддерживает выполнение произвольного SQL напрямую
    // Нужно использовать Management API или другой способ
    
    // Попробуем через REST API (может не работать для произвольного SQL)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка при применении миграции:', errorText);
      console.log('\n⚠️  Автоматическое применение через API не удалось.');
      console.log('📝 Примените миграцию вручную:');
      console.log('1. Откройте: https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
      console.log('2. Скопируйте содержимое файла URGENT_FIX.sql');
      console.log('3. Вставьте в SQL Editor и нажмите Run');
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Миграция применена успешно!');
    console.log('Результат:', result);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n⚠️  Автоматическое применение через API не удалось.');
    console.log('📝 Примените миграцию вручную через SQL Editor.');
    console.log('Файл: URGENT_FIX.sql');
    process.exit(1);
  }
}

// Запускаем
applyUrgentFix();


