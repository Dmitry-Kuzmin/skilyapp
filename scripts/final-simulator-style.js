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

// 🎯 ФИНАЛЬНЫЙ ПРОМПТ ПОД ТВОИ ПРИМЕРЫ
// Стиль: Educational 3D Simulator (как в профессиональных автошколах)
const PROMPT = "Professional 3D educational driving simulator visualization. Clean isometric top-down view. Vibrant saturated colors: bright green grass, smooth grey asphalt, sharp yellow and white road markings. Modern detailed 3D car models with realistic proportions. Soft ambient lighting, subtle shadows. Pristine new surfaces, perfect geometry. Training software aesthetic. Crystal clear, high detail, no noise.";

const NEGATIVE_PROMPT = "photorealistic, photo, realistic textures, dirt, wear, scratches, grunge, old, damaged, blurry, noisy, grainy, cinematic, lens flare, bokeh, depth of field, motion blur, dark, gloomy, sketch, drawing, cartoon, flat, 2d";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/final_simulator_style.png";

    console.log("🚀 Запуск SIMULATOR STYLE (финальная попытка)...");

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputUrl,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,

                // Используем SoftEdge (HED) - он лучше всех сохранял разметку
                control_type: "softedge_hed",

                // Баланс: достаточно строго, чтобы сохранить знаки, но свободно для стиля
                controlnet_conditioning_scale: 0.75,

                // Высокая сила изменений для полной перерисовки в 3D-стиле
                strength: 0.8,

                num_inference_steps: 50,
                // Умеренный guidance для избежания артефактов
                guidance_scale: 7.5,
                scheduler: "K_EULER_ANCESTRAL"
            }
        });

        console.log("⏳ Ожидание...");
        const result = await replicate.wait(prediction);

        if (result.status === "succeeded") {
            const url = Array.isArray(result.output) ? result.output[0] : result.output;
            if (url) {
                console.log(`🔗 Скачиваем...`);
                execSync(`curl -L -o ${outputPath} "${url}"`);
                console.log(`✅ Готово: ${outputPath}`);
            }
        } else {
            console.error("❌ Ошибка:", result.error);
        }

    } catch (e) {
        console.error("❌ Ошибка:", e.message);
    }
}

main();
