import Replicate from "replicate";
import dotenv from "dotenv";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL_VERSION = "black-forest-labs/flux-dev";
const PROMPT = "Vector flat design illustration of a traffic situation for driving school exam. Minimalist educational style, clean lines, bright solid colors, isometric top-down view. Clear road markings, distinct vehicles. No text, no watermarks. High quality.";

async function downloadImage(url, outputPath) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    await pipeline(response.body, createWriteStream(outputPath));
    console.log(`💾 Картинка сохранена: ${outputPath}`);
}

async function main() {
    const inputImage = "https://teorica.practicavial.com/question/d56d4df6-b9c8-4b82-a654-263e8ddc6052-1658136765-i.jpg";

    console.log("🚀 Начинаем AI-перерисовку...");
    console.log(`📥 Вход: ${inputImage}`);

    try {
        const output = await replicate.run(
            MODEL_VERSION,
            {
                input: {
                    prompt: PROMPT,
                    image: inputImage,
                    prompt_strength: 0.85,
                    num_inference_steps: 28,
                    guidance_scale: 3.5,
                    output_format: "png",
                    safety_tolerance: 5
                }
            }
        );

        console.log("✨ Генерация завершена!");
        console.log("👉 URL результата:", output);

        if (Array.isArray(output) || typeof output === 'string') {
            const url = Array.isArray(output) ? output[0] : output;
            await downloadImage(url, "data/test-output-flux.png");
        }

    } catch (error) {
        console.error("❌ Ошибка:", error);
    }
}

main();
