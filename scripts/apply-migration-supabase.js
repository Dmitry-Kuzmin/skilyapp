#!/usr/bin/env node

/**
 * Автоматическое применение миграций через Supabase Management API
 * Использует Service Role Key для выполнения SQL через REST API
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY не установлен');
    process.exit(1);
  }

  try {
    // Создаем клиент с Service Role Key
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Подключено к Supabase\n');

    // Разбиваем SQL на отдельные команды (по ;)
    // Но Supabase не поддерживает произвольный SQL через REST API
    // Поэтому используем прямой HTTP запрос к Management API
    
    console.log('📤 Отправляю SQL через Management API...\n');

    // Используем прямой REST API вызов для выполнения SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // Если RPC не существует, используем альтернативный метод
      // Supabase не предоставляет прямой endpoint для SQL
      console.log('⚠️  Supabase не предоставляет прямой REST API для выполнения произвольного SQL.');
      console.log('📝 Используем альтернативный метод - создание Edge Function для выполнения SQL...\n');
      
      // Создаем временную Edge Function для выполнения SQL
      return await executeViaEdgeFunction(sql);
    }

    const result = await response.json();
    console.log('✅ Миграция успешно применена!\n');
    return true;

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n📝 Попробуем использовать прямой SQL запрос через Supabase JS Client...\n');
    
    // Альтернативный метод - через Supabase JS Client
    return await executeViaClient(sql);
  }
}

async function executeViaEdgeFunction(sql) {
  // Этот метод не будет работать, так как нужно создать Edge Function
  // Лучше использовать прямой psql или Supabase CLI
  console.log('📝 Для выполнения SQL через Edge Function нужно:');
  console.log('1. Создать Edge Function для выполнения SQL');
  console.log('2. Или использовать Supabase CLI');
  console.log('3. Или применить вручную через SQL Editor\n');
  
  console.log('🔗 SQL Editor: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new\n');
  console.log('📄 SQL для применения:\n');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  
  return false;
}

async function executeViaClient(sql) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Supabase JS Client не поддерживает произвольный SQL
    // Но можно использовать RPC функции
    console.log('⚠️  Supabase JS Client не поддерживает произвольный SQL напрямую.');
    console.log('📝 Примените миграцию вручную через SQL Editor:\n');
    console.log('🔗 https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/sql/new\n');
    
    return false;
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return false;
  }
}

// Парсим аргументы
const sqlFile = process.argv[2] || 'APPLY_NOW.sql';
const description = process.argv[3] || 'миграцию';

// Запускаем
const success = await applyMigration(sqlFile, description);
process.exit(success ? 0 : 1);


