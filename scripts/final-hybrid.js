import Replicate from "replicate";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: '.env.local' });
dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL_OWNER = "lucataco";
const MODEL_NAME = "sdxl-controlnet"; // HED + SDXL

// ⚡️ HYBRID PROMPT: Форма как в кино, но Свет как в игре.
// High shutter speed = Заморозка движения (нет размытия).
// Deep depth of field = Все в фокусе.
const PROMPT = "High-speed photography of city traffic. Crystal clear, razor sharp focus. Bright sunny day, hard lighting. Frozen motion (no blur). Modern metallic cars. 8k resolution, highly detailed texture. Commercial automotive photography.";

const NEGATIVE_PROMPT = "video game, motion blur, long exposure, blurred, smear, ghosting, haze, fog, mist, soft focus, tilt-shift, miniature, toy, sketch, vector, drawing, bad geometry, distorted";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/final_hybrid_sharp.jpg";

    console.log("🚀 Запуск HYBRID SHARP генерации...");

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputUrl,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,

                // Используем HED (так как он делает самые лучшие машины)
                control_type: "softedge_hed",

                // Даем среднюю свободу
                controlnet_conditioning_scale: 0.75,

                // Но высокую силу изменений, чтобы убрать шум оригинала
                strength: 0.8,

                num_inference_steps: 50,
                // Возвращаем контраст
                guidance_scale: 8.0,
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
