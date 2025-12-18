#!/usr/bin/env node

/**
 * Скрипт для повторной загрузки изображений вопросов ПДД России
 * Используется, если изображения не были загружены при первом импорте
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Ошибка: нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Загрузка изображения в Supabase Storage
async function uploadImageToStorage(imagePath, repoPath) {
  try {
    if (!existsSync(imagePath)) {
      return null;
    }

    const fileBuffer = readFileSync(imagePath);
    const fileName = basename(imagePath);
    const fileExt = extname(fileName).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[fileExt] || 'image/jpeg';
    
    // Создаём путь в Storage
    const relativePath = imagePath.replace(repoPath + '/', '').replace(repoPath + '\\', '');
    const storagePath = relativePath.replace(/\\/g, '/');
    
    // Загружаем в Storage
    const { data, error } = await supabase.storage
      .from('pdd_russia')
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      });
    
    if (error) {
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        // Файл уже существует - получаем URL
      } else if (error.message?.includes('Bucket not found')) {
        console.error(`❌ Bucket 'pdd_russia' не найден! Создай его в Supabase Dashboard или примени миграцию.`);
        return null;
      } else {
        console.error(`❌ Ошибка загрузки: ${error.message}`);
        return null;
      }
    }
    
    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('pdd_russia')
      .getPublicUrl(storagePath);
    
    return publicUrl;
  } catch (error) {
    console.error(`❌ Ошибка обработки изображения ${imagePath}:`, error.message);
    return null;
  }
}

async function reuploadQuestionImages(repoPath) {
  console.log('🖼️  Повторная загрузка изображений для вопросов...\n');

  // Получаем все вопросы без изображений или с локальными путями
  const { data: questions, error } = await supabase
    .from('pdd_russia_questions')
    .select('id, ticket_number, question_number, image_url')
    .or('image_url.is.null,image_url.not.like.http%');

  if (error) {
    console.error('❌ Ошибка при загрузке вопросов:', error);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('✅ Все вопросы уже имеют изображения!');
    return;
  }

  console.log(`📝 Найдено вопросов для обработки: ${questions.length}\n`);

  // Читаем исходные JSON файлы из правильной структуры
  const { readdirSync, readFileSync, statSync } = await import('fs');
  const { join } = await import('path');
  
  // Функция для рекурсивного поиска всех JSON файлов
  function findJsonFiles(dir, fileList = []) {
    const files = readdirSync(dir);
    files.forEach(file => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        findJsonFiles(filePath, fileList);
      } else if (file.endsWith('.json')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  }
  
  const questionsBaseDir = join(repoPath, 'questions');
  const jsonFiles = findJsonFiles(questionsBaseDir);
  
  console.log(`📁 Найдено JSON файлов: ${jsonFiles.length}\n`);
  
  let updated = 0;
  let errors = 0;
  let skipped = 0;
  let notFound = 0;

  // Создаём карту вопросов из JSON файлов для быстрого поиска
  const questionsMap = new Map();
  
  for (const filePath of jsonFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const questionsData = JSON.parse(content);
      const questionsArray = Array.isArray(questionsData) ? questionsData : [questionsData];
      
      for (const q of questionsArray) {
        const ticketMatch = q.ticket_number?.match(/\d+/);
        const questionMatch = q.title?.match(/\d+/);
        
        if (ticketMatch && questionMatch) {
          const ticketNum = parseInt(ticketMatch[0]);
          const questionNum = parseInt(questionMatch[0]);
          const key = `${ticketNum}-${questionNum}`;
          questionsMap.set(key, q);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Ошибка чтения файла ${filePath}:`, error.message);
    }
  }
  
  console.log(`📚 Загружено вопросов из JSON: ${questionsMap.size}\n`);

  for (const question of questions) {
    try {
      const key = `${question.ticket_number}-${question.question_number}`;
      const questionData = questionsMap.get(key);
      
      if (!questionData) {
        notFound++;
        continue;
      }
      
      if (!questionData.image) {
        skipped++;
        continue;
      }
      
      // Определяем путь к изображению
      let imagePath;
      if (questionData.image.startsWith('./')) {
        imagePath = join(repoPath, questionData.image.replace('./', ''));
      } else if (questionData.image.startsWith('/')) {
        imagePath = questionData.image;
      } else {
        imagePath = join(repoPath, questionData.image);
      }
      
      // Загружаем изображение
      const imageUrl = await uploadImageToStorage(imagePath, repoPath);
      
      if (imageUrl) {
        // Обновляем вопрос в БД
        const { error: updateError } = await supabase
          .from('pdd_russia_questions')
          .update({ image_url: imageUrl })
          .eq('id', question.id);
        
        if (updateError) {
          console.error(`❌ Ошибка обновления вопроса ${question.id}:`, updateError.message);
          errors++;
        } else {
          updated++;
          if (updated % 50 === 0) {
            console.log(`✅ Обновлено: ${updated}/${questions.length}`);
          }
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Ошибка обработки вопроса ${question.id}:`, error.message);
      errors++;
    }
  }
  
  if (notFound > 0) {
    console.log(`\n⚠️  Вопросов не найдено в JSON: ${notFound}`);
  }

  console.log(`\n📊 Итоги:`);
  console.log(`  ✅ Обновлено: ${updated}`);
  console.log(`  ⏭️  Пропущено (без изображения): ${skipped}`);
  console.log(`  ❌ Ошибок: ${errors}`);
}

// Запуск
const repoPath = process.argv[2] || '/tmp/pdd_russia';

if (!existsSync(repoPath)) {
  console.error(`❌ Репозиторий не найден: ${repoPath}`);
  console.error('   Клонируй репозиторий: git clone https://github.com/etspring/pdd_russia.git /tmp/pdd_russia');
  process.exit(1);
}

reuploadQuestionImages(repoPath).catch(console.error);

