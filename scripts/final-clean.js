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

// 💡 STUDIO PROMPT: Убираем "Unreal Engine" и "Cinematic", добавляем "Studio".
// Это уберет красные блики и "лазеры".
const PROMPT = "Professional high-end studio photography of a traffic scene. Neutral soft lighting, ultra-clean asphalt, immaculate car paint reflections. 4k resolution, sharp focus. Realistic, solid, expensive look. No filters, no effects.";

const NEGATIVE_PROMPT = "flare, lens flare, bloom, neon, glowing, red lines, laser, sci-fi, cinematic, dramatic, dark, moody, sketch, drawing, vector, cartoon, ghosting, transparency, floating objects";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/final_clean_premium.jpg";

    console.log("🚀 Запуск FINAL CLEAN PREMIUM...");

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputUrl,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,

                // Оставляем HED - он дает лучший объем
                control_type: "softedge_hed",

                // Чуть снижаем силу, чтобы он не пытался "овеществить" каждую линию схемы
                controlnet_conditioning_scale: 0.7,

                // strength 0.75 - идеально для полной перерисовки текстур
                strength: 0.75,

                num_inference_steps: 50,
                // Снижаем guidance, чтобы убрать пережарку цветов
                guidance_scale: 7.0,
                scheduler: "K_EULER_ANCESTRAL"
            }
        });

        console.log("⏳ Ожидание...");
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
