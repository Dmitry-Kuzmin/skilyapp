#!/usr/bin/env node

/**
 * Скрипт для проверки статуса изображений ПДД России
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Ошибка: нужны SUPABASE_URL и SUPABASE_SERVICE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkImages() {
  console.log('🖼️  Проверка статуса изображений ПДД России...\n');

  // Проверяем вопросы
  const { data: questions, error: questionsError } = await supabase
    .from('pdd_russia_questions')
    .select('id, ticket_number, question_number, image_url');

  if (questionsError) {
    console.error('❌ Ошибка при загрузке вопросов:', questionsError);
    return;
  }

  const totalQuestions = questions?.length || 0;
  const questionsWithImages = questions?.filter(q => q.image_url && q.image_url.startsWith('http')).length || 0;
  const questionsWithoutImages = totalQuestions - questionsWithImages;

  console.log('📝 Вопросы:');
  console.log(`  Всего: ${totalQuestions}`);
  console.log(`  С изображениями: ${questionsWithImages} (${Math.round(questionsWithImages / totalQuestions * 100)}%)`);
  console.log(`  Без изображений: ${questionsWithoutImages} (${Math.round(questionsWithoutImages / totalQuestions * 100)}%)\n`);

  // Проверяем знаки
  const { data: signs, error: signsError } = await supabase
    .from('pdd_russia_signs')
    .select('id, category, number, image_url');

  if (signsError) {
    console.error('❌ Ошибка при загрузке знаков:', signsError);
    return;
  }

  const totalSigns = signs?.length || 0;
  const signsWithImages = signs?.filter(s => s.image_url && s.image_url.startsWith('http')).length || 0;
  const signsWithoutImages = totalSigns - signsWithImages;

  console.log('🛑 Дорожные знаки:');
  console.log(`  Всего: ${totalSigns}`);
  console.log(`  С изображениями: ${signsWithImages} (${Math.round(signsWithImages / totalSigns * 100)}%)`);
  console.log(`  Без изображений: ${signsWithoutImages} (${Math.round(signsWithoutImages / totalSigns * 100)}%)\n`);

  // Проверяем Storage
  try {
    const { data: files, error: storageError } = await supabase.storage
      .from('pdd_russia')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (storageError) {
      console.log('⚠️  Ошибка при проверке Storage:', storageError.message);
    } else {
      const totalFiles = files?.length || 0;
      const imageFiles = files?.filter(f => 
        f.name.endsWith('.jpg') || 
        f.name.endsWith('.jpeg') || 
        f.name.endsWith('.png') || 
        f.name.endsWith('.svg') ||
        f.name.endsWith('.webp')
      ).length || 0;

      console.log('📦 Supabase Storage (bucket pdd_russia):');
      console.log(`  Всего файлов: ${totalFiles}`);
      console.log(`  Изображений: ${imageFiles}\n`);

      // Группируем по папкам
      const byFolder = new Map();
      files?.forEach(file => {
        const folder = file.name.split('/')[0] || 'root';
        byFolder.set(folder, (byFolder.get(folder) || 0) + 1);
      });

      if (byFolder.size > 0) {
        console.log('  По папкам:');
        Array.from(byFolder.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([folder, count]) => {
            console.log(`    ${folder}: ${count} файлов`);
          });
      }
    }
  } catch (error) {
    console.log('⚠️  Ошибка при проверке Storage:', error.message);
  }

  // Итоговая статистика
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:\n');
  
  if (questionsWithImages / totalQuestions < 0.5) {
    console.log('⚠️  Много вопросов без изображений!');
    console.log('   Нужно перезапустить импорт после исправления политик Storage.\n');
  } else {
    console.log('✅ Большинство вопросов имеют изображения!\n');
  }

  if (signsWithImages / totalSigns > 0.9) {
    console.log('✅ Знаки загружены успешно!\n');
  } else {
    console.log('⚠️  Некоторые знаки без изображений.\n');
  }
}

checkImages().catch(console.error);


