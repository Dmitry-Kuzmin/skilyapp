import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3 // Более строгая генерация
    }
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
        return null;
    }
}

async function fixQuestion(q) {
    const prompt = `Ты - эксперт по переводу и созданию педагогических объяснений для экзаменационных вопросов водительских прав.

ВОПРОС (ES): ${q.question.es}

ВАРИАНТЫ ОТВЕТОВ:
${q.answers.map((a, i) => `${['A', 'B', 'C'][i]}) ${a.text.es} ${a.is_correct ? '✅ ПРАВИЛЬНЫЙ' : ''}`).join('\n')}

ЗАДАНИЕ:
Создай СТРОГО ВАЛИДНЫЙ JSON со следующими полями:
1. question: { es, en, ru } - переводы вопроса
2. answers: массив из 3 объектов с { id, text: { es, en, ru }, is_correct }
3. explanation: { es, en, ru } - развернутые объяснения в формате markdown

ТРЕБОВАНИЯ К ОБЪЯСНЕНИЮ:
- ES: Живо, с примерами
- EN: Профессионально, как британский инструктор
- RU: С юмором, используя слова "торпеда" (легковушка), "обочина", "ловушка"

ВНИМАНИЕ: Ответ должен быть ТОЛЬКО валидным JSON без комментариев, без markdown-блоков, без дополнительного текста!`;

    const parts = [prompt];

    const imageUrl = q.image_url || q.schema_url;
    if (imageUrl && !imageUrl.includes('faces/')) {
        const imagePart = await downloadImageAsBase64(imageUrl);
        if (imagePart) parts.push(imagePart);
    }

    const result = await model.generateContent(parts);
    let responseText = result.response.text();

    // Агрессивная очистка
    responseText = responseText.trim();
    responseText = responseText.replace(/^```json\s*/gm, '');
    responseText = responseText.replace(/^```\s*/gm, '');
    responseText = responseText.replace(/\s*```$/gm, '');

    const data = JSON.parse(responseText);

    return {
        ...q,
        question: data.question,
        answers: data.answers,
        explanation: data.explanation
    };
}

async function main() {
    const filePath = process.argv[2];
    const rawData = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(rawData);

    console.log(`🔧 Исправление вопросов с null-значениями...`);

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Проверяем, есть ли null в переводах
        const hasNulls = !q.question.en || !q.question.ru ||
            !q.explanation.es || !q.explanation.en || !q.explanation.ru;

        if (hasNulls) {
            console.log(`\n🔄 Исправление вопроса #${q.question_number}...`);
            try {
                questions[i] = await fixQuestion(q);
                console.log(`✅ Вопрос #${q.question_number} исправлен`);
                await new Promise(r => setTimeout(r, 3000)); // Задержка
            } catch (err) {
                console.error(`❌ Ошибка для #${q.question_number}:`, err.message);
            }
        }
    }

    await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
    console.log(`\n✅ Файл обновлен: ${filePath}`);
}

main().catch(console.error);
