#!/usr/bin/env node

/**
 * Скрипт для поиска и импорта недостающих вопросов
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Ошибка: нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

async function findAndImportMissing(repoPath) {
  console.log('🔍 Поиск и импорт недостающих вопросов...\n');

  // Получаем все вопросы из БД
  const { data: dbQuestions, error } = await supabase
    .from('pdd_russia_questions')
    .select('ticket_number, question_number')
    .order('ticket_number')
    .order('question_number');

  if (error) {
    console.error('❌ Ошибка при загрузке вопросов из БД:', error);
    return;
  }

  // Создаём Set существующих вопросов
  const existingQuestions = new Set();
  dbQuestions?.forEach(q => {
    existingQuestions.add(`${q.ticket_number}-${q.question_number}`);
  });

  // Читаем все JSON файлы
  const questionsBaseDir = join(repoPath, 'questions');
  const jsonFiles = findJsonFiles(questionsBaseDir);
  
  console.log(`📁 Найдено JSON файлов: ${jsonFiles.length}\n`);

  const missingQuestions = [];

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
          
          if (!existingQuestions.has(key)) {
            missingQuestions.push({
              ticketNumber: ticketNum,
              questionNumber: questionNum,
              data: q,
              filePath
            });
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Ошибка чтения файла ${filePath}:`, error.message);
    }
  }

  if (missingQuestions.length === 0) {
    console.log('✅ Все вопросы уже импортированы!\n');
    return;
  }

  console.log(`📝 Найдено недостающих вопросов: ${missingQuestions.length}\n`);
  
  // Группируем по билетам
  const byTicket = new Map();
  missingQuestions.forEach(q => {
    const ticket = q.ticketNumber;
    if (!byTicket.has(ticket)) {
      byTicket.set(ticket, []);
    }
    byTicket.get(ticket).push(q);
  });

  console.log('📊 Недостающие вопросы по билетам:');
  Array.from(byTicket.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([ticket, questions]) => {
      const questionNums = questions.map(q => q.questionNumber).sort((a, b) => a - b);
      console.log(`  Билет ${ticket}: ${questions.length} вопросов (${questionNums.join(', ')})`);
    });
  console.log();

  // Импортируем недостающие вопросы
  console.log('📥 Импорт недостающих вопросов...\n');
  
  // Используем функцию из import-pdd-russia.js
  const { createHash } = await import('crypto');
  
  function getSourceId(question, answers) {
    const hashInput = `${question}-${answers.map(a => a.answer_text || a.text).join('')}`;
    return createHash('md5').update(hashInput).digest('hex');
  }

  let imported = 0;
  let errors = 0;

  for (const missing of missingQuestions) {
    try {
      const q = missing.data;
      const sourceId = q.id || getSourceId(q.question, q.answers || []);
      
      // Вставляем вопрос (без изображения пока, можно добавить позже)
      const { data: question, error: questionError } = await supabase
        .from('pdd_russia_questions')
        .insert({
          source_id: sourceId,
          ticket_number: missing.ticketNumber,
          question_number: missing.questionNumber,
          ticket_category: q.ticket_category || null,
          question_text: q.question,
          image_url: null, // Изображение можно загрузить позже через reupload:pdd-images
          explanation: q.answer_tip || null,
          correct_answer_text: q.correct_answer || null,
          topics: Array.isArray(q.topic) ? q.topic : q.topic ? [q.topic] : [],
          difficulty: 'medium',
          is_premium: false
        })
        .select('id')
        .single();
      
      if (questionError) {
        console.error(`❌ Ошибка импорта вопроса Билет ${missing.ticketNumber}, Вопрос ${missing.questionNumber}:`, questionError.message);
        errors++;
        continue;
      }

      // Импортируем ответы
      if (q.answers && Array.isArray(q.answers) && q.answers.length > 0) {
        const answers = q.answers.map((answer, index) => ({
          question_id: question.id,
          answer_text: answer.answer_text || answer.text || '',
          is_correct: answer.is_correct || false,
          position: index + 1
        }));
        
        const { error: answersError } = await supabase
          .from('pdd_russia_answers')
          .insert(answers);
        
        if (answersError) {
          console.error(`❌ Ошибка импорта ответов:`, answersError);
        }
      }

      imported++;
      if (imported % 5 === 0) {
        console.log(`✅ Импортировано: ${imported}/${missingQuestions.length}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка обработки вопроса:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Итоги:`);
  console.log(`  ✅ Импортировано: ${imported}`);
  console.log(`  ❌ Ошибок: ${errors}`);
  
  if (imported > 0) {
    console.log(`\n💡 Совет: Запусти 'npm run reupload:pdd-images' для загрузки изображений для новых вопросов.`);
  }
}

const repoPath = process.argv[2] || '/tmp/pdd_russia';
findAndImportMissing(repoPath).catch(console.error);


