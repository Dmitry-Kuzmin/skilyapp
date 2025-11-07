#!/usr/bin/env node

/**
 * Скрипт для диагностики проблем синхронизации с Google Sheets
 */

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugSyncIssues() {
  console.log('🔍 Диагностика проблем синхронизации...\n');
  console.log('='.repeat(80));

  // 1. Проверяем topics в базе
  console.log('\n📚 1. Проверка topics в базе данных:');
  console.log('-'.repeat(80));
  
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, number, title_ru')
    .order('number');

  if (topicsError) {
    console.log(`   ❌ Ошибка получения topics: ${topicsError.message}`);
  } else {
    console.log(`   ✅ Найдено topics: ${topics?.length || 0}`);
    if (topics && topics.length > 0) {
      console.log('   📋 Список topics:');
      topics.forEach(topic => {
        console.log(`      - Тема ${topic.number}: ${topic.title_ru} (ID: ${topic.id})`);
      });
    } else {
      console.log('   ⚠️  Topics не найдены в базе!');
      console.log('   📝 Нужно загрузить topics через синхронизацию или вручную');
    }
  }

  // 2. Проверяем вопросы в базе
  console.log('\n❓ 2. Проверка вопросов в базе данных:');
  console.log('-'.repeat(80));
  
  const { count: questionsCount, error: questionsError } = await supabase
    .from('questions_new')
    .select('*', { count: 'exact', head: true });

  if (questionsError) {
    console.log(`   ❌ Ошибка получения вопросов: ${questionsError.message}`);
  } else {
    console.log(`   📊 Всего вопросов в базе: ${questionsCount || 0}`);
  }

  // 3. Проверяем структуру таблицы questions_new
  console.log('\n📋 3. Проверка структуры таблицы questions_new:');
  console.log('-'.repeat(80));
  
  const { data: sampleQuestion, error: sampleError } = await supabase
    .from('questions_new')
    .select('*')
    .limit(1)
    .single();

  if (sampleError && sampleError.code !== 'PGRST116') {
    console.log(`   ⚠️  Ошибка получения примера: ${sampleError.message}`);
  } else if (sampleQuestion) {
    console.log('   ✅ Структура таблицы:');
    console.log('   📋 Поля:');
    Object.keys(sampleQuestion).forEach(key => {
      console.log(`      - ${key}: ${typeof sampleQuestion[key]}`);
    });
  } else {
    console.log('   ℹ️  Таблица пуста, проверяем схему через SQL...');
  }

  // 4. Проверяем обязательные поля
  console.log('\n✅ 4. Проверка обязательных полей:');
  console.log('-'.repeat(80));
  console.log('   📋 Обязательные поля для синхронизации:');
  console.log('      - source_id (колонка 0) - уникальный ID вопроса');
  console.log('      - topic_number (колонка 1) - номер темы (1-10)');
  console.log('      - question_ru (колонка 8) - текст вопроса на русском');
  console.log('      - question_es (колонка 9) - текст вопроса на испанском');
  console.log('      - question_en (колонка 10) - текст вопроса на английском');

  // 5. Рекомендации
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 РЕКОМЕНДАЦИИ:');
  console.log('-'.repeat(80));
  
  console.log('\n1. Проверьте структуру Google Sheets таблицы:');
  console.log('   - Первая колонка (A) должна быть: source_id');
  console.log('   - Вторая колонка (B) должна быть: topic_number');
  console.log('   - Восьмая колонка (I) должна быть: question_ru');
  console.log('   - Девятая колонка (J) должна быть: question_es');
  console.log('   - Десятая колонка (K) должна быть: question_en');
  
  console.log('\n2. Проверьте данные в Google Sheets:');
  console.log('   - Убедитесь, что source_id заполнен в каждой строке');
  console.log('   - Убедитесь, что topic_number соответствует существующим темам (1-10)');
  console.log('   - Убедитесь, что question_ru, question_es, question_en заполнены');
  
  console.log('\n3. Проверьте логи функции:');
  console.log('   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs');
  console.log('   Ищите сообщения:');
  console.log('   - "Parsed X columns for row Y" - показывает, сколько колонок распознано');
  console.log('   - "Вопрос пропущен: отсутствует source_id" - первая колонка пустая');
  console.log('   - "Тема X не найдена в базе" - topic_number неправильный');
  
  console.log('\n4. Проверьте формат данных:');
  console.log('   - source_id должен быть текстом (например, "GS-1", "GS-2")');
  console.log('   - topic_number должен быть числом (1, 2, 3, ..., 10)');
  console.log('   - question_ru/es/en должны быть текстом');
  
  if (!topics || topics.length === 0) {
    console.log('\n⚠️  ВАЖНО: Topics не найдены в базе!');
    console.log('   Сначала нужно синхронизировать вкладку "Topics" в Google Sheets');
    console.log('   Или загрузить topics вручную через SQL Editor');
  }
}

debugSyncIssues().catch(console.error);

