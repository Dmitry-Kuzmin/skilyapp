#!/usr/bin/env node

/**
 * Скрипт для создания тестовых данных в базе данных
 * 
 * Этот скрипт создает минимальный набор тестовых данных для проверки работы приложения
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

async function createTestData() {
  console.log('🚀 Создание тестовых данных...\n');
  console.log('='.repeat(80));

  // 1. Получаем существующие topics
  console.log('\n📋 1. Получение существующих topics...');
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, number')
    .order('number');

  if (topicsError) {
    console.log(`   ❌ Ошибка: ${topicsError.message}`);
    return;
  }

  if (!topics || topics.length === 0) {
    console.log('   ❌ Topics не найдены. Убедитесь, что seed данные загружены.');
    return;
  }

  console.log(`   ✅ Найдено topics: ${topics.length}`);

  // 2. Создаем subtopics для первых 3 topics
  console.log('\n📚 2. Создание subtopics...');
  const subtopicsToCreate = [];
  
  for (let i = 0; i < Math.min(3, topics.length); i++) {
    const topic = topics[i];
    subtopicsToCreate.push(
      {
        topic_id: topic.id,
        title_ru: `Подтема ${i + 1} для темы ${topic.number}`,
        title_es: `Subtema ${i + 1} para tema ${topic.number}`,
        title_en: `Subtopic ${i + 1} for topic ${topic.number}`,
        type: 'material',
        order_index: 1
      },
      {
        topic_id: topic.id,
        title_ru: `Подтема ${i + 2} для темы ${topic.number}`,
        title_es: `Subtema ${i + 2} para tema ${topic.number}`,
        title_en: `Subtopic ${i + 2} for topic ${topic.number}`,
        type: 'test',
        order_index: 2
      }
    );
  }

  const { data: createdSubtopics, error: subtopicsError } = await supabase
    .from('subtopics')
    .insert(subtopicsToCreate)
    .select();

  if (subtopicsError) {
    console.log(`   ⚠️  Ошибка создания subtopics: ${subtopicsError.message}`);
  } else {
    console.log(`   ✅ Создано subtopics: ${createdSubtopics?.length || 0}`);
  }

  // 3. Создаем materials для subtopics
  console.log('\n📄 3. Создание materials...');
  if (createdSubtopics && createdSubtopics.length > 0) {
    const materialsToCreate = createdSubtopics
      .filter(st => st.type === 'material')
      .map(subtopic => ({
        subtopic_id: subtopic.id,
        title_ru: `Материал для ${subtopic.title_ru}`,
        title_es: `Material para ${subtopic.title_es}`,
        title_en: `Material for ${subtopic.title_en}`,
        content_ru: 'Это тестовый материал на русском языке. Он содержит базовую информацию для изучения.',
        content_es: 'Este es un material de prueba en español. Contiene información básica para el estudio.',
        content_en: 'This is a test material in English. It contains basic information for study.',
        type: 'theory',
        is_published: true,
        version: 1
      }));

    const { data: createdMaterials, error: materialsError } = await supabase
      .from('materials')
      .insert(materialsToCreate)
      .select();

    if (materialsError) {
      console.log(`   ⚠️  Ошибка создания materials: ${materialsError.message}`);
    } else {
      console.log(`   ✅ Создано materials: ${createdMaterials?.length || 0}`);
    }
  }

  // 4. Создаем questions для первых 3 topics
  console.log('\n❓ 4. Создание questions...');
  const questionsToCreate = [];
  
  for (let i = 0; i < Math.min(3, topics.length); i++) {
    const topic = topics[i];
    
    // Создаем 3 вопроса для каждой темы
    for (let j = 1; j <= 3; j++) {
      questionsToCreate.push({
        topic_id: topic.id,
        question_ru: `Тестовый вопрос ${j} для темы ${topic.number}`,
        question_es: `Pregunta de prueba ${j} para tema ${topic.number}`,
        question_en: `Test question ${j} for topic ${topic.number}`,
        explanation_ru: `Объяснение для вопроса ${j}`,
        explanation_es: `Explicación para pregunta ${j}`,
        explanation_en: `Explanation for question ${j}`,
        difficulty: j === 1 ? 'easy' : j === 2 ? 'medium' : 'hard',
        is_premium: j === 3,
        type: 'single',
        percent_correct: 0
      });
    }
  }

  const { data: createdQuestions, error: questionsError } = await supabase
    .from('questions_new')
    .insert(questionsToCreate)
    .select();

  if (questionsError) {
    console.log(`   ⚠️  Ошибка создания questions: ${questionsError.message}`);
  } else {
    console.log(`   ✅ Создано questions: ${createdQuestions?.length || 0}`);

    // 5. Создаем answer_options для questions
    console.log('\n📝 5. Создание answer_options...');
    if (createdQuestions && createdQuestions.length > 0) {
      const answerOptionsToCreate = [];
      
      for (const question of createdQuestions) {
        // Создаем 4 варианта ответа для каждого вопроса
        for (let i = 1; i <= 4; i++) {
          answerOptionsToCreate.push({
            question_id: question.id,
            text_ru: `Вариант ответа ${i} для вопроса`,
            text_es: `Opción de respuesta ${i} para pregunta`,
            text_en: `Answer option ${i} for question`,
            is_correct: i === 1, // Первый вариант всегда правильный
            order: i
          });
        }
      }

      const { data: createdAnswers, error: answersError } = await supabase
        .from('answer_options')
        .insert(answerOptionsToCreate)
        .select();

      if (answersError) {
        console.log(`   ⚠️  Ошибка создания answer_options: ${answersError.message}`);
      } else {
        console.log(`   ✅ Создано answer_options: ${createdAnswers?.length || 0}`);
      }
    }
  }

  // 6. Создаем road_signs
  console.log('\n🛑 6. Создание road_signs...');
  const roadSignsToCreate = [
    {
      name_ru: 'Стоп',
      name_es: 'Stop',
      description_ru: 'Знак остановки',
      description_es: 'Señal de parada',
      sign_type: 'prohibición',
      sign_number: 'R-301'
    },
    {
      name_ru: 'Уступи дорогу',
      name_es: 'Ceda el paso',
      description_ru: 'Знак уступить дорогу',
      description_es: 'Señal de ceder el paso',
      sign_type: 'prioridad',
      sign_number: 'R-302'
    },
    {
      name_ru: 'Главная дорога',
      name_es: 'Vía principal',
      description_ru: 'Знак главной дороги',
      description_es: 'Señal de vía principal',
      sign_type: 'prioridad',
      sign_number: 'R-303'
    }
  ];

  const { data: createdRoadSigns, error: roadSignsError } = await supabase
    .from('road_signs')
    .insert(roadSignsToCreate)
    .select();

  if (roadSignsError) {
    console.log(`   ⚠️  Ошибка создания road_signs: ${roadSignsError.message}`);
  } else {
    console.log(`   ✅ Создано road_signs: ${createdRoadSigns?.length || 0}`);
  }

  // 7. Создаем language_terms
  console.log('\n📖 7. Создание language_terms...');
  const languageTermsToCreate = [
    {
      term_ru: 'Автомобиль',
      term_es: 'Coche',
      description_ru: 'Транспортное средство',
      description_es: 'Vehículo de transporte',
      difficulty: 'easy'
    },
    {
      term_ru: 'Водитель',
      term_es: 'Conductor',
      description_ru: 'Человек, управляющий транспортным средством',
      description_es: 'Persona que conduce un vehículo',
      difficulty: 'easy'
    },
    {
      term_ru: 'Дорога',
      term_es: 'Carretera',
      description_ru: 'Путь для движения транспорта',
      description_es: 'Vía para el tráfico',
      difficulty: 'medium'
    }
  ];

  const { data: createdTerms, error: termsError } = await supabase
    .from('language_terms')
    .insert(languageTermsToCreate)
    .select();

  if (termsError) {
    console.log(`   ⚠️  Ошибка создания language_terms: ${termsError.message}`);
  } else {
    console.log(`   ✅ Создано language_terms: ${createdTerms?.length || 0}`);
  }

  // Итоговая статистика
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Тестовые данные созданы!');
  console.log('\n📊 Создано:');
  console.log(`   - Subtopics: ${createdSubtopics?.length || 0}`);
  console.log(`   - Materials: ${createdMaterials?.length || 0}`);
  console.log(`   - Questions: ${createdQuestions?.length || 0}`);
  console.log(`   - Answer Options: ${createdAnswers?.length || 0}`);
  console.log(`   - Road Signs: ${createdRoadSigns?.length || 0}`);
  console.log(`   - Language Terms: ${createdTerms?.length || 0}`);

  console.log('\n📋 Проверьте данные в Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/editor`);
}

createTestData().catch(console.error);

