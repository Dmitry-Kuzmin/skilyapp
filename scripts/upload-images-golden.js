/**
 * ========================================
 * ЗАГРУЗКА ИЗОБРАЖЕНИЙ В SUPABASE STORAGE
 * (Golden Standard Edition)
 * ========================================
 * Скачивает изображения по URL и загружает в Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Ошибка: Не заданы VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET_NAME = 'dgt-images';

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;

        client.get(url, (response) => {
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

function getFileExtension(url) {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return ext || '.jpg'; // Дефолт
}

function generateFileName(url) {
    // Создаём уникальное имя на основе URL
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const ext = getFileExtension(url);
    return `${hash}${ext}`;
}

async function ensureBucket() {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) throw bucketError;

    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
        console.log(`📦 Создаём бакет '${BUCKET_NAME}'...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 10485760 // 10MB
        });
        if (createError) throw createError;
        console.log(`✅ Бакет '${BUCKET_NAME}' создан`);
    } else {
        console.log(`📦 Бакет '${BUCKET_NAME}' существует`);
    }
}

async function uploadImageFromUrl(imageUrl) {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined' || imageUrl.startsWith(`${SUPABASE_URL}/storage`)) {
        // Уже загружено в Supabase или URL отсутствует
        return imageUrl === 'null' || imageUrl === 'undefined' ? null : imageUrl;
    }

    const fileName = generateFileName(imageUrl);

    try {
        // Скачиваем изображение
        const imageBuffer = await downloadImage(imageUrl);

        // Определяем content type
        const ext = getFileExtension(imageUrl);
        const contentType = ext === '.png' ? 'image/png' :
            ext === '.webp' ? 'image/webp' : 'image/jpeg';

        // Загружаем в Supabase
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, imageBuffer, {
                contentType,
                upsert: true,
                cacheControl: '31536000' // 1 год
            });

        if (uploadError) throw uploadError;

        // Получаем публичный URL
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return data.publicUrl;

    } catch (error) {
        console.error(`  ❌ Ошибка для ${imageUrl.substring(0, 50)}...`);
        console.error(`     ${error.message}`);
        return null;
    }
}

// ========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ========================================

async function processQuestions(jsonPath) {
    console.log('📖 Читаем JSON...');
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    const questions = Array.isArray(data) ? data : data.questions;

    if (!questions || questions.length === 0) {
        throw new Error('JSON не содержит вопросов');
    }

    console.log(`✅ Найдено ${questions.length} вопросов\n`);

    let processedImages = 0;
    let skippedImages = 0;
    let errorImages = 0;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const num = q.question_number || (i + 1);

        console.log(`\n🔄 Вопрос #${num}...`);

        // ПРИОРИТЕТ: Сгенерированное ИИ изображение (авторское право)
        const sourceImage = q.generated_image_path || q.image_url;

        if (sourceImage && sourceImage !== 'null' && sourceImage !== 'undefined') {
            if (typeof sourceImage === 'string' && sourceImage.includes(SUPABASE_URL)) {
                console.log(`  ℹ️  Изображение уже в Cloud, пропускаем`);
                skippedImages++;
            } else {
                console.log(`  📥 Загружаем в Cloud: ${typeof sourceImage === 'string' ? sourceImage.substring(0, 50) : 'local file'}...`);
                // Если это локальный путь (от Imagen)
                let newUrl;
                if (q.generated_image_path && !q.generated_image_path.startsWith('http')) {
                    const fileBuffer = await fs.readFile(q.generated_image_path);
                    const fileName = path.basename(q.generated_image_path);

                    const { error: uploadError } = await supabase.storage
                        .from(BUCKET_NAME)
                        .upload(fileName, fileBuffer, { contentType: 'image/png', upsert: true });

                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
                    newUrl = data.publicUrl;
                } else {
                    // Fallback на URL (если нет сгенерированного)
                    newUrl = await uploadImageFromUrl(sourceImage);
                }

                if (newUrl) {
                    q.image_url = newUrl; // Перезаписываем основной URL
                    console.log(`  ✅ Готово: ${newUrl.substring(0, 50)}...`);
                    processedImages++;
                } else {
                    errorImages++;
                }
            }
        }

        // ВАЖНО: Схемы (оригиналы) НЕ загружаем в базу для безопасности авторских прав!
        // Они нужны были только AI для генерации текста объяснения.
        if (q.schema_url) {
            console.log(`  🗑️  Удаляем ссылку на оригинальную схему (для безопасности)`);
            q.schema_url = null;
        }

        // Сохраняем после каждого вопроса
        await fs.writeFile(jsonPath, JSON.stringify(Array.isArray(data) ? data : { questions }, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ ЗАГРУЗКИ');
    console.log('='.repeat(60));
    console.log(`✅ Загружено изображений: ${processedImages}`);
    console.log(`ℹ️  Пропущено (уже в Supabase): ${skippedImages}`);
    console.log(`❌ Ошибок: ${errorImages}`);
    console.log('='.repeat(60) + '\n');

    return { processedImages, skippedImages, errorImages };
}

async function main() {
    const jsonPath = process.argv[2];

    if (!jsonPath) {
        console.error('❌ Укажите путь к JSON файлу');
        console.error('Использование: node scripts/upload-images-golden.js <file.json>');
        process.exit(1);
    }

    const absolutePath = path.resolve(jsonPath);

    console.log('='.repeat(60));
    console.log('📸 ЗАГРУЗКА ИЗОБРАЖЕНИЙ В SUPABASE STORAGE');
    console.log('='.repeat(60));
    console.log(`Файл: ${absolutePath}\n`);

    try {
        await ensureBucket();
        await processQuestions(absolutePath);

        console.log('✨ Готово! Изображения загружены, JSON обновлён.');

    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

main();
