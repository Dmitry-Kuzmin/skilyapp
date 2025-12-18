#!/usr/bin/env node

/**
 * Скрипт для поиска недостающих вопросов в билетах
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const repoPath = process.argv[2] || '/tmp/pdd_russia';
const questionsDir = join(repoPath, 'questions');

const files = readdirSync(questionsDir).filter(f => f.endsWith('.json'));

const ticketsToCheck = [4, 5, 8, 9];

console.log('🔍 Поиск недостающих вопросов...\n');

for (const ticketNum of ticketsToCheck) {
  const ticketName = `Билет ${ticketNum}`;
  const foundQuestions = new Set();
  
  for (const file of files) {
    const filePath = join(questionsDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const questions = JSON.parse(content);
    
    const ticketQuestions = Array.isArray(questions)
      ? questions.filter(q => q.ticket_number === ticketName)
      : [];
    
    ticketQuestions.forEach(q => {
      const match = q.title?.match(/Вопрос (\d+)/);
      if (match) {
        foundQuestions.add(parseInt(match[1]));
      }
    });
  }
  
  const allQuestions = Array.from({ length: 20 }, (_, i) => i + 1);
  const missing = allQuestions.filter(n => !foundQuestions.has(n));
  
  console.log(`${ticketName}:`);
  console.log(`  Найдено: ${foundQuestions.size}/20`);
  if (missing.length > 0) {
    console.log(`  ❌ Отсутствуют: ${missing.join(', ')}`);
  } else {
    console.log(`  ✅ Все вопросы найдены`);
  }
  console.log();
}


