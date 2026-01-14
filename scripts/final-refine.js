import Replicate from "replicate";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: '.env.local' });
dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL_OWNER = "lucataco";
const MODEL_NAME = "sdxl-controlnet"; // SDXL для качественного апскейла

// ПРОМПТ ДЛЯ УЛУЧШЕНИЯ, А НЕ СОЗДАНИЯ
const PROMPT = "High quality restoration, 4k resolution, sharp focus, clean image. Enhance lighting and shadows, remove noise, fix jpeg artifacts. Realistic textures, vibrant colors. Professional retouch.";

const NEGATIVE_PROMPT = "blur, noise, grain, jpeg artifacts, low quality, glitch, distorted, deformed, text, watermark, bad anatomy, bad geometry";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/final_refine_test.jpg";

    console.log("🚀 Запуск 'Refine' (Восстановление)...");

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputUrl,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,

                // 🔥 ГЛАВНЫЙ ФОКУС:
                // Сила изменений (strength). 0.45 означает "измени не более 45% пикселей".
                // Это сохранит геометрию, но уберет грязь.
                strength: 0.45,

                // Canny здесь нужен только чтобы контуры не поплыли при улучшении
                control_type: "canny",
                controlnet_conditioning_scale: 0.5,
                low_threshold: 100,
                high_threshold: 200,

                num_inference_steps: 30, // Меньше шагов для легкого ретуширования
                guidance_scale: 7.0,
                scheduler: "K_EULER_ANCESTRAL"
            }
        });

        console.log("⏳ Ожидание результата...");
        const result = await replicate.wait(prediction);

        if (result.status === "succeeded") {
            const url = Array.isArray(result.output) ? result.output[0] : result.output;
            if (url) {
                console.log(`🔗 Скачиваем: ${url}`);
                execSync(`curl -L -o ${outputPath} "${url}"`);
                console.log(`✅ Результат: ${outputPath}`);
            }
        } else {
            console.error("❌ Ошибка генерации:", result.error);
        }

    } catch (e) {
        console.error("❌ Ошибка:", e.message);
    }
}

main();
