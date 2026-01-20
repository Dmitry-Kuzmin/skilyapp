#!/usr/bin/env node

/**
 * ENRICH BATCH SCRIPT
 * 
 * Берет JSON файл с вопросами (только на испанском),
 * переводит их на RU/EN и генерирует крутые объяснения через Gemini AI.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ Ошибка: GEMINI_API_KEY не установлен.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-preview", // User requested strict usage of this model
    generationConfig: { responseMimeType: "application/json" }
});

async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return {
            inlineData: {
                data: Buffer.from(response.data).toString("base64"),
                mimeType: "image/jpeg"
            }
        };
    } catch (e) {
        console.warn(`  ⚠️ Не удалось загрузить картинку по URL: ${url}`);
        return null;
    }
}

async function enrichQuestion(q) {
    const prompt = `
    Ты — эксперт-автоинструктор. Переведи вопрос и варианты ответов на русский и английский. 
    Сгенерируй крутое объяснение (explanation) на трех языках (ES, RU, EN) в формате Markdown.
    Объяснение на русском должно быть живым, с юмором, как будто объясняет опытный инструктор ("торпеда", "обочина", "ловушка").
    
    СТРУКТУРА ОБЪЯСНЕНИЯ (3 блока):
    1. Анализ ситуации (что видим на фото/в вопросе).
    2. Логика правила (почему именно так?).
    3. Шпаргалка/трюк (как не ошибиться).

    ИСХОДНЫЕ ДАННЫЕ:
    Вопрос (ES): ${q.question.es}
    Правильный ответ: ${q.answers.find(a => a.is_correct)?.text.es}
    Все ответы: ${q.answers.map(a => a.text.es).join(' | ')}

    ВЕРНИ JSON:
    {
      "question": { "es": "...", "en": "...", "ru": "..." },
      "answers": [
        { "id": "a", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": ... },
        ...
      ],
      "explanation": { "es": "...", "en": "...", "ru": "..." }
    }
    `;

    const parts = [prompt];

    // Если есть картинка, скачиваем её для анализа AI
    const imageUrl = q.image_url || q.schema_url;
    if (imageUrl && !imageUrl.includes('faces/')) {
        const imagePart = await downloadImageAsBase64(imageUrl);
        if (imagePart) parts.push(imagePart);
    }

    let retries = 0;
    const MAX_RETRIES = 5;

    while (retries < MAX_RETRIES) {
        try {
            const result = await model.generateContent(parts);
            const responseText = result.response.text();
            const cleanJson = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const data = JSON.parse(cleanJson);

            // Merge AI data back to original question structure
            return {
                ...q,
                question: data.question,
                answers: data.answers,
                explanation: data.explanation
            };
        } catch (error) {
            const isRateLimit = error.message.includes('429') || error.message.includes('Quota exceeded');

            if (isRateLimit || error.message.includes('503')) {
                retries++;
                const waitTime = 5000 * Math.pow(2, retries); // Exponential backoff: 10s, 20s, 40s...
                console.warn(`\n   ⚠️ Rate limit/Error hit. Retrying in ${waitTime / 1000}s (Attempt ${retries}/${MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, waitTime));
            } else {
                console.error(`  ❌ Fatal AI Error for question:`, error.message);
                return q; // Non-retriable error
            }
        }
    }

    console.error(`  ❌ Failed after ${MAX_RETRIES} retries. Skipping.`);
    return q;
}

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("❌ Укажите путь к JSON файлу.");
        process.exit(1);
    }

    const rawData = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(rawData);

    console.log(`🧠 Начинаем AI-обогащение (${questions.length} вопросов)...`);

    const enrichedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
        process.stdout.write(`   🔄 Обработка ${i + 1}/${questions.length}...\r`);
        const enriched = await enrichQuestion(questions[i]);
        enrichedQuestions.push(enriched);

        // Маленькая задержка для соблюдения лимитов
        // Delay to respect rate limits (Pro model needs significantly more time)
        await new Promise(r => setTimeout(r, 20000));
    }

    // Сохраняем поверх того же файла (или в новый)
    const enrichedPath = filePath.replace('.json', '-enriched.json');
    await fs.writeFile(enrichedPath, JSON.stringify(enrichedQuestions, null, 2));

    console.log(`\n✅ Обогащение завершено! Файл сохранен: ${enrichedPath}`);
    return enrichedPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

export { enrichQuestion };
