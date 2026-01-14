import Replicate from "replicate";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const OUTPUT_DIR = path.resolve('data/generated-images');

// 🏆 ЦЕЛЬ: lucataco/sdxl-controlnet (Железобетонный Танк)
const MODEL_OWNER = "lucataco";
const MODEL_NAME = "sdxl-controlnet";

// ========================================
// ИСПРАВЛЕННЫЙ "STERILE SIMULATOR" ПРОМПТ
// ========================================
// Мы убрали "Architectural", "Octane", "UE5" - они вызывали галлюцинации города будущего.
const STYLE_PROMPT = "Clean 3D isometric render of a traffic situation. Professional digital twin for driving school instruction. Simple modern cars, clear asphalt, white road markings. Soft natural daylight, minimalist solid background. Elegant simplified 3D models. No futuristic elements, no neon, no complex buildings. Sharp focus, high clarity.";

const NEGATIVE_PROMPT = "futuristic, cyberpunk, sci-fi, neon, glowing lines, complex architecture, skyscrapers, motion blur, bokeh, grainy, dirty, distorted, mess, chaotic, text, watermark, photo, photorealistic shadows";

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

async function downloadImage(url, outputPath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000
    });
    await pipeline(response.data, createWriteStream(outputPath));
}

/**
 * Генерирует через SDXL ControlNet с улучшенной обработкой ошибок
 */
async function restyleWithControlNet(sourceImageUrl, questionNumber, latestVersion, retryCount = 2) {
    console.log(`  🎨 Генерируем (Попытка ${3 - retryCount}) для вопроса #${questionNumber}...`);

    try {
        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: sourceImageUrl,
                prompt: STYLE_PROMPT,
                negative_prompt: NEGATIVE_PROMPT,
                control_type: "canny",
                controlnet_conditioning_scale: 0.8, // Чуть снизили для гибкости
                num_inference_steps: 40, // 40 достаточно для чистоты
                guidance_scale: 8.0,
                scheduler: "K_EULER_ANCESTRAL",
                // ⚙️ СНИЗИЛИ ПОРОГИ: Чтобы ИИ видел реальные машины, а не галлюцинировал
                low_threshold: 100,
                high_threshold: 180
            }
        });

        const result = await replicate.wait(prediction);

        if (result.status !== "succeeded") {
            throw new Error(`Статус: ${result.status}. Ошибка: ${result.error || 'Unknown'}`);
        }

        const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;

        if (!resultUrl) throw new Error('Нет URL в ответе');

        const fileName = `dgt-${questionNumber}-sterile-${Date.now()}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        await downloadImage(resultUrl, filePath);
        console.log(`  ✅ Успех: ${fileName}`);

        return { fileName, filePath };

    } catch (error) {
        if (retryCount > 0) {
            console.log(`  ⚠️ Ошибка: ${error.message}. Пробуем еще раз...`);
            return restyleWithControlNet(sourceImageUrl, questionNumber, latestVersion, retryCount - 1);
        }
        console.error(`  ❌ Провал после всех попыток для #${questionNumber}: ${error.message}`);
        return null;
    }
}

async function processBatch(jsonPath, maxImages = null) {
    console.log(`\n🚀 ЗАПУСК СТЕРИЛЬНОЙ ГЕНЕРАЦИИ: ${jsonPath}`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const questions = Array.isArray(data) ? data : (data.questions || []);

    const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
    const latestVersion = model.latest_version.id;
    console.log(`✅ Версия: ${latestVersion.substring(0, 10)}...\n`);

    const limit = maxImages || questions.length;
    let generated = 0;

    for (let i = 0; i < Math.min(questions.length, limit); i++) {
        const q = questions[i];

        // ВАЖНО: Перегенерируем те, что были "кошмарами" (если они в test-batch)
        // Но пропускаем, если уже есть новая premium/sterile картинка
        if (q.generated_image_path && q.generated_image_path.includes('sterile')) {
            continue;
        }

        if (!q.image_url || q.image_url === 'null' || q.image_url === '') continue;

        const res = await restyleWithControlNet(q.image_url, q.question_number || i + 1, latestVersion);

        if (res) {
            q.generated_image_path = res.filePath;
            q.generated_image_name = res.fileName;
            generated++;
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        }

        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n🎉 ГОТОВО! Новых картинок: ${generated}`);
}

const args = process.argv.slice(2);
const file = args[0];
const limit = args.find(a => a.startsWith('--limit='))?.split('=')[1];

if (file) {
    processBatch(path.resolve(file), limit ? parseInt(limit) : null);
}
export { processBatch };
