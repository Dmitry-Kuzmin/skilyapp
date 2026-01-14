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

// 🎥 SONY / BMW CINEMATIC STYLE
// Этот промпт создает "рекламный" вид.
const PROMPT = "Cinematic shot of a modern city intersection. High-end automotive commercial aesthetic. Gleaming car paint with realistic reflections, pristine asphalt road, soft morning sunlight, volumetric atmosphere. Incredible detail, 8k resolution, Unreal Engine 5 render. Masterpiece.";

const NEGATIVE_PROMPT = "sketch, cartoon, drawing, vector, illustration, painting, low quality, noise, grain, blurry, ugly, deformed, dirty, grunge, ruined, old, retro, bad geometry";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/final_hed_style.jpg";

    console.log("🚀 Запуск HEDRA STYLE (Premium Remaster)...");

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputUrl,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,

                // 🔥 СЕКРЕТНЫЙ ИНГРЕДИЕНТ: SoftEdge / HED 🔥
                // Вместо жесткого Canny используем "мягкий край".
                // Он понимает ФОРМУ, но игнорирует ТЕКСТУРУ (шум).
                control_type: "softedge_hed",

                // Даем нейросети свободу рисовать крутые текстуры внутри формы
                controlnet_conditioning_scale: 0.8,

                // Разрешаем заменить 75% пикселей на "премиальные"
                strength: 0.75,

                num_inference_steps: 50,
                guidance_scale: 7.5,
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
