/**
 * ========================================
 * AI РЕСТАЙЛИНГ ИЗОБРАЖЕНИЙ ЧЕРЕЗ REPLICATE
 * (FLUX-DEV: Image-to-Image)
 * ========================================
 * Берёт оригинальные DGT изображения и перерисовывает их
 * в едином премиум векторном стиле
 */

import Replicate from "replicate";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import axios from "axios";

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
    console.error('❌ Ошибка: REPLICATE_API_TOKEN не установлен в .env.local');
    process.exit(1);
}

const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

const OUTPUT_DIR = path.resolve('data/generated-images');
const MODEL_VERSION = "black-forest-labs/flux-dev";

// ========================================
// ПРОМПТ "ЗОЛОТОГО СТАНДАРТА"
// ========================================

const GOLDEN_STANDARD_PROMPT = `Professional technical illustration of Spanish DGT driving test scenario in clean vector flat design style.

STYLE (MANDATORY):
- Technical illustration, infographic style
- Flat colors, no gradients
- Sharp focus, no blur
- Educational diagram aesthetic
- Minimalist but detailed
- Maintain original camera angle (preserve perspective from source)
- Clean vector rendering

ROAD ELEMENTS:
- Crisp road markings (yellow center line, white lane dividers)
- Realistic asphalt texture in flat style
- Clear lane boundaries
- Proper Spanish DGT road signs with EXACT correct shapes and colors
- Preserve all road infrastructure from original

VEHICLES:
- Modern European cars in flat vector style
- Preserve EXACT colors from original (critical for test questions)
- Preserve EXACT positions on road
- Clear windshields and body panels
- Proper scale and proportions

ENVIRONMENT:
- Bright daylight scene
- Soft flat shadows
- Green grass verges
- Clear blue sky
- Trees in simple geometric shapes

QUALITY:
- No text, no watermarks
- No photorealistic details
- Clean educational diagram
- High contrast for clarity
- Sharp edges and lines

CRITICAL: Maintain the EXACT scene composition, vehicle positions, and road layout from the source image. Only convert visual style to premium flat vector illustration while preserving all traffic scenario details.`;

const NEGATIVE_PROMPT = "photorealistic, 3d render, glossy, shiny, blurry, low quality, distorted text, bad anatomy, grainy, cartoon, anime, watermark, signature";

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

async function ensureOutputDir() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (error) {
        console.error('❌ Не удалось создать папку:', error.message);
        throw error;
    }
}

async function downloadImage(url, outputPath) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    await pipeline(response.body, createWriteStream(outputPath));
}

/**
 * Конвертирует URL в base64 для Replicate
 */
async function urlToBase64(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error(`  ⚠️  Ошибка загрузки изображения: ${error.message}`);
        return null;
    }
}

/**
 * Генерирует новое изображение через Replicate Flux-Dev
 */
