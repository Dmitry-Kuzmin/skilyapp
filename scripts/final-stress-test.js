import Replicate from "replicate";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: '.env.local' });
dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL_OWNER = "lucataco";
const MODEL_NAME = "sdxl-controlnet";

// 🔥 ПРОМПТ ПОД ГЛУБИНУ: Упор на чистую геометрию
const PROMPT = "Isometric view, clean vector diagram of roads and intersections. Minimalist 3D style, smooth surfaces, solid grey asphalt, clear white vector road markings, perfectly flat green grass areas. Educational infographic style. No noise, perfect geometry, high contrast, sharp defined edges.";

// 🛡️ НЕГАТИВНЫЙ ПРОМПТ: Убираем любую текстуру
const NEGATIVE_PROMPT = "photorealistic, texture, asphalt grain, noise, dirt, rough surfaces, messy, blurry, distorted, painterly effect, artifacts, low quality";

async function main() {
    // Тот самый сложный перекресток
    const inputImage = "https://teorica.practicavial.com/question/d56d4df6-b9c8-4b82-a654-263e8ddc6052-1658136765-i.jpg";

    const outputPath = "data/depth_test_result.png";

    console.log(`🚀 Запуск DEPTH CHARGE TEST...`);

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        console.log("⏳ Генерация (Depth ControlNet)...");
        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputImage,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,

                // 🔥 ГЛАВНОЕ ИЗМЕНЕНИЕ: DEPTH ВМЕСТО CANNY
                control_type: "depth_midas",

                // Максимальный контроль структуры
                controlnet_conditioning_scale: 1.0,

                num_inference_steps: 50,
                guidance_scale: 8.0,
                scheduler: "K_EULER_ANCESTRAL"
            }
        });

        const result = await replicate.wait(prediction);

        if (result.status === "succeeded") {
            const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;
            if (resultUrl) {
                console.log(`🔗 Скачиваем результат...`);
                execSync(`curl -L -o ${outputPath} "${resultUrl}"`);
                console.log(`✅ РЕЗУЛЬТАТ (DEPTH): ${outputPath}`);
            }
        } else {
            console.error("❌ ОШИБКА ГЕНЕРАЦИИ:", result.error);
        }

    } catch (error) {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА:", error.message);
    }
}

main();
