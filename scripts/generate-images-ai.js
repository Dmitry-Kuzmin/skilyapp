/**
 * ========================================
 * ГЕНЕРАТОР ИЗОБРАЖЕНИЙ ЧЕРЕЗ DALL-E 3
 * ========================================
 * Создаёт схематичные иллюстрации для вопросов ПДД
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('❌ Ошибка: Не задан OPENAI_API_KEY в .env.local');
    console.error('💡 Получить ключ: https://platform.openai.com/api-keys');
    process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const OUTPUT_DIR = path.resolve('data/generated-images');

// ========================================
// НАСТРОЙКИ
// ========================================

const CONFIG = {
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard', // 'standard' или 'hd'
    style: 'natural', // 'natural' или 'vivid'
    promptPrefix: `Create a clean, educational diagram for a Spanish driving test question. 
Style: Simple, clear, schematic illustration with labeled road elements. 
No text in the image. Professional traffic education visual.`
};

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

async function ensureOutputDir() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (error) {
        console.error('❌ Не удалось создать папку для изображений:', error.message);
        throw error;
    }
}

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

function generateImagePrompt(question) {
    // Создаём описательный промпт на основе вопроса
    const questionText = question.question?.es || question.question_es || '';

    // Упрощённая версия - можно улучшить с помощью AI
    const prompt = `${CONFIG.promptPrefix}

Question context: ${questionText}

Create a diagram showing this traffic situation clearly and professionally.`;

    return prompt;
}

async function generateImage(question, questionNumber) {
    const prompt = generateImagePrompt(question);

    console.log(`  🎨 Генерация изображения для вопроса #${questionNumber}...`);
    console.log(`     Промпт: ${prompt.substring(0, 100)}...`);

    try {
        const response = await openai.images.generate({
            model: CONFIG.model,
            prompt: prompt,
            n: 1,
            size: CONFIG.size,
            quality: CONFIG.quality,
            style: CONFIG.style,
            response_format: 'url'
        });

        const imageUrl = response.data[0].url;

        // Скачиваем сгенерированное изображение
        console.log(`  📥 Скачивание изображения...`);
        const imageBuffer = await downloadImage(imageUrl);

        // Сохраняем локально
        const fileName = `generated-${questionNumber}-${crypto.randomBytes(4).toString('hex')}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        await fs.writeFile(filePath, imageBuffer);

        console.log(`  ✅ Сохранено: ${fileName}`);

        return {
            fileName,
            filePath,
            originalUrl: imageUrl
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
    const {
        onlyMissing = true, // Генерировать только для вопросов без изображения
        replaceExisting = false, // Заменить существующие изображения
        maxImages = null // Лимит генераций (для теста)
    } = options;

    console.log('📖 Читаем JSON...');
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    const questions = Array.isArray(data) ? data : data.questions;

    if (!questions || questions.length === 0) {
        throw new Error('JSON не содержит вопросов');
    }

    console.log(`✅ Найдено ${questions.length} вопросов\n`);

    // Фильтруем вопросы для генерации
    const questionsToGenerate = questions.filter(q => {
        if (!onlyMissing) return true;
        return !q.image_url || replaceExisting;
    });

    console.log(`🎨 Будет сгенерировано изображений: ${Math.min(questionsToGenerate.length, maxImages || questionsToGenerate.length)}`);

    if (maxImages) {
        console.log(`⚠️  Установлен лимит: ${maxImages} изображений`);
    }

    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < questionsToGenerate.length; i++) {
        if (maxImages && generatedCount >= maxImages) {
            console.log(`\n⏹️  Достигнут лимит генераций: ${maxImages}`);
            break;
        }

        const q = questionsToGenerate[i];
        const num = q.question_number || (i + 1);

        console.log(`\n🔄 Вопрос #${num}...`);

        const result = await generateImage(q, num);

        if (result) {
            // Обновляем путь к изображению в JSON
            q.image_url = result.originalUrl; // Временный URL
            q.generated_image_path = result.filePath; // Локальный путь
            q.generated_image_name = result.fileName;

            generatedCount++;

            // Сохраняем прогресс после каждой генерации
            await fs.writeFile(jsonPath, JSON.stringify(Array.isArray(data) ? data : { questions }, null, 2));

            // Задержка между запросами (чтобы не превысить rate limit)
            await new Promise(r => setTimeout(r, 3000));
        } else {
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ ГЕНЕРАЦИИ');
    console.log('='.repeat(60));
    console.log(`✅ Сгенерировано изображений: ${generatedCount}`);
    console.log(`⏭️  Пропущено: ${skippedCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);

    if (generatedCount > 0) {
        console.log(`\n💰 Примерная стоимость: ~$${(generatedCount * 0.04).toFixed(2)}`);
        console.log(`   (DALL-E 3 standard: $0.04 за изображение)`);
    }

    console.log('='.repeat(60) + '\n');

    return { generatedCount, skippedCount, errorCount };
}

async function main() {
    const args = process.argv.slice(2);
    const jsonPath = args.find(arg => !arg.startsWith('-'));

    if (!jsonPath) {
        console.error('❌ Укажите путь к JSON файлу');
        console.error('Использование: node scripts/generate-images-ai.js <file.json> [--all] [--limit=N]');
        console.error('\nОпции:');
        console.error('  --all         Генерировать для всех вопросов (даже если есть изображение)');
        console.error('  --limit=N     Лимит генераций (для теста)');
        process.exit(1);
    }

    const absolutePath = path.resolve(jsonPath);
    const onlyMissing = !args.includes('--all');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const maxImages = limitArg ? parseInt(limitArg.split('=')[1]) : null;

    console.log('='.repeat(60));
    console.log('🎨 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ ЧЕРЕЗ DALL-E 3');
    console.log('='.repeat(60));
    console.log(`Файл: ${absolutePath}`);
    console.log(`Режим: ${onlyMissing ? 'Только вопросы без изображений' : 'Все вопросы'}`);
    if (maxImages) console.log(`Лимит: ${maxImages} изображений`);
    console.log('='.repeat(60) + '\n');

    console.log('⚠️  ВАЖНО:');
    console.log('   - DALL-E 3 standard: $0.04 за изображение');
    console.log('   - Генерация занимает ~10-15 сек на изображение');
    console.log('   - Изображения сохраняются в data/generated-images/\n');

    try {
        await ensureOutputDir();
        await processQuestions(absolutePath, { onlyMissing, maxImages });

        console.log('✨ Готово! Изображения сгенерированы.');
        console.log('\n💡 Следующий шаг: Загрузите их в Supabase Storage:');
        console.log('   node scripts/upload-images-golden.js ' + absolutePath);

    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

main();
