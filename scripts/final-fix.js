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
const PROMPT = "Photorealistic high-angle shot of a driving scenario on asphalt road. Bright sunny noon lighting, hard shadows, sharp focus everywhere (f/16 aperture). Crystal clear textures of asphalt and white road markings. Modern European cars with realistic reflections. Clean, professional, high fidelity.";
const NEGATIVE_PROMPT = "tilt-shift, miniature, toy, diorama, bokeh, blur, depth of field, out of focus, hazy, cloudy, grey, low contrast, video game, cartoon, vector, illustration, drawing, sketch, noise, grain, distorted";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/final_gold_standard.jpg";

    console.log("🚀 Запуск GOLD STANDARD генерации (v2 - Force Download)...");

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
                controlnet_conditioning_scale: 0.85,
                low_threshold: 50,
                high_threshold: 200,
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
