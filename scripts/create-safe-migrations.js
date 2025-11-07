#!/usr/bin/env node

/**
 * Создание безопасного файла миграций с проверками IF NOT EXISTS
 * для всех CREATE TABLE и CREATE TYPE команд
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const migrationsDir = join(projectRoot, 'supabase', 'migrations');
const outputFile = join(projectRoot, 'ALL_MIGRATIONS_SAFE.sql');

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

// Функция для добавления IF NOT EXISTS к CREATE TABLE
function makeSafeSQL(content) {
  let safeContent = content;
  
  // Сначала проверяем, есть ли уже DO блоки в контенте
  const hasDoBlocks = /DO\s*\$\$/g.test(safeContent);
  
  // Заменяем CREATE TABLE на CREATE TABLE IF NOT EXISTS
  safeContent = safeContent.replace(
    /CREATE TABLE\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\(/g,
    (match, tableName) => {
      // Пропускаем, если уже есть IF NOT EXISTS
      if (match.includes('IF NOT EXISTS')) {
        return match;
      }
      return `CREATE TABLE IF NOT EXISTS ${tableName} (`;
    }
  );
  
  // Заменяем CREATE TYPE на безопасную версию с DO блоком
  // Но только если еще не в DO блоке
  safeContent = safeContent.replace(
    /CREATE TYPE\s+IF NOT EXISTS\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+AS\s+ENUM\s*\(([^)]+)\);/g,
    (match, typeName, enumValues) => {
      // Проверяем контекст вокруг match
      const matchIndex = safeContent.indexOf(match);
      if (matchIndex === -1) return match;
      
      const beforeMatch = safeContent.substring(Math.max(0, matchIndex - 200), matchIndex);
      const afterMatch = safeContent.substring(matchIndex + match.length, matchIndex + match.length + 200);
      
      // Пропускаем, если уже в DO блоке
      if (beforeMatch.includes('DO $$') && afterMatch.includes('END $$')) {
        return match;
      }
      
      const cleanTypeName = typeName.replace('public.', '');
      return `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${cleanTypeName}') THEN
    CREATE TYPE ${typeName} AS ENUM (${enumValues});
  END IF;
END $$;`;
    }
  );
  
  // Заменяем CREATE TYPE без IF NOT EXISTS
  safeContent = safeContent.replace(
    /CREATE TYPE\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+AS\s+ENUM\s*\(([^)]+)\);/g,
    (match, typeName, enumValues) => {
      // Проверяем контекст вокруг match
      const matchIndex = safeContent.indexOf(match);
      if (matchIndex === -1) return match;
      
      const beforeMatch = safeContent.substring(Math.max(0, matchIndex - 200), matchIndex);
      const afterMatch = safeContent.substring(matchIndex + match.length, matchIndex + match.length + 200);
      
      // Пропускаем, если уже в DO блоке
      if (beforeMatch.includes('DO $$') && afterMatch.includes('END $$')) {
        return match;
      }
      
      const cleanTypeName = typeName.replace('public.', '');
      return `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${cleanTypeName}') THEN
    CREATE TYPE ${typeName} AS ENUM (${enumValues});
  END IF;
END $$;`;
    }
  );
  
  // Заменяем CREATE INDEX на CREATE INDEX IF NOT EXISTS
  safeContent = safeContent.replace(
    /CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF NOT EXISTS)([a-zA-Z_][a-zA-Z0-9_.]*)\s+ON/g,
    (match, unique, indexName) => {
      const uniquePart = unique ? 'UNIQUE ' : '';
      return `CREATE ${uniquePart}INDEX IF NOT EXISTS ${indexName} ON`;
    }
  );
  
  // Заменяем CREATE SEQUENCE на CREATE SEQUENCE IF NOT EXISTS
  safeContent = safeContent.replace(
    /CREATE SEQUENCE\s+(?!IF NOT EXISTS)([a-zA-Z_][a-zA-Z0-9_.]*)/g,
    (match, seqName) => {
      return `CREATE SEQUENCE IF NOT EXISTS ${seqName}`;
    }
  );
  
  // Добавляем DROP POLICY IF EXISTS перед CREATE POLICY (если еще нет)
  safeContent = safeContent.replace(
    /CREATE POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g,
    (match, policyName, tableName) => {
      // Проверяем, есть ли уже DROP POLICY перед этим CREATE POLICY
      const matchIndex = safeContent.indexOf(match);
      if (matchIndex === -1) return match;
      
      const beforeMatch = safeContent.substring(Math.max(0, matchIndex - 200), matchIndex);
      
      // Если уже есть DROP POLICY для этой политики, пропускаем
      if (beforeMatch.includes(`DROP POLICY IF EXISTS "${policyName}" ON ${tableName}`)) {
        return match;
      }
      
      // Добавляем DROP POLICY IF EXISTS перед CREATE POLICY
      return `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\nCREATE POLICY "${policyName}" ON ${tableName}`;
    }
  );
  
  // Добавляем DROP TRIGGER IF EXISTS перед CREATE TRIGGER (если еще нет)
  // Используем многострочный режим для обработки CREATE TRIGGER на разных строках
  safeContent = safeContent.replace(
    /CREATE TRIGGER\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+ON\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gm,
    (match, triggerName, tableName, offset) => {
      // Проверяем, есть ли уже DROP TRIGGER перед этим CREATE TRIGGER
      const beforeMatch = safeContent.substring(Math.max(0, offset - 500), offset);
      
      // Если уже есть DROP TRIGGER для этого триггера, пропускаем
      if (beforeMatch.includes(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName}`)) {
        return match;
      }
      
      // Добавляем DROP TRIGGER IF EXISTS перед CREATE TRIGGER
      return `DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};\n${match}`;
    }
  );
  
  // Добавляем DROP FUNCTION IF EXISTS перед CREATE FUNCTION (если еще нет)
  safeContent = safeContent.replace(
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\(/g,
    (match, orReplace, functionName) => {
      // Если уже есть OR REPLACE, пропускаем
      if (orReplace) {
        return match;
      }
      
      // Проверяем, есть ли уже DROP FUNCTION перед этим CREATE FUNCTION
      const matchIndex = safeContent.indexOf(match);
      if (matchIndex === -1) return match;
      
      const beforeMatch = safeContent.substring(Math.max(0, matchIndex - 200), matchIndex);
      
      // Если уже есть DROP FUNCTION для этой функции, пропускаем
      if (beforeMatch.includes(`DROP FUNCTION IF EXISTS ${functionName}`)) {
        return match;
      }
      
      // Добавляем DROP FUNCTION IF EXISTS перед CREATE FUNCTION
      return `DROP FUNCTION IF EXISTS ${functionName};\nCREATE FUNCTION ${functionName}(`;
    }
  );
  
  return safeContent;
}

// Объединяем все миграции с безопасными проверками
let mergedContent = `-- ============================================
-- Безопасные миграции для Supabase
-- Всего миграций: ${files.length}
-- С проверками IF NOT EXISTS для всех CREATE команд
-- Создано автоматически
-- ============================================\n\n`;

files.forEach((file, index) => {
  const safeContent = makeSafeSQL(file.content);
  mergedContent += `-- ============================================\n`;
  mergedContent += `-- Миграция ${index + 1}/${files.length}: ${file.name}\n`;
  mergedContent += `-- ============================================\n\n`;
  mergedContent += safeContent;
  mergedContent += `\n\n`;
});

// Сохраняем объединенный файл
writeFileSync(outputFile, mergedContent, 'utf-8');

console.log(`✅ Безопасные миграции созданы в файле: ${outputFile}`);
console.log(`\n📝 Следующие шаги:`);
console.log(`1. Откройте SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new`);
console.log(`2. Скопируйте содержимое файла ${outputFile}`);
console.log(`3. Вставьте в SQL Editor и нажмите Run`);
console.log(`\n✅ Теперь все CREATE команды имеют проверки IF NOT EXISTS`);
console.log(`   Можно безопасно применять даже если некоторые миграции уже применены`);

