import Replicate from "replicate";
import dotenv from "dotenv";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import axios from "axios";

dotenv.config({ path: '.env.local' });
dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL_OWNER = "lucataco";
const MODEL_NAME = "sdxl-controlnet";

// 🔥 ПРОМПТ "PREMIUM SIMULATOR STYLE" (ID 3-5)
// Максимальная чистота, матовые поверхности, никакого фото-шума.
const PROMPT = "Professional 3D driving simulator render, high-end educational traffic diagram. A green van on a mountain road with cows. Minimalist architectural model aesthetic, clean matte surfaces, consistent studio lighting. Seamless smooth asphalt, perfect sharp road markings. Solid green grass planes, simple blue sky. Everything is perfectly sharp and clean. Unreal Engine 5 style, octane render. No noise, no artifacts, no dirt.";

// 🛡️ ЖЕСТКИЙ NEGATIVE PROMPT ДЛЯ УБОЩЕНИЯ МУСОРА
const NEGATIVE_PROMPT = "photorealistic, real photo, grainy, blurry, noise, artifacts, distorted road, cracked asphalt, trees, depth of field, realistic textures, shadow play, messy, dirty, handwriting, low-poly, 2d, vector";

async function downloadImage(url, outputPath) {
    console.log(`🔗 Скачиваем: ${url}`);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    await pipeline(response.data, createWriteStream(outputPath));
    console.log(`💾 Файл сохранен: ${outputPath}`);
}

async function main() {
    const inputImage = "https://teorica.practicavial.com/question/d56d4df6-b9c8-4b82-a654-263e8ddc6052-1658136765-i.jpg";
    const outputPath = "data/sdxl_premium_simulator.jpg";

    console.log(`🚀 Запуск SDXL Tank (CLEAN SIMULATOR MODE)...`);

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;
        console.log(`✅ Версия: ${latestVersion.substring(0, 10)}...`);

        let prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputImage,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,
                control_type: "canny",
                controlnet_conditioning_scale: 0.85,
                num_inference_steps: 50,
                guidance_scale: 9.0, // Увеличиваем, чтобы ИИ строже следовал промпту "чистоты"
                scheduler: "K_EULER_ANCESTRAL",

                // ⚙️ ПОРОГИ CANNY: Увеличиваем нижний порог, чтобы игнорировать мелкий шум на асфальте
                low_threshold: 150,
                high_threshold: 250
            }
        });

        console.log("⏳ Генерация 'стерильной' сцены...");
        prediction = await replicate.wait(prediction);

        if (prediction.status === "succeeded") {
            const resultUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            if (resultUrl) {
                await downloadImage(resultUrl, outputPath);
            }
        } else {
            console.error("❌ Ошибка:", prediction.error);
        }

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
    }
}

main();
