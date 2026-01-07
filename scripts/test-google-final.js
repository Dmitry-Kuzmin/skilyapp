import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// 🔥 НОВЫЙ ПОДХОД: "FORENSIC RECONSTRUCTION" (Судебная реконструкция)
// Мы требуем сохранить геометрию как улику, меняя только качество.
const PROMPT = `
STRICT VISUAL RECONSTRUCTION TASK.
Input Image is a legally binding traffic diagram. 
GOAL: Upgrade visual fidelity to "Photorealistic 8K Photography" while maintaining 100% GEOMETRIC ACCURACY.

1. [GEOMETRY & LAYOUT - DO NOT CHANGE]
- PRESERVE exact position of ALL cars.
- PRESERVE exact shape of road markings (arrows, lines).
- PRESERVE the exact lane count.
- The input image layout is TRUTH. Do not "fix" or "improve" the composition.

2. [ROAD MARKINGS - SPANISH DGT STANDARD]
- ALL lane markings must remain WHITE (Clean White).
- DO NOT generate Yellow lines (Strictly prohibited).
- Road arrows must stay White and point in the ORIGINAL direction.

3. [VISUAL STYLE - PHOTOREALISM]
- Style: High-end automotive commercial photography.
- Lighting: Bright Spanish noon sun, hard distinct shadows.
- Camera: Telephoto lens (low distortion), high angle isometric view.
- Texture: Realistic asphalt grain (not plastic), metallic car paint, realistic glass reflections.
- NO "Video Game" look. NO "Cartoon" look. NO "Sims" style.

4. [CONTEXT]
- This is a real street in Madrid. 
- Use realistic European asphalt textures.
- Cars should look like modern European models (Seat, VW, Renault).
`;

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY не найден");
        process.exit(1);
    }

    // Тот самый сложный перекресток
    const INPUT_IMAGE_URL = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const OUTPUT_PATH = "data/google_final_attempt.png";

    console.log("🚀 Google Imagen: Final 'Architectural' Test...");

    try {
        console.log("📥 Скачиваем оригинал...");
        const imageResponse = await axios.get(INPUT_IMAGE_URL, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

        // Используем Gemini 3 Pro Image (поддерживает image-to-image)
        const MODEL = "gemini-3-pro-image-preview";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

        console.log(`📤 Отправляем запрос в ${MODEL} (Strict Mode)...`);

        const payload = {
            contents: [{
                parts: [
                    { text: PROMPT },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                response_modalities: ["IMAGE"],
                temperature: 0.4, // Низкая температура для точности
            }
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 90000
        });

        console.log("📋 Полный ответ:", JSON.stringify(response.data, null, 2));

        if (response.data.candidates && response.data.candidates.length > 0) {
            const parts = response.data.candidates[0].content.parts;

            for (const part of parts) {
                if (part.inline_data) {
                    const imageData = part.inline_data.data;
                    fs.writeFileSync(OUTPUT_PATH, Buffer.from(imageData, 'base64'));
                    console.log(`✅ Результат сохранен: ${OUTPUT_PATH}`);
                    console.log("👉 Проверь: Стрелки на асфальте такие же, как в оригинале?");
                } else if (part.text) {
                    console.log("📝 Текст от модели:", part.text);
                }
            }
        } else {
            console.error("❌ Пустой ответ от Google:", JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        if (error.response) console.error("Детали:", JSON.stringify(error.response.data, null, 2));
    }
}

main();
