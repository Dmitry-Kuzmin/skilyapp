import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '..', 'ALL_MIGRATIONS_SAFE.sql');
const outputDir = path.join(__dirname, '..', 'migrations-split');

// Создаем директорию для разбитых миграций
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Читаем исходный файл
const content = fs.readFileSync(inputFile, 'utf-8');

// Разбиваем на миграции по маркеру
const migrationPattern = /-- ============================================\n-- Миграция (\d+)\/(\d+): ([^\n]+)\n-- ============================================\n/g;
const migrations = [];
let lastIndex = 0;
let match;

// Находим все миграции
while ((match = migrationPattern.exec(content)) !== null) {
  const migrationNumber = parseInt(match[1]);
  const migrationName = match[3];
  const startIndex = match.index;
  
  // Ищем следующую миграцию или конец файла
  migrationPattern.lastIndex = match.index + match[0].length;
  const nextMatch = migrationPattern.exec(content);
  const endIndex = nextMatch ? nextMatch.index : content.length;
  
  migrations.push({
    number: migrationNumber,
    name: migrationName,
    content: content.substring(startIndex, endIndex).trim()
  });
  
  if (nextMatch) {
    migrationPattern.lastIndex = nextMatch.index;
  }
}

console.log(`Найдено миграций: ${migrations.length}`);

// Создаем отдельные файлы для каждой миграции
migrations.forEach(migration => {
  const fileName = `${String(migration.number).padStart(2, '0')}_${migration.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.sql`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, migration.content, 'utf-8');
  console.log(`Создан файл: ${fileName}`);
});

// Создаем файлы с группами миграций (по 10 миграций в каждом)
const groupSize = 10;
for (let i = 0; i < migrations.length; i += groupSize) {
  const groupNumber = Math.floor(i / groupSize) + 1;
  const groupMigrations = migrations.slice(i, i + groupSize);
  const groupContent = groupMigrations.map(m => m.content).join('\n\n');
  
  const groupFileName = `PART_${String(groupNumber).padStart(2, '0')}_migrations_${String(i + 1).padStart(2, '0')}_to_${String(Math.min(i + groupSize, migrations.length)).padStart(2, '0')}.sql`;
  const groupFilePath = path.join(outputDir, groupFileName);
  fs.writeFileSync(groupFilePath, groupContent, 'utf-8');
  console.log(`Создан групповой файл: ${groupFileName} (${groupMigrations.length} миграций)`);
}

// Создаем файл с инструкциями
const instructions = `# Инструкции по применению миграций

## Вариант 1: Применение по частям (рекомендуется)

Применяйте файлы PART_XX по порядку через Supabase SQL Editor:

1. PART_01_migrations_01_to_10.sql
2. PART_02_migrations_11_to_20.sql
3. PART_03_migrations_21_to_30.sql
4. PART_04_migrations_31_to_40.sql
5. PART_05_migrations_41_to_50.sql
6. PART_06_migrations_51_to_53.sql

## Вариант 2: Применение отдельных миграций

Если какая-то часть вызывает ошибку, можно применить миграции по отдельности:
- Файлы пронумерованы от 01 до 53
- Применяйте их по порядку

## Вариант 3: Применение через Supabase CLI

\`\`\`bash
cd migrations-split
for file in PART_*.sql; do
  echo "Применяю $file..."
  supabase db execute -f "$file"
done
\`\`\`

## Примечания

- Если миграция уже применена, она пропустится благодаря IF NOT EXISTS
- Если возникнет ошибка, проверьте, какая именно миграция вызвала проблему
- Можно применить миграции вручную через Supabase SQL Editor
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), instructions, 'utf-8');
console.log('\n✅ Миграции успешно разбиты на части!');
console.log(`📁 Директория: ${outputDir}`);
console.log(`📄 Всего файлов: ${migrations.length} отдельных миграций + ${Math.ceil(migrations.length / groupSize)} групповых файлов`);

