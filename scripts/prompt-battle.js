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
// Сложная сцена (зеленая дорога с горным фоном, которая стала "пластилиновой")
const INPUT_IMAGE = "https://teorica.practicavial.com/question/d56d4df6-b9c8-4b82-a654-263e8ddc6052-1658136765-i.jpg";

const PROMPTS = {
    A: {
        name: "CGI_Realism",
        prompt: "Hyper-realistic 3D render of a driving scenario, Unreal Engine 5 level graphics, ray tracing, global illumination. Cinematic shot from a high-end racing simulator. Highly detailed asphalt texture with slight wear, realistic car paint reflections, volumetric lighting, photorealistic trees and mountains in background. 8k resolution, sharp focus, masterpiece.",
        negative: "cartoon, vector, illustration, drawing, painting, sketch, flat, low poly, blurry, pixelated, grain, noise, artifacts, distorted, naked, text, watermark"
    },
    B: {
        name: "Studio_Clean",
        prompt: "Premium 3D architectural visualization of a road scene. Isometric studio setup, softbox lighting, soft ambient occlusion. Clean matte materials, perfect pristine asphalt, modern minimalist 3D cars. Octane render style, high fidelity, sharp edges, elegant color palette. Advertising quality.",
        negative: "dirt, grunge, noise, grain, messy, glitch, distorted, photo, grainy, ugly, sketchy, vector, flat, low quality, jpeg artifacts"
    },
    C: {
        name: "Sim_Standard",
        prompt: "Professional driving simulator screen capture. High fidelity digital twin. Sharp clean road markings, realistic sunny daylight. Clear geometry, solid distinct colors. Educational simulation style, zero artifacts. Crystal clear image.",
        negative: "blur, depth of field, bokeh, artistic, painterly, abstract, surreal, distorted, messy, dirty, grunge, grain, noise, vector, illustration"
    }
};

async function generate(variant, settings) {
    console.log(`\n🥊 Генерируем вариант ${variant}: ${settings.name}...`);
    const outputPath = `data/battle_${variant}_${settings.name}.png`;

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: INPUT_IMAGE,
                prompt: settings.prompt,
                negative_prompt: settings.negative,
                control_type: "canny",
                // Возвращаем Canny, но с балансом
                controlnet_conditioning_scale: 0.85,
                num_inference_steps: 50,
                guidance_scale: 9.0, // Высокая строгость промпта
                scheduler: "K_EULER_ANCESTRAL",
                low_threshold: 100,
                high_threshold: 200
            }
        });

        const result = await replicate.wait(prediction);

        if (result.status === "succeeded") {
            const url = Array.isArray(result.output) ? result.output[0] : result.output;
            if (url) {
                execSync(`curl -L -o ${outputPath} "${url}"`);
                console.log(`✅ Сохранено: ${outputPath}`);
            }
        } else {
            console.error(`❌ Ошибка ${variant}:`, result.error);
        }
    } catch (e) {
        console.error(`❌ Критическая ошибка ${variant}:`, e.message);
    }
}

async function main() {
    console.log("🏁 ЗАПУСК БИТВЫ ПРОМПТОВ 🏁");
    await generate("A", PROMPTS.A);
    await generate("B", PROMPTS.B);
    await generate("C", PROMPTS.C);
    console.log("\n✨ Битва завершена! Проверяй папку data/");
}

main();
