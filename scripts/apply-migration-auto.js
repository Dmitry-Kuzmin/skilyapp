#!/usr/bin/env node

/**
 * Автоматическое применение миграций
 * Открывает SQL Editor с готовым SQL кодом
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'ijijcrucqqnnjbkclqhb';

async function applyMigration(sqlFile, description) {
  console.log(`🚀 Применяю ${description}...\n`);

  // Читаем SQL из файла
  const sqlPath = join(projectRoot, sqlFile);
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log(`📄 Файл: ${sqlFile}`);
  console.log(`📝 Описание: ${description}\n`);

  // URL для SQL Editor
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`;

  console.log('📝 Примените миграцию через SQL Editor:\n');
  console.log(`🔗 ${sqlEditorUrl}\n`);
  console.log('📄 SQL для применения:\n');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  console.log('\n');

  // Пытаемся открыть SQL Editor в браузере
  try {
    const platform = process.platform;
    let command;

    if (platform === 'darwin') {
      command = `open "${sqlEditorUrl}"`;
    } else if (platform === 'win32') {
      command = `start "" "${sqlEditorUrl}"`;
    } else {
      command = `xdg-open "${sqlEditorUrl}"`;
    }

    console.log('🌐 Открываю SQL Editor в браузере...\n');
    await execAsync(command);
    console.log('✅ SQL Editor открыт в браузере\n');
    console.log('📋 Инструкции:');
    console.log('1. Скопируйте SQL код выше');
    console.log('2. Вставьте в SQL Editor');
    console.log('3. Нажмите Run (или Ctrl+Enter / Cmd+Enter)');
    console.log('4. Проверьте, что появилось "Success"\n');
  } catch (error) {
    console.log('⚠️  Не удалось открыть браузер автоматически');
    console.log(`📝 Откройте вручную: ${sqlEditorUrl}\n`);
  }

  return false; // Возвращаем false, так как миграция не применена автоматически
}

// Парсим аргументы
const sqlFile = process.argv[2] || 'APPLY_NOW.sql';
const description = process.argv[3] || 'миграцию';

// Запускаем
const success = await applyMigration(sqlFile, description);
process.exit(0); // Всегда успешно, так как мы открыли браузер
