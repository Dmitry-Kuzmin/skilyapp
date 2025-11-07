#!/usr/bin/env node

/**
 * Объединение всех миграций в один SQL файл для применения в SQL Editor
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const migrationsDir = join(projectRoot, 'supabase', 'migrations');
const outputFile = join(projectRoot, 'ALL_MIGRATIONS.sql');

// Читаем все миграции
const files = readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .map(file => ({
    name: file,
    path: join(migrationsDir, file),
    content: readFileSync(join(migrationsDir, file), 'utf-8')
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

console.log(`📋 Найдено миграций: ${files.length}\n`);

// Объединяем все миграции
let mergedContent = `-- ============================================
-- Объединенные миграции для Supabase
-- Всего миграций: ${files.length}
-- Создано автоматически
-- ============================================\n\n`;

files.forEach((file, index) => {
  mergedContent += `-- ============================================\n`;
  mergedContent += `-- Миграция ${index + 1}/${files.length}: ${file.name}\n`;
  mergedContent += `-- ============================================\n\n`;
  mergedContent += file.content;
  mergedContent += `\n\n`;
});

// Сохраняем объединенный файл
writeFileSync(outputFile, mergedContent, 'utf-8');

console.log(`✅ Все миграции объединены в файл: ${outputFile}`);
console.log(`\n📝 Следующие шаги:`);
console.log(`1. Откройте SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new`);
console.log(`2. Скопируйте содержимое файла ${outputFile}`);
console.log(`3. Вставьте в SQL Editor и нажмите Run`);
console.log(`\n⚠️  Внимание: Файл большой (${Math.round(mergedContent.length / 1024)} KB)`);
console.log(`   Если SQL Editor не принимает такой большой файл, применяйте миграции по частям.`);