async function restyleImage(sourceImageUrl, questionNumber) {
    console.log(`  🎨 Replicate Flux-Dev перерисовывает изображение #${questionNumber}...`);

    try {
        // Конвертируем URL в base64
        const imageBase64 = await urlToBase64(sourceImageUrl);
        if (!imageBase64) {
            throw new Error('Не удалось загрузить исходное изображение');
        }

        console.log(`  📤 Отправляем запрос в Replicate...`);

        const output = await replicate.run(
            MODEL_VERSION,
            {
                input: {
                    prompt: GOLDEN_STANDARD_PROMPT,
                    image: imageBase64,
                    prompt_strength: 0.65, // КРИТИЧНО: 0.65 для точного сохранения road layout и позиций авто
                    num_inference_steps: 28, // 28 оптимально для Flux-Dev
                    guidance_scale: 3.5,
                    output_format: "png",
                    safety_tolerance: 5, // Разрешаем дорожные сцены (аварии, знаки)
                    disable_safety_checker: true // Полностью отключаем цензуру для дорожных сцен
                }
            }
        );

        // Получаем URL результата
        const resultUrl = Array.isArray(output) ? output[0] : output;

        if (!resultUrl) {
            throw new Error('Replicate не вернул изображение');
        }

        console.log(`  ✅ Генерация завершена!`);

        // Скачиваем результат
        const fileName = `dgt-${questionNumber}-flux-${Date.now()}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        await downloadImage(resultUrl, filePath);
        console.log(`  💾 Сохранено: ${fileName}`);

        return {
            fileName,
            filePath,
            resultUrl
        };

    } catch (error) {
        console.error(`  ❌ Ошибка генерации: ${error.message}`);
        return null;
    }
}

// ========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ========================================

async function processQuestions(jsonPath, options = {}) {
    const { onlyMissing = true, maxImages = null } = options;

    console.log('📖 Читаем JSON...');
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    const questions = Array.isArray(data) ? data : data.questions;

    if (!questions || questions.length === 0) {
        throw new Error('JSON не содержит вопросов');
    }

    console.log(`✅ Найдено ${questions.length} вопросов\n`);

    // Фильтруем вопросы для обработки
    const questionsToProcess = questions.filter(q => {
        // Пропускаем если уже есть сгенерированное
        if (onlyMissing && q.generated_image_path) return false;

        // Проверяем наличие исходного изображения
        if (!q.image_url || q.image_url === 'null' || q.image_url === 'undefined') {
            return false;
        }

        return true;
    });

    const limit = maxImages || questionsToProcess.length;
    console.log(`🎨 Будет обработано: ${Math.min(limit, questionsToProcess.length)} изображений`);
    if (maxImages) console.log(`⚠️  Лимит: ${maxImages}`);

    let generated = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < Math.min(questionsToProcess.length, limit); i++) {
        const q = questionsToProcess[i];
        const num = q.question_number || (i + 1);

        console.log(`\n🔄 Вопрос #${num}...`);

        // Пропускаем если нет image_url
        if (!q.image_url || q.image_url === 'null') {
            console.log(`  ⏭️  Нет исходного изображения, пропускаем`);
            skipped++;
            continue;
        }

        const result = await restyleImage(q.image_url, num);

        if (result) {
            q.generated_image_path = result.filePath;
            q.generated_image_name = result.fileName;
            q.generated_image_url = result.resultUrl;
            generated++;

            // Сохраняем после каждого вопроса
            await fs.writeFile(jsonPath, JSON.stringify(Array.isArray(data) ? data : { questions }, null, 2));

            // Задержка между генерациями (Replicate rate limit)
            if (i < Math.min(questionsToProcess.length, limit) - 1) {
                console.log(`  ⏳ Пауза 3 сек...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        } else {
            errors++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ ГЕНЕРАЦИИ');
    console.log('='.repeat(60));
    console.log(`✅ Сгенерировано: ${generated}`);
    console.log(`⏭️  Пропущено: ${skipped}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log('\n💰 Стоимость: ~$${(generated * 0.003).toFixed(3)} (Replicate Flux-Dev)');
    console.log('='.repeat(60) + '\n');
}

async function main() {
    const args = process.argv.slice(2);
    const jsonPath = args.find(arg => !arg.startsWith('-'));

    if (!jsonPath) {
        console.error('❌ Укажите путь к JSON файлу');
        console.error('Использование: node scripts/generate-images-replicate.js <file.json> [--all] [--limit=N]');
        process.exit(1);
    }

    const absolutePath = path.resolve(jsonPath);
    const onlyMissing = !args.includes('--all');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const maxImages = limitArg ? parseInt(limitArg.split('=')[1]) : null;

    console.log('='.repeat(60));
    console.log('🎨 AI РЕСТАЙЛИНГ ЧЕРЕЗ REPLICATE FLUX-DEV');
    console.log('='.repeat(60));
    console.log(`Файл: ${absolutePath}`);
    console.log(`Режим: ${onlyMissing ? 'Только без генерации' : 'Все'}`);
    if (maxImages) console.log(`Лимит: ${maxImages}`);
    console.log('='.repeat(60) + '\n');

    try {
        await ensureOutputDir();
        await processQuestions(absolutePath, { onlyMissing, maxImages });

        console.log('✨ Готово!');
        console.log('\n💡 Следующий шаг: Загрузите в Supabase Storage:');
        console.log('   node scripts/upload-images-golden.js ' + absolutePath);

    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

main();
