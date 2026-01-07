import Replicate from "replicate";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: '.env.local' });
dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Real-ESRGAN: Это НЕ стилизация, это ТОЛЬКО увеличение разрешения
// Модель НЕ МЕНЯЕТ содержание, только делает пиксели четче
const MODEL_OWNER = "nightmareai";
const MODEL_NAME = "real-esrgan";

async function main() {
    const inputUrl = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const outputPath = "data/esrgan_upscale_test.png";

    console.log("🚀 Запуск Real-ESRGAN (Pure Upscale)...");

    try {
        console.log("📤 Отправляем изображение на апскейл (x4)...");

        const output = await replicate.run(
            `${MODEL_OWNER}/${MODEL_NAME}`,
            {
                input: {
                    image: inputUrl,
                    // Увеличиваем в 4 раза. Модификаций содержания НЕТ.
                    scale: 4,
                    // Подавление шума на "классическом" уровне
                    face_enhance: false // Выключаем "улучшение лиц", нам это не нужно
                }
            }
        );

        const resultUrl = Array.isArray(output) ? output[0] : output;
        if (resultUrl) {
            console.log(`🔗 Скачиваем результат...`);
            execSync(`curl -L -o ${outputPath} "${resultUrl}"`);
            console.log(`✅ Сохранено: ${outputPath}`);
            console.log("\n📋 ВАЖНО:");
            console.log("   - Разметка НЕ изменена (сплошная/прерывистая)");
            console.log("   - Знаки НЕ изменены");
            console.log("   - Светофоры НЕ изменены");
            console.log("   - Только разрешение увеличено в 4 раза");
        }

    } catch (e) {
        console.error("❌ Ошибка:", e.message);
    }
}

main();
