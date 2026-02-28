import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// 🔥 ПРОМПТ ПО ДОКУМЕНТАЦИИ GOOGLE
// Gemini 3 Pro Image поддерживает сложные многоэтапные задачи модификации
const PROMPT = `STRICT IMAGE RECONSTRUCTION TASK for Spanish DGT driving exam.

INPUT: Low-quality scan of official traffic scenario.
GOAL: Transform into high-quality 3D educational visualization while preserving 100% legal accuracy.

CRITICAL PRESERVATION REQUIREMENTS:
1. Road Layout: Keep exact lane count, road width, intersection geometry
2. Road Markings: Preserve ALL white lines (solid/dashed), arrows, stop lines, pedestrian crossings
3. Traffic Elements: Keep exact positions of traffic lights, signs, vehicles
4. Arrow Directions: Maintain original direction of ALL road arrows

SPANISH DGT STANDARDS (apply during transformation):
- Road markings: WHITE only (never yellow/orange)
- Traffic signs: European standard (red border, white background)
- Traffic lights: Vertical, black housing, circular signals
- Vehicles: Modern European models (Seat, VW, Renault)
- Environment: Mediterranean architecture, Spanish urban style

VISUAL UPGRADE (improve quality without changing content):
- Style: Professional 3D driving simulator (like high-end training software)
- Lighting: Bright Spanish daylight, clear shadows
- Textures: Smooth asphalt, realistic car paint, clean surfaces
- Resolution: Crystal clear 4K quality
- Remove: Noise, compression artifacts, scan defects

OUTPUT: High-quality educational image maintaining exact legal accuracy of original.`;

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY не найден");
        process.exit(1);
    }

    const INPUT_IMAGE_URL = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const OUTPUT_PATH = "data/gemini3_pro_result.png";

    console.log("🚀 Gemini 3 Pro Image (по документации Google)...");

    try {
        console.log("📥 Скачиваем оригинал...");
        const imageResponse = await axios.get(INPUT_IMAGE_URL, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview-image-preview:generateContent?key=${API_KEY}`;

        console.log("📤 Отправляем запрос...");

        // Формат по документации Google
        const payload = {
            contents: [{
                parts: [
                    { text: PROMPT },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"], // Только изображение (без текста)
                imageConfig: {
                    aspectRatio: "16:9", // Для дорожных сцен
                    imageSize: "2K" // Высокое качество
                }
            }
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY
            },
            timeout: 120000 // 2 минуты (Gemini 3 Pro использует "режим мышления")
        });

        console.log("✨ Ответ получен!");

        // Сохраняем полный ответ для отладки
        fs.writeFileSync('data/gemini3_response.json', JSON.stringify(response.data, null, 2));
        console.log("💾 Полный ответ сохранен в data/gemini3_response.json");

        if (response.data.candidates && response.data.candidates.length > 0) {
            const parts = response.data.candidates[0].content.parts;

            let imageSaved = false;
            for (const part of parts) {
                if (part.inline_data) {
                    const imageData = part.inline_data.data;
                    fs.writeFileSync(OUTPUT_PATH, Buffer.from(imageData, 'base64'));
                    console.log(`✅ Результат сохранен: ${OUTPUT_PATH}`);
                    console.log("\n📊 ПРОВЕРЬ:");
                    console.log("   ✓ Разметка БЕЛАЯ (не желтая)?");
                    console.log("   ✓ Стрелки смотрят в те же стороны?");
                    console.log("   ✓ Светофоры на тех же местах?");
                    console.log("   ✓ Знаки не изменились?");
                    imageSaved = true;
                } else if (part.text) {
                    console.log("📝 Текст от модели:", part.text);
                }
            }

            if (!imageSaved) {
                console.log("⚠️ Изображение не получено. Полный ответ:");
                console.log(JSON.stringify(response.data, null, 2));
            }
        } else {
            console.error("❌ Пустой ответ:", JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        if (error.response) {
            console.error("Детали:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

main();
