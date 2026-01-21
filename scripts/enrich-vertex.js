/**
 * ENRICH BATCH VERTEX - ИСПОЛЬЗУЕМ БОНУСЫ VERTEX AI
 * 
 * Клон скрипта enrich-batch-v2.js, но переписанный под Google Cloud Vertex AI SDK.
 * Он использует файл google-services.json для авторизации сервисным аккаунтом.
 * 
 * Цель: Использовать облачные кредиты вместо бесплатных лимитов API.
 */

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';

// Загружаем .env для совместимости (хотя ключ берем из файла)
dotenv.config();

// Конфигурация Vertex
const PROJECT_ID = 'gen-lang-client-0120490543'; // Из google-services.json
const LOCATION = 'us-central1'; // Стандартный регион или us-central1
const MODEL_NAME = 'gemini-1.5-flash-001'; // Working model confirmed via diagnostic

// Инициализация Vertex AI
const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
    keyFilename: './google-services.json' // Путь к файлу ключа
});

const generativeModel = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.2, // Понижаем температуру для большей точности
        topP: 0.95,
        responseMimeType: "application/json" // Vertex поддерживает JSON Output mode
    },
});

// JSON Schema для валидации (вспомогательная, Vertex возвращает JSON нативно, но проверим)
const responseSchema = {
    // ... та же схема что и раньше ...
};

// Функция загрузки картинки
async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const mimeType = response.headers['content-type'];
        const buffer = Buffer.from(response.data);
        return {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: mimeType
            }
        };
    } catch (error) {
        console.warn(`⚠️ Failed to download image ${url}: ${error.message}`);
        return null;
    }
}

// Промпт для перевода
const SYSTEM_PROMPT = `
Ты эксперт DGT (Dirección General de Tráfico) Spain.
Твоя задача — перевести вопрос и ответы на Русский (RU) и Английский (EN), а также сгенерировать ПОДРОБНОЕ объяснение.

ФОРМАТ ОБЪЯСНЕНИЯ (Markdown):
# 🇪🇸 [Название правила/знака на испанском]
# 🇷🇺 [Название правила/знака на русском]

🎓 **Правило:**
[Четкое описание правила ПДД Испании. Обязательно укажи конкретные цифры, ограничения скорости, приоритеты.]

💡 **Почему этот ответ верный:**
[Разбор конкретной ситуации из вопроса. Почему именно этот вариант правильный, а другие — нет.]

⚠️ **Частая ошибка:**
[Какую ошибку часто совершают ученики в этом вопросе?]

⬇️ JSON СТРУКТУРА ОТВЕТА (CTРОГО!):
{
  "question": { "es": "...", "en": "...", "ru": "..." },
  "answers": [
    { "id": "a", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": true/false },
    { "id": "b", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": true/false },
    { "id": "c", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": true/false }
  ],
  "explanation": {
    "es": "...", 
    "en": "...", 
    "ru": "..." 
  },
  "topic_id": "topic-XX",
  "difficulty": "easy/medium/hard"
}

ВАЖНО:
1. ID ответов должны быть строго "a", "b", "c".
2. Не используй Markdown (json block) в ответе, верни чистый JSON объект.
3. Если есть картинка, учитывай её контекст(знаки, разметку) в объяснении.
`;

// Основная функция обогащения одного вопроса
async function enrichQuestion(q) {
    const prompt = `
Исходный вопрос(ES): "${q.question}"
Ответы:
${q.answers.map(a => `- [${a.id}] ${a.text} (${a.is_correct ? 'CORRECT' : 'WRONG'})`).join('\n')}

Изображение(если есть): ${q.image_url || q.schema_url || 'Нет'}

${SYSTEM_PROMPT}
`;

    const parts = [{ text: prompt }];

    // Добавляем картинки
    if (q.schema_url) {
        const img = await downloadImageAsBase64(q.schema_url);
        if (img) parts.push(img);
    } else if (q.image_url && !q.image_url.includes('faces/')) {
        const img = await downloadImageAsBase64(q.image_url);
        if (img) parts.push(img);
    }

    // Вызов Vertex AI
    const result = await generativeModel.generateContent({
        contents: [{ role: 'user', parts }]
    });

    const response = await result.response;
    const text = response.candidates[0].content.parts[0].text;

    // Парсим JSON
    let data;
    try {
        // Очистка от маркдауна если вдруг он есть
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        data = JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        throw new Error("Invalid JSON from Vertex AI");
    }

    // Возвращаем смерженные данные: сохраняем старые поля (id, image_url) + новые переводы
    return {
        ...q,
        ...data,
        // Гарантируем сохранение оригинальных url
        image_url: q.image_url,
        schema_url: q.schema_url
    };
}


// MAIN LOOP
async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("❌ Укажите путь к JSON файлу.");
        process.exit(1);
    }

    console.log(`🚀 Vertex AI Enrichment started for: ${filePath}`);
    console.log(`💰 Using Project: ${PROJECT_ID} (Credits)`);

    const rawData = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(rawData);

    const enrichedPath = filePath.replace('.json', '-enriched.json');
    let finalQuestions = [];

    // Resume logic
    try {
        const existing = await fs.readFile(enrichedPath, 'utf8');
        finalQuestions = JSON.parse(existing);
        if (finalQuestions.length !== questions.length) {
            // Simple resume: if sizes match, good. If not, re-init.
            // For simplify, let's map existing
            finalQuestions = questions.map((src, i) => finalQuestions[i] || src);
        }
    } catch (e) {
        finalQuestions = [...questions];
    }

    let processedCount = 0;

    for (let i = 0; i < finalQuestions.length; i++) {
        const q = finalQuestions[i];

        // Skip if already processed (has russian explanation)
        if (q.explanation?.ru && q.question?.ru) {
            continue;
        }

        process.stdout.write(`   🔄 Processing Q ${i + 1}/${finalQuestions.length}...\r`);

        try {
            const enriched = await enrichQuestion(q);
            finalQuestions[i] = enriched;

            // Save immediately (checkpoint)
            await fs.writeFile(enrichedPath, JSON.stringify(finalQuestions, null, 2));
            processedCount++;

            // Задержка не так важна для Vertex (там 300 RPM), но лучше не спамить
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`\n❌ Error on Q${i + 1}:`, error.message);
            // Non-fatal, continue to next
        }
    }

    console.log(`\n✅ Completed! Processed ${processedCount} questions.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}
