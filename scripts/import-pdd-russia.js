#!/usr/bin/env node

/**
 * Скрипт для импорта вопросов ПДД России из репозитория etspring/pdd_russia
 * 
 * Использование:
 * 1. Клонируй репозиторий: git clone https://github.com/etspring/pdd_russia.git /tmp/pdd_russia
 * 2. Установи зависимости: npm install node-fetch crypto
 * 3. Настрой .env с SUPABASE_URL и SUPABASE_SERVICE_KEY
 * 4. Запусти: node scripts/import-pdd-russia.js /tmp/pdd_russia
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { createHash } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Ошибка: нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Получить MD5 hash для source_id
function getSourceId(question, answers) {
  const hashInput = `${question}-${answers.map(a => a.answer_text || a.text).join('')}`;
  return createHash('md5').update(hashInput).digest('hex');
}

// Загрузка изображения в Supabase Storage
async function uploadImageToStorage(imagePath, repoPath) {
  try {
    // Проверяем, существует ли файл
    if (!existsSync(imagePath)) {
      console.warn(`⚠️  Изображение не найдено: ${imagePath}`);
      return null;
    }

    // Читаем файл
    const fileBuffer = readFileSync(imagePath);
    const fileName = basename(imagePath);
    const fileExt = extname(fileName).toLowerCase();
    
    // Определяем MIME тип
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    
    const contentType = mimeTypes[fileExt] || 'image/jpeg';
    
    // Создаём путь в Storage, сохраняя структуру папок из репозитория
    // Например: images/A_B/1871b903ddd6b18d2bc45133234dd7fa.jpg -> images/A_B/1871b903ddd6b18d2bc45133234dd7fa.jpg
    const relativePath = imagePath.replace(repoPath + '/', '').replace(repoPath + '\\', '');
    const storagePath = relativePath.replace(/\\/g, '/'); // Нормализуем слэши
    
    // Загружаем в Storage
    // Используем service_role для обхода RLS
    const { data, error } = await supabase.storage
      .from('pdd_russia')
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true, // Перезаписываем, если уже существует
        cacheControl: '3600',
        // Для service_role не нужны дополнительные параметры
      });
    
    if (error) {
      // Если файл уже существует, это не критично
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log(`ℹ️  Изображение уже существует: ${storagePath}`);
      } else if (error.message?.includes('Bucket not found')) {
        // Bucket не найден - возможно, нужно создать через Dashboard
        console.warn(`⚠️  Bucket не найден. Проверь, что bucket 'pdd_russia' создан в Supabase Dashboard`);
        return null;
      } else {
        console.error(`❌ Ошибка загрузки изображения ${imagePath}:`, error.message);
        // Продолжаем без изображения - это не критично
        return null;
      }
    }
    
    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('pdd_russia')
      .getPublicUrl(storagePath);
    
    console.log(`✅ Загружено изображение: ${storagePath}`);
    return publicUrl;
  } catch (error) {
    console.error(`❌ Ошибка при загрузке изображения ${imagePath}:`, error.message);
    return null;
  }
}

// Парсинг JSON файла вопроса
function parseQuestionFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Поддержка разных форматов (массив или объект)
    if (Array.isArray(data)) {
      return data;
    }
    return [data];
  } catch (error) {
    console.error(`❌ Ошибка парсинга ${filePath}:`, error.message);
    return [];
  }
}

// Импорт одного вопроса
async function importQuestion(questionData, repoPath) {
  try {
    // Извлекаем номер билета из ticket_number ("Билет 2" -> 2)
    const ticketMatch = questionData.ticket_number?.match(/\d+/);
    const ticketNumber = ticketMatch ? parseInt(ticketMatch[0]) : null;
    
    // Извлекаем номер вопроса из title ("Вопрос 1" -> 1)
    const questionMatch = questionData.title?.match(/\d+/);
    const questionNumber = questionMatch ? parseInt(questionMatch[0]) : null;
    
    if (!ticketNumber || !questionNumber) {
      console.warn(`⚠️  Пропущен вопрос без номера билета/вопроса:`, questionData.title);
      return;
    }
    
    // Генерируем source_id
    const sourceId = questionData.id || getSourceId(
      questionData.question,
      questionData.answers || []
    );
    
    // Обрабатываем изображение - загружаем в Supabase Storage
    let imageUrl = null;
    if (questionData.image) {
      let imagePath;
      
      // Если путь относительный, конвертируем в абсолютный
      if (questionData.image.startsWith('./')) {
        imagePath = join(repoPath, questionData.image.replace('./', ''));
      } else if (questionData.image.startsWith('/')) {
        imagePath = questionData.image;
      } else {
        // Относительный путь от корня репозитория
        imagePath = join(repoPath, questionData.image);
      }
      
      // Загружаем изображение в Supabase Storage
      imageUrl = await uploadImageToStorage(imagePath, repoPath);
      
      // Если загрузка не удалась, но это не критично - продолжаем без изображения
      if (!imageUrl) {
        console.warn(`⚠️  Не удалось загрузить изображение для вопроса ${questionNumber}, билет ${ticketNumber}`);
      }
    }
    
    // Проверяем, существует ли уже вопрос по (ticket_number, question_number)
    // Это правильнее, так как уникальное ограничение именно по этим полям
    const { data: existing } = await supabase
      .from('pdd_russia_questions')
      .select('id, source_id')
      .eq('ticket_number', ticketNumber)
      .eq('question_number', questionNumber)
      .maybeSingle();
    
    if (existing) {
      // Если вопрос существует, но source_id отличается - обновляем source_id
      if (existing.source_id !== sourceId) {
        await supabase
          .from('pdd_russia_questions')
          .update({ source_id: sourceId })
          .eq('id', existing.id);
      }
      return existing.id;
    }
    
    // Вставляем вопрос
    const { data: question, error: questionError } = await supabase
      .from('pdd_russia_questions')
      .insert({
        source_id: sourceId,
        ticket_number: ticketNumber,
        question_number: questionNumber,
        ticket_category: questionData.ticket_category || null,
        question_text: questionData.question,
        image_url: imageUrl,
        explanation: questionData.answer_tip || null,
        correct_answer_text: questionData.correct_answer || null,
        topics: Array.isArray(questionData.topic) ? questionData.topic : 
                questionData.topic ? [questionData.topic] : [],
        difficulty: 'medium', // По умолчанию
        is_premium: false
      })
      .select('id')
      .single();
    
    if (questionError) {
      // Если ошибка из-за дубликата - пытаемся найти существующий
      if (questionError.code === '23505') {
        const { data: existingDup } = await supabase
          .from('pdd_russia_questions')
          .select('id')
          .eq('ticket_number', ticketNumber)
          .eq('question_number', questionNumber)
          .maybeSingle();
        
        if (existingDup) {
          return existingDup.id;
        }
      }
      console.error(`❌ Ошибка вставки вопроса:`, questionError);
      return null;
    }
    
    // Вставляем ответы
    if (questionData.answers && Array.isArray(questionData.answers)) {
      const answers = questionData.answers.map((answer, index) => ({
        question_id: question.id,
        answer_text: answer.answer_text || answer.text || '',
        is_correct: answer.is_correct || false,
        position: index + 1
      }));
      
      const { error: answersError } = await supabase
        .from('pdd_russia_answers')
        .insert(answers);
      
      if (answersError) {
        console.error(`❌ Ошибка вставки ответов:`, answersError);
      }
    }
    
    console.log(`✅ Импортирован: Билет ${ticketNumber}, Вопрос ${questionNumber}`);
    return question.id;
  } catch (error) {
    console.error(`❌ Ошибка импорта вопроса:`, error);
    return null;
  }
}

// Импорт всех вопросов из папки
async function importQuestionsFromFolder(folderPath, repoPath) {
  const files = readdirSync(folderPath);
  let imported = 0;
  let skipped = 0;
  
  for (const file of files) {
    const filePath = join(folderPath, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Рекурсивно обрабатываем подпапки
      const result = await importQuestionsFromFolder(filePath, repoPath);
      imported += result.imported;
      skipped += result.skipped;
    } else if (file.endsWith('.json')) {
      const questions = parseQuestionFile(filePath);
      
      for (const questionData of questions) {
        const result = await importQuestion(questionData, repoPath);
        if (result) {
          imported++;
        } else {
          skipped++;
        }
      }
    }
  }
  
  return { imported, skipped };
}

// Импорт дорожных знаков
async function importSigns(signsPath, repoPath) {
  try {
    const signsFile = join(signsPath, 'signs.json');
    const content = readFileSync(signsFile, 'utf-8');
    const signsData = JSON.parse(content);
    
    let imported = 0;
    
    for (const [category, signs] of Object.entries(signsData)) {
      for (const [number, signData] of Object.entries(signs)) {
        // Проверяем, существует ли уже
        const { data: existing } = await supabase
          .from('pdd_russia_signs')
          .select('id')
          .eq('category', category)
          .eq('number', number)
          .single();
        
        if (existing) {
          continue;
        }
        
        // Загружаем изображение знака в Storage
        let imageUrl = null;
        if (signData.image) {
          let imagePath;
          if (signData.image.startsWith('./')) {
            imagePath = join(repoPath, signData.image.replace('./', ''));
          } else {
            imagePath = join(repoPath, signData.image);
          }
          imageUrl = await uploadImageToStorage(imagePath, repoPath);
        }
        
        const { error } = await supabase
          .from('pdd_russia_signs')
          .insert({
            category,
            number: signData.number || number,
            title: signData.title,
            image_url: imageUrl,
            description: signData.description || null
          });
        
        if (!error) {
          imported++;
        }
      }
    }
    
    console.log(`✅ Импортировано знаков: ${imported}`);
    return imported;
  } catch (error) {
    console.error(`❌ Ошибка импорта знаков:`, error);
    return 0;
  }
}

// Импорт штрафов
async function importPenalties(penaltiesPath) {
  try {
    const penaltiesFile = join(penaltiesPath, 'penalties.json');
    const content = readFileSync(penaltiesFile, 'utf-8');
    
    // Файл может быть JSONL (JSON Lines) - каждая строка это отдельный JSON
    // Пробуем сначала как обычный JSON, если не получается - парсим построчно
    let penaltiesData;
    try {
      penaltiesData = JSON.parse(content);
      // Если это не массив, значит это JSONL
      if (!Array.isArray(penaltiesData)) {
        penaltiesData = content.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      }
    } catch {
      // Если не получилось - парсим построчно (JSONL)
      penaltiesData = content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    }
    
    let imported = 0;
    
    for (const penaltyData of penaltiesData) {
      // Проверяем, существует ли уже
      const { data: existing } = await supabase
        .from('pdd_russia_penalties')
        .select('id')
        .eq('article_part', penaltyData.article_part)
        .single();
      
      if (existing) {
        continue;
      }
      
      const isCriminal = penaltyData.article_part?.includes('УК РФ') || false;
      
      const { error } = await supabase
        .from('pdd_russia_penalties')
        .insert({
          article_part: penaltyData.article_part,
          text: penaltyData.text,
          penalty: penaltyData.penalty,
          is_criminal: isCriminal
        });
      
      if (!error) {
        imported++;
      }
    }
    
    console.log(`✅ Импортировано штрафов: ${imported}`);
    return imported;
  } catch (error) {
    console.error(`❌ Ошибка импорта штрафов:`, error);
    return 0;
  }
}

// Главная функция
async function main() {
  const repoPath = process.argv[2];
  
  if (!repoPath) {
    console.error('❌ Укажи путь к репозиторию: node import-pdd-russia.js /path/to/pdd_russia');
    process.exit(1);
  }
  
  console.log('🚀 Начинаю импорт данных ПДД России...\n');
  
  // Импорт вопросов
  const questionsPath = join(repoPath, 'questions');
  if (statSync(questionsPath).isDirectory()) {
    console.log('📝 Импортирую вопросы...');
    const result = await importQuestionsFromFolder(questionsPath, repoPath);
    console.log(`✅ Вопросов импортировано: ${result.imported}, пропущено: ${result.skipped}\n`);
  }
  
  // Импорт знаков
  const signsPath = join(repoPath, 'signs');
  if (statSync(signsPath).isDirectory()) {
    console.log('🛑 Импортирую дорожные знаки...');
    await importSigns(signsPath, repoPath);
    console.log('');
  }
  
  // Импорт штрафов
  const penaltiesPath = join(repoPath, 'penalties');
  if (statSync(penaltiesPath).isDirectory()) {
    console.log('💰 Импортирую штрафы...');
    await importPenalties(penaltiesPath);
    console.log('');
  }
  
  console.log('✨ Импорт завершён!');
}

main().catch(console.error);

