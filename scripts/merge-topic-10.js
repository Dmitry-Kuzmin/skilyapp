/**
 * Скрипт для объединения вопросов Topic 10 из двух источников
 * и конвертации в единый формат для questions_new
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к файлам
const OLD_FORMAT_PATH = path.join(__dirname, '../data/test-results.json');
const NEW_FORMAT_PATH = path.join(__dirname, '../data/topic-10-raw-30.json');
const OUTPUT_PATH = path.join(__dirname, '../data/topic-10-all-60.json');

// Загрузка данных
const oldFormatQuestions = JSON.parse(fs.readFileSync(OLD_FORMAT_PATH, 'utf8'));
const newFormatQuestions = JSON.parse(fs.readFileSync(NEW_FORMAT_PATH, 'utf8'));

console.log(`📥 Загружено ${oldFormatQuestions.length} вопросов из старого формата`);
console.log(`📥 Загружено ${newFormatQuestions.length} вопросов из нового формата`);

/**
 * Конвертирует вопрос из старого формата в новый
 */
function convertOldToNew(oldQuestion, index) {
    // Создаем answer_options из option_a/b/c
    const answerOptions = ['a', 'b', 'c'].map(id => {
        const optionKey = `option_${id}_es`;
        let textEs = oldQuestion[optionKey] || '';

        // Убираем префикс "A: ", "B: ", "C: " если есть
        textEs = textEs.replace(/^[ABC]:\s*/, '');
        textEs = textEs.replace(/^[ABC]\)\s*[ABC]:\s*/, ''); // для формата "A) A: текст"

        return {
            id,
            text_es: textEs,
            text_ru: oldQuestion[`option_${id}_ru`] || null,
            text_en: oldQuestion[`option_${id}_en`] || null,
            is_correct: oldQuestion.correct_answer === id
        };
    });

    return {
        question_es: oldQuestion.question_es,
        question_ru: oldQuestion.question_ru || null,
        question_en: oldQuestion.question_en || null,
        image_url: oldQuestion.image_url,
        image_filename: oldQuestion.image_filename,
        schema_url: oldQuestion.schema_url || null,
        type: 'single',
        country: 'es',
        metadata: {
            answer_options: answerOptions,
            explanation_es: oldQuestion.explanation_es || null,
            explanation_ru: oldQuestion.explanation_ru || null,
            explanation_en: oldQuestion.explanation_en || null,
            source: oldQuestion.source || 'practicalvial',
            original_number: oldQuestion.question_number || index + 1
        }
    };
}

// Конвертируем старые вопросы
const convertedOldQuestions = oldFormatQuestions.map((q, i) => convertOldToNew(q, i));

// Объединяем массивы
const mergedQuestions = [...convertedOldQuestions, ...newFormatQuestions];

console.log(`\n✅ Объединено ${mergedQuestions.length} вопросов`);
console.log(`   - ${convertedOldQuestions.length} из старого формата`);
console.log(`   - ${newFormatQuestions.length} из нового формата`);

// Сохраняем результат
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mergedQuestions, null, 2), 'utf8');

console.log(`\n💾 Результат сохранен в: ${OUTPUT_PATH}`);
console.log(`\n🔍 Статистика:`);
console.log(`   - Всего вопросов: ${mergedQuestions.length}`);
console.log(`   - С переводом RU: ${mergedQuestions.filter(q => q.question_ru).length}`);
console.log(`   - С переводом EN: ${mergedQuestions.filter(q => q.question_en).length}`);
console.log(`   - С объяснением ES: ${mergedQuestions.filter(q => q.metadata.explanation_es).length}`);
console.log(`   - С объяснением RU: ${mergedQuestions.filter(q => q.metadata.explanation_ru).length}`);
console.log(`   - С объяснением EN: ${mergedQuestions.filter(q => q.metadata.explanation_en).length}`);

// Проверяем, какие поля нужно заполнить через AI
const missingTranslations = mergedQuestions.filter(q => !q.question_ru || !q.question_en);
const missingExplanations = mergedQuestions.filter(q =>
    !q.metadata.explanation_es || !q.metadata.explanation_ru || !q.metadata.explanation_en
);

console.log(`\n⚠️  Требуется AI-обработка:`);
console.log(`   - Вопросов без переводов: ${missingTranslations.length}`);
console.log(`   - Вопросов без объяснений: ${missingExplanations.length}`);
