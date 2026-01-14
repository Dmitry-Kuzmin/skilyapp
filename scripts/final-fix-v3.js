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

// 🏎️ SOLID PROMPT V3
// Добавили: Opaque material, Solid Metal, Thick Paint.
const PROMPT = "Photorealistic high-angle shot of a driving scenario. Solid opaque metal cars, thick glossy car paint, non-transparent materials. Bright sunny noon lighting, hard shadows. Crystal clear asphalt texture. Modern European vehicles. High fidelity commercial automotive photography.";

// 🛡️ ANTI-GHOST NEGATIVE
// Запрещаем прозрачность и "схемы".
const NEGATIVE_PROMPT = "transparency, transparent, glass, wireframe, blueprint, sketch, holographic, x-ray, see-through, ghosting, interior view, tilt-shift, miniature, toy, bokeh, blur, low contrast, vector, drawing";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/final_solid.jpg";

    console.log("🚀 Запуск SOLID MODE (V3) генерации...");

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputUrl,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,
                control_type: "canny",

                // 📉 ВАЖНО: Снижаем влияние линий, чтобы дать "залить" их краской
                controlnet_conditioning_scale: 0.55,

                // 📈 ВАЖНО: Поднимаем порог, чтобы не рисовать внутренности автобуса
                low_threshold: 100,
                high_threshold: 250,

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
