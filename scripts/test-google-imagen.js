import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const INPUT_IMAGE_URL = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
const OUTPUT_PATH = "data/google_imagen_test.png";

// Промпт для Google (похож на наш финальный)
const PROMPT = "Fix this image. Create a photorealistic high-angle shot of this traffic scenario. Solid opaque metal cars, thick glossy car paint. Bright sunny noon lighting, hard shadows. Crystal clear asphalt texture. No blur, no ghosting, no artifacts. Keep the exact layout.";

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY not found in .env.local");
        process.exit(1);
    }

    console.log("🚀 Запуск Google Gemini Image Test...");

    try {
        // 1. Скачиваем картинку
        console.log(`📥 Скачиваем оригинал: ${INPUT_IMAGE_URL}`);
        const imageResponse = await axios.get(INPUT_IMAGE_URL, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

        // 2. Отправляем в Google Gemini
        // Используем модель, которую просил пользователь (Nano Banana)
        const MODEL = "gemini-2.5-flash-image";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

        console.log(`📤 Отправляем в ${MODEL}...`);

        const payload = {
            contents: [{
                parts: [
                    { text: PROMPT },
                    { inline_data: { mime_type: mimeType, data: base64Image } }
                ]
            }]
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        // 3. Обрабатываем ответ
        const candidates = response.data.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            let imageSaved = false;

            for (const part of parts) {
                if (part.inline_data) {
                    console.log("✨ Получено изображение!");
                    const imgData = part.inline_data.data;
                    const buffer = Buffer.from(imgData, 'base64');
                    fs.writeFileSync(OUTPUT_PATH, buffer);
                    console.log(`✅ Сохранено: ${OUTPUT_PATH}`);
                    imageSaved = true;
                }
            }

            if (!imageSaved) {
                console.log("⚠️ Ответ получен, но изображения нет. Возможно, модель вернула текст:");
                console.log(JSON.stringify(parts, null, 2));
            }

        } else {
            console.error("❌ Пустой ответ кандидатов:", JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        if (error.response) {
            console.error(`❌ Ошибка API (${error.response.status}):`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("❌ Ошибка сети/кода:", error.message);
        }
    }
}

main();
