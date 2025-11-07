#!/usr/bin/env node

/**
 * Автоматическое применение миграций через Supabase Management API
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
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_e0fc4539dc610aa0bc5d969f82f4b3312cd8fcfc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySQL(sql) {
  console.log('📝 Применяю SQL...');
  
  try {
    // Пробуем через Management API
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
    console.log(`   ⚠️  Ошибка через Management API: ${error.message}`);
    
    // Пробуем через Edge Function apply-sql (если существует)
    try {
      const { data, error: funcError } = await supabase.functions.invoke('apply-sql', {
        body: { sql }
      });

      if (funcError) {
        throw funcError;
      }

      console.log('   ✅ SQL применен через Edge Function');
      return { success: true, result: data };
    } catch (funcError) {
      console.log(`   ⚠️  Ошибка через Edge Function: ${funcError.message}`);
      throw error;
    }
  }
}

async function applyMigration(migrationPath) {
  console.log(`\n🚀 Применение миграции: ${migrationPath}\n`);
  console.log('='.repeat(80));

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Разбиваем SQL на отдельные команды (разделитель - точка с запятой)
    // Но нужно быть осторожным с DO блоками и функциями
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Найдено SQL команд: ${statements.length}`);

    // Применяем все команды вместе (как один запрос)
    const result = await applySQL(sql);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Миграция применена успешно!');
    return true;
  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.log(`❌ Ошибка применения миграции: ${error.message}`);
    console.log('\n📝 Попробуйте применить миграцию вручную через SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
    return false;
  }
}

// Применяем конкретную миграцию
const migrationFile = process.argv[2] || 'supabase/migrations/20251107150000_fix_source_id_unique_constraint.sql';
const migrationPath = migrationFile.startsWith('/') ? migrationFile : join(projectRoot, migrationFile);

applyMigration(migrationPath).catch(console.error);
