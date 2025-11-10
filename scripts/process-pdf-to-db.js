/**
 * Скрипт для обработки PDF учебников DGT и загрузки в Supabase
 * 
 * Использование:
 * 1. Положи PDF файлы в папку data/pdf/
 * 2. Назови файлы: tema1.pdf, tema2.pdf, ... tema10.pdf
 * 3. Запусти: node scripts/process-pdf-to-db.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config();

// Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yffjnqegeiorunyvcxkn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Нужен service key для записи

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not found in environment');
  console.error('Получи service key: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Директория с PDF файлами
const PDF_DIR = path.join(__dirname, '../data/pdf');

/**
 * Извлекает текст из PDF
 * Используем pdfjs-dist для извлечения текста
 */
async function extractTextFromPDF(pdfPath) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(dataBuffer);
    
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Извлекаем текст с каждой страницы
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error(`❌ Ошибка при чтении PDF ${pdfPath}:`, error.message);
    return null;
  }
}

/**
 * Разбивает текст на разделы
 */
function splitIntoSections(text, topicNumber) {
  const sections = [];
  
  // Разбиваем по заголовкам (предполагаем, что заголовки на отдельных строках заглавными буквами)
  const lines = text.split('\n');
  let currentSection = { title: `Тема ${topicNumber} - Введение`, content: [] };
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Пропускаем пустые строки
    if (!trimmed) continue;
    
    // Если строка выглядит как заголовок (заглавные буквы или цифры в начале)
    if (trimmed.match(/^[А-ЯЁ0-9\s.]{10,}$/) || trimmed.match(/^\d+\./)) {
      // Сохраняем предыдущий раздел
      if (currentSection.content.length > 0) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.join(' ').trim(),
        });
      }
      
      // Начинаем новый раздел
      currentSection = {
        title: trimmed,
        content: [],
      };
    } else {
      // Добавляем контент в текущий раздел
      currentSection.content.push(trimmed);
    }
  }
  
  // Добавляем последний раздел
  if (currentSection.content.length > 0) {
    sections.push({
      title: currentSection.title,
      content: currentSection.content.join(' ').trim(),
    });
  }
  
  // Если разделов нет, создаём один большой
  if (sections.length === 0) {
    sections.push({
      title: `Тема ${topicNumber}`,
      content: text,
    });
  }
  
  return sections;
}

/**
 * Извлекает ключевые слова из текста
 */
function extractKeywords(text) {
  const keywords = new Set();
  
  // Список важных терминов DGT
  const terms = [
    'autopista', 'autovía', 'carretera', 'rotonda', 'paso de peatones',
    'обгон', 'опережение', 'остановка', 'стоянка', 'перекрёсток',
    'штраф', 'multa', 'velocidad', 'скорость', 'знак', 'señal',
    'carnet', 'баллы', 'puntos', 'DGT', 'ПДД'
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const term of terms) {
    if (lowerText.includes(term.toLowerCase())) {
      keywords.add(term);
    }
  }
  
  return Array.from(keywords);
}

/**
 * Обрабатывает один PDF файл
 */
async function processPDF(pdfPath, topicNumber) {
  console.log(`\n📄 Обработка: ${path.basename(pdfPath)}`);
  
  // Извлекаем текст
  const text = await extractTextFromPDF(pdfPath);
  if (!text) {
    console.error(`❌ Не удалось извлечь текст из ${pdfPath}`);
    return 0;
  }
  
  console.log(`✅ Извлечено ${text.length} символов`);
  
  // Разбиваем на разделы
  const sections = splitIntoSections(text, topicNumber);
  console.log(`✅ Создано ${sections.length} разделов`);
  
  // Получаем topic_id из базы
  const { data: topic } = await supabase
    .from('topics')
    .select('id')
    .eq('number', topicNumber)
    .single();
  
  let inserted = 0;
  
  // Загружаем каждый раздел в базу
  for (const section of sections) {
    if (section.content.length < 50) continue; // Пропускаем слишком короткие
    
    const keywords = extractKeywords(section.content);
    
    const { error } = await supabase
      .from('dgt_knowledge')
      .insert({
        topic_id: topic?.id,
        topic_number: topicNumber,
        section_title: section.title,
        content: section.content,
        source_file: path.basename(pdfPath),
        keywords: keywords,
        language: 'ru',
      });
    
    if (error) {
      console.error(`❌ Ошибка при вставке раздела "${section.title}":`, error.message);
    } else {
      inserted++;
    }
  }
  
  console.log(`✅ Загружено ${inserted} разделов из ${sections.length}`);
  return inserted;
}

/**
 * Главная функция
 */
async function main() {
  console.log('🚀 Начинаем обработку PDF учебников DGT\n');
  
  // Проверяем наличие директории с PDF
  if (!fs.existsSync(PDF_DIR)) {
    console.error(`❌ Директория ${PDF_DIR} не найдена`);
    console.log('\n📁 Создай папку data/pdf/ и положи туда PDF файлы:');
    console.log('   - tema1.pdf');
    console.log('   - tema2.pdf');
    console.log('   - ...');
    console.log('   - tema10.pdf\n');
    
    // Создаём директорию
    fs.mkdirSync(PDF_DIR, { recursive: true });
    console.log(`✅ Создана директория ${PDF_DIR}`);
    console.log('Положи PDF файлы в эту папку и запусти скрипт снова.\n');
    return;
  }
  
  // Получаем список PDF файлов
  const files = fs.readdirSync(PDF_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort();
  
  if (files.length === 0) {
    console.error(`❌ PDF файлы не найдены в ${PDF_DIR}`);
    console.log('\nПоложи PDF файлы в папку data/pdf/\n');
    return;
  }
  
  console.log(`📚 Найдено PDF файлов: ${files.length}\n`);
  
  let totalInserted = 0;
  
  // Обрабатываем каждый файл
  for (const file of files) {
    // Извлекаем номер темы из названия файла
    const match = file.match(/tema?(\d+)/i);
    const topicNumber = match ? parseInt(match[1]) : null;
    
    if (!topicNumber) {
      console.warn(`⚠️  Не удалось определить номер темы для ${file}, пропускаем`);
      continue;
    }
    
    const pdfPath = path.join(PDF_DIR, file);
    const inserted = await processPDF(pdfPath, topicNumber);
    totalInserted += inserted;
  }
  
  console.log(`\n✅ ГОТОВО! Загружено ${totalInserted} разделов в базу данных`);
  console.log('\n🎯 Следующий шаг: обнови Edge Function для использования этих данных');
  console.log('   Инструкция: ЗАГРУЗКА_PDF_В_AI.md\n');
}

main().catch(console.error);

