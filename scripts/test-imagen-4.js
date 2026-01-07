import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// УЛЬТРА-ДЕТАЛЬНЫЙ ПРОМПТ ДЛЯ ИСПАНСКИХ DGT СТАНДАРТОВ
const PROMPT = `Professional 3D driving school simulator for Spanish DGT (Dirección General de Tráfico) official exam preparation.

CRITICAL SPANISH ROAD MARKING STANDARDS (MUST FOLLOW EXACTLY):
- Lane separation: WHITE dashed lines (NOT yellow, NOT orange)
- Lane edges: WHITE solid lines
- Center line (opposing traffic): WHITE solid line
- No-parking zones: YELLOW solid line on curb ONLY
- Stop lines: THICK WHITE solid line before intersection
- Pedestrian crossings: THICK WHITE stripes (zebra pattern), perpendicular to road
- Direction arrows: WHITE arrows painted on grey asphalt
- Curbs: WHITE or BLUE painted (never yellow)

SPANISH TRAFFIC SIGNS (European Standard):
- Warning signs: RED border, WHITE background, triangular shape
- Regulatory signs: RED border, WHITE background, circular shape
- Speed limit signs: RED circle border, WHITE background, BLACK numbers
- Priority signs: RED border, WHITE background, triangular or octagonal
- All text on signs in SPANISH language

SPANISH TRAFFIC LIGHTS:
- Vertical orientation (red on top, yellow middle, green bottom)
- BLACK rectangular housing
- CIRCULAR signal lamps (not square)
- Mounted on grey metal poles
- Clear bright colors: pure red, amber yellow, bright green

VEHICLES (European models):
- Seat, Renault, Volkswagen, Peugeot, Citroën
- Modern European design (2020s style)
- Realistic proportions and details
- Spanish license plates (white background, blue EU strip on left)

ENVIRONMENT (Spanish urban):
- Mediterranean architecture (beige/cream buildings, terracotta roofs)
- Palm trees or plane trees (platanus)
- Clean modern infrastructure
- Bright sunny Spanish daylight, hard shadows
- Grey smooth asphalt (not black, not textured)

SCENE COMPOSITION:
Top-down isometric view, 45-degree angle. City intersection with:
- One white car stopped at red traffic light
- Traffic light showing RED signal clearly
- WHITE dashed lane markings (3 lanes visible)
- Green bus on right side
- White van on left side  
- WHITE pedestrian crossings (zebra stripes)
- WHITE stop line before traffic light
- WHITE direction arrows on asphalt

VISUAL QUALITY:
Clean 3D educational simulator aesthetic, vibrant saturated colors, crystal clear 4K resolution, soft ambient lighting, professional driving school software quality.

STRICTLY PROHIBITED (do not include):
- Yellow lane markings (American style)
- Yellow curbs
- Orange road markings
- Asian or American traffic signs
- Square traffic light signals
- Dark or night scenes
- Photorealistic dirt or wear
- Artistic interpretation`;

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY не найден в .env.local");
        process.exit(1);
    }

    console.log("🚀 Тест Imagen 4.0 (text-to-image)...");

    try {
        // Пробуем Imagen 4.0 Fast (самый быстрый вариант)
        const MODEL = "imagen-4.0-fast-generate-001";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${API_KEY}`;

        console.log(`📤 Отправляем промпт в ${MODEL}...`);

        const payload = {
            instances: [{
                prompt: PROMPT
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9", // Для дорожных сцен
                safetyFilterLevel: "block_only_high", // Минимальная цензура
                personGeneration: "allow_adult" // Разрешаем людей (пешеходов)
            }
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000 // 60 секунд таймаут
        });

        console.log("✨ Ответ получен!");

        // Imagen возвращает base64 в predictions[0].bytesBase64Encoded
        if (response.data.predictions && response.data.predictions.length > 0) {
            const prediction = response.data.predictions[0];

            if (prediction.bytesBase64Encoded) {
                const imageData = prediction.bytesBase64Encoded;
                const buffer = Buffer.from(imageData, 'base64');
                const outputPath = "data/imagen_test_result.png";

                fs.writeFileSync(outputPath, buffer);
                console.log(`✅ Изображение сохранено: ${outputPath}`);
            } else {
                console.log("⚠️ Нет изображения в ответе. Структура:", JSON.stringify(prediction, null, 2));
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
