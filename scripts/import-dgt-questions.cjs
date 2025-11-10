#!/usr/bin/env node

/**
 * Скрипт для импорта вопросов DGT из JSON файлов в Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Загружаем переменные из .env и .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Используем переменные окружения
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Ошибка: Не найдены переменные VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY");
  console.error("Проверьте файл .env или .env.local");
  process.exit(1);
}

// Создаем клиент Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Путь к данным
const DATA_DIR = path.join(__dirname, '..', 'data');

// Маппинг файлов и категорий
const FILES = {
  'A1': 'data_A1.json',
  'B': 'data_B.json',
  'D': 'data_D.json'
};

/**
 * Преобразует строку вида "1 0 0" в букву ответа (a, b, c)
 */
function parseCorrectAnswer(correctString) {
  const parts = correctString.trim().split(' ');
  if (parts.length !== 3) {
    console.warn(`⚠️  Неверный формат ответа: ${correctString}`);
    return 'a';
  }
  
  if (parts[0] === '1') return 'a';
  if (parts[1] === '1') return 'b';
  if (parts[2] === '1') return 'c';
  
  console.warn(`⚠️  Не найден правильный ответ: ${correctString}`);
  return 'a';
}

/**
 * Импортирует вопросы из JSON файла в Supabase
 */
async function importQuestions(category, filename) {
  console.log(`\n📚 Импорт вопросов категории ${category}...`);
  
  const filepath = path.join(DATA_DIR, filename);
  console.log(`   Файл: ${filepath}`);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Файл не найден: ${filepath}`);
    return 0;
  }
  
  // Читаем JSON файл
  const fileContent = fs.readFileSync(filepath, 'utf-8');
  const questions = JSON.parse(fileContent);
  
  console.log(`   Найдено вопросов: ${questions.length}`);
  
  // Подготавливаем данные для вставки
  const records = [];
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    try {
      const record = {
        category,
        question_es: q.question?.trim() || '',
        option_a_es: q['a.']?.trim() || '',
        option_b_es: q['b.']?.trim() || '',
        option_c_es: q['c.']?.trim() || '',
        correct_answer: parseCorrectAnswer(q.correct || '1 0 0'),
        explanation_es: q.explanation?.trim() || null,
        image_filename: q.img?.trim() || null,
        source: 'anki-carnet-conducir'
      };
      
      // Проверяем обязательные поля
      if (!record.question_es || !record.option_a_es) {
        console.warn(`⚠️  Пропущен вопрос ${idx + 1}: отсутствуют обязательные поля`);
        continue;
      }
      
      records.push(record);
      
    } catch (e) {
      console.warn(`⚠️  Ошибка обработки вопроса ${idx + 1}: ${e}`);
      continue;
    }
  }
  
  console.log(`   Подготовлено для импорта: ${records.length}`);
  
  // Импортируем батчами по 100 записей
  const batchSize = 100;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    try {
      const { error } = await supabase
        .from('dgt_questions')
        .insert(batch);
      
      if (error) throw error;
      
      imported += batch.length;
      process.stdout.write(`   ✅ Импортировано: ${imported}/${records.length}\r`);
    } catch (e) {
      errors += batch.length;
      console.error(`\n   ❌ Ошибка импорта батча ${Math.floor(i / batchSize) + 1}: ${e.message}`);
    }
  }
  
  console.log(`\n   ✅ Импорт завершен: ${imported} успешно, ${errors} ошибок`);
  return imported;
}

/**
 * Очищает существующие данные DGT вопросов
 */
async function clearExistingData() {
  console.log("\n🗑️  Очистка существующих данных...");
  try {
    const { error } = await supabase
      .from('dgt_questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) throw error;
    console.log("   ✅ Данные очищены");
    return true;
  } catch (e) {
    console.warn(`   ⚠️  Ошибка очистки: ${e.message}`);
    return false;
  }
}

/**
 * Проверяет существование таблицы
 */
async function checkTableExists() {
  try {
    const { error } = await supabase
      .from('dgt_questions')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Основная функция импорта
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🚗 ИМПОРТ ВОПРОСОВ DGT В SUPABASE");
  console.log("=".repeat(60));
  
  // Проверяем подключение и существование таблицы
  const tableExists = await checkTableExists();
  
  if (!tableExists) {
    console.log("\n❌ Таблица dgt_questions не существует!");
    console.log("   Пожалуйста, сначала примените миграцию:");
    console.log("   1. Откройте Supabase Dashboard → SQL Editor");
    console.log("   2. Запустите содержимое файла APPLY_DGT_MIGRATION.sql");
    process.exit(1);
  }
  
  console.log("✅ Подключение к Supabase установлено");
  console.log("✅ Таблица dgt_questions найдена");
  
  // Очищаем существующие данные
  await clearExistingData();
  
  // Импортируем данные для каждой категории
  let totalImported = 0;
  for (const [category, filename] of Object.entries(FILES)) {
    const imported = await importQuestions(category, filename);
    totalImported += imported;
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`✅ ИМПОРТ ЗАВЕРШЕН`);
  console.log(`   Всего импортировано: ${totalImported} вопросов`);
  console.log("=".repeat(60));
  
  // Показываем статистику
  console.log("\n📊 Статистика по категориям:");
  for (const category of Object.keys(FILES)) {
    try {
      const { count, error } = await supabase
        .from('dgt_questions')
        .select('id', { count: 'exact', head: true })
        .eq('category', category);
      
      if (error) throw error;
      console.log(`   ${category}: ${count} вопросов`);
    } catch (e) {
      console.log(`   ${category}: ошибка получения статистики`);
    }
  }
}

// Запускаем
main().catch(console.error);

