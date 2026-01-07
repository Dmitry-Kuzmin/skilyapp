import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// Промпт для ПЕРЕРИСОВКИ (не создания с нуля)
const PROMPT = `Transform this Spanish DGT driving exam image into a clean 3D educational simulator style while PRESERVING ALL LEGAL ELEMENTS EXACTLY:

CRITICAL: DO NOT CHANGE:
- Road marking positions and types (solid/dashed white lines)
- Traffic sign positions, shapes, and symbols
- Traffic light positions and signal colors
- Arrow directions on asphalt (keep exact same directions)
- Pedestrian crossing positions
- Vehicle positions and types
- Overall scene layout and composition

ONLY IMPROVE VISUAL STYLE:
- Convert to clean 3D simulator aesthetic
- Enhance to look like professional driving school software
- Vibrant colors, smooth textures
- Modern 3D car models (keep same positions)
- Bright Spanish daylight, soft shadows
- Crystal clear 4K quality
- Remove noise, compression artifacts

Spanish DGT standards:
- WHITE road markings (not yellow)
- European traffic signs
- Mediterranean architecture
- Spanish license plates`;

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY не найден");
        process.exit(1);
    }

    // URL оригинального DGT изображения
    const INPUT_IMAGE_URL = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const OUTPUT_PATH = "data/imagen_restyle_result.png";

    console.log("🚀 Imagen 4.0 Image-to-Image (Restyle)...");
    console.log(`📥 Исходник: ${INPUT_IMAGE_URL}`);

    try {
        // 1. Скачиваем оригинал
        console.log("📥 Скачиваем оригинал...");
        const imageResponse = await axios.get(INPUT_IMAGE_URL, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

        // 2. Отправляем в Imagen для перерисовки
        const MODEL = "imagen-4.0-generate-001"; // Используем стандартную версию для лучшего качества
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${API_KEY}`;

        console.log(`📤 Отправляем в ${MODEL} для рестайлинга...`);

        const payload = {
            instances: [{
                prompt: PROMPT,
                // Добавляем референсное изображение
                image: {
                    bytesBase64Encoded: base64Image,
                    mimeType: mimeType
                }
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9",
                // Важно: высокая сила сохранения структуры
                guidanceScale: 15, // Высокое значение для строгого следования промпту
                safetyFilterLevel: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 90000 // 90 секунд для качественной генерации
        });

        console.log("✨ Ответ получен!");

        if (response.data.predictions && response.data.predictions.length > 0) {
            const prediction = response.data.predictions[0];

            if (prediction.bytesBase64Encoded) {
                const imageData = prediction.bytesBase64Encoded;
                const buffer = Buffer.from(imageData, 'base64');

                fs.writeFileSync(OUTPUT_PATH, buffer);
                console.log(`✅ Рестайлинг завершен: ${OUTPUT_PATH}`);
                console.log("\n📊 ПРОВЕРЬ:");
                console.log("   ✓ Стрелки смотрят в те же стороны?");
                console.log("   ✓ Светофоры на тех же местах?");
                console.log("   ✓ Знаки не изменились?");
                console.log("   ✓ Разметка белая и на тех же местах?");
            } else {
                console.log("⚠️ Нет изображения. Ответ:", JSON.stringify(prediction, null, 2));
            }
        } else {
            console.error("❌ Пустой ответ:", JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        if (error.response) {
            console.error(`❌ Ошибка API (${error.response.status}):`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("❌ Ошибка:", error.message);
        }
    }
}

main();
