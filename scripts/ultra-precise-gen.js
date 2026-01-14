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

// 🎯 РАБОЧИЙ ПРОМПТ + Улучшение светофоров
const PROMPT = `Professional driving school training simulator. High-quality 3D educational visualization.

CRITICAL LEGAL REQUIREMENTS (MUST PRESERVE EXACTLY):
- Road markings: solid white lines stay solid white, dashed yellow lines stay dashed yellow, exactly as shown
- Traffic signs: preserve exact shape, color, and symbols (no modifications)
- Traffic lights: preserve exact position and all signal colors (red/yellow/green), including arrow sections if present. Render with clear distinct colored circles, sharp housing edges.
- Pedestrian crossings: white stripes must remain white stripes, same width and spacing
- Lane dividers: maintain exact line type (continuous or dashed)

STYLE IMPROVEMENTS (enhance without changing legal elements):
- Clean 3D simulator aesthetic like professional driving school software
- Smooth asphalt texture (grey, uniform)
- Vibrant green grass areas
- Modern realistic car models with proper proportions
- Soft natural lighting, subtle shadows
- Crystal clear, sharp focus
- Remove dust, noise, compression artifacts
- Enhance color saturation slightly for better visibility

Visual quality: 4K resolution, high detail, clean geometric forms.`;

// 🛡️ ЗАЩИТНЫЙ НЕГАТИВНЫЙ ПРОМПТ
const NEGATIVE_PROMPT = `changing road markings, altering traffic signs, moving traffic lights, incorrect signal colors, distorted lines, merged lanes, missing markings, wrong line types, blur, noise, grain, dirty, damaged, photorealistic textures, artistic interpretation, stylized, cartoon, sketch, painting, grunge, wear, scratches, cracks, cinematic effects, lens flare, bokeh, depth of field, moody lighting, dramatic shadows, dark, gloomy, low quality, compression artifacts`;

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/337753b5-c604-41f0-8402-fb83ad933c50-1734426446-i.jpg";
    const outputPath = "data/simple_test_result.png";

    console.log("🚀 Запуск ULTRA PRECISE MODE...");
    console.log("📋 Приоритет: Юридическая точность > Красота");

    try {
        const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
        const latestVersion = model.latest_version.id;

        const prediction = await replicate.predictions.create({
            version: latestVersion,
            input: {
                image: inputUrl,
                prompt: PROMPT,
                negative_prompt: NEGATIVE_PROMPT,

                // МАКСИМАЛЬНЫЙ контроль структуры
                control_type: "canny",
                controlnet_conditioning_scale: 0.95, // Почти 100% следование оригиналу

                // Жесткие пороги Canny - ловим ВСЕ линии разметки
                low_threshold: 50,
                high_threshold: 200,

                // МИНИМАЛЬНАЯ сила изменений - только чистка, без перерисовки
                strength: 0.35,

                num_inference_steps: 40, // Меньше шагов = меньше галлюцинаций
                guidance_scale: 6.0, // Умеренная строгость промпта
                scheduler: "K_EULER_ANCESTRAL"
            }
        });

        console.log("⏳ Генерация (консервативный режим)...");
        const result = await replicate.wait(prediction);

        if (result.status === "succeeded") {
            const url = Array.isArray(result.output) ? result.output[0] : result.output;
            if (url) {
                console.log(`🔗 Скачиваем...`);
                execSync(`curl -L -o ${outputPath} "${url}"`);
                console.log(`✅ Готово: ${outputPath}`);
                console.log("\n📊 ПРОВЕРЬ:");
                console.log("   ✓ Сплошная разметка осталась сплошной?");
                console.log("   ✓ Прерывистая осталась прерывистой?");
                console.log("   ✓ Знаки не изменились?");
                console.log("   ✓ Светофоры на месте?");
            }
        } else {
            console.error("❌ Ошибка:", result.error);
        }

    } catch (e) {
        console.error("❌ Ошибка:", e.message);
    }
}

main();
