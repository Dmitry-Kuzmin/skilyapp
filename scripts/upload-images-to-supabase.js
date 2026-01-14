
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Загрузка переменных окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY; // Поддержка обоих вариантов

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Ошибка: Не заданы VITE_SUPABASE_URL или SUPABASE_SERVICE_KEY в .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET_NAME = 'dgt-images';
const IMAGES_DIR = path.resolve(__dirname, '../data/images');
const DATA_FILE = path.resolve(__dirname, '../data/test-results.json');

async function main() {
    console.log('🚀 Начинаем загрузку изображений в Supabase Storage...');

    // 1. Проверяем/создаем бакет
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.error('❌ Ошибка при проверке бакетов:', bucketError.message);
        process.exit(1);
    }

    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
        console.log(`📦 Создаем бакет '${BUCKET_NAME}'...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 5242880 // 5MB
        });
        if (createError) {
            console.error('❌ Ошибка создания бакета:', createError.message);
            process.exit(1);
        }
    } else {
        console.log(`📦 Бакет '${BUCKET_NAME}' уже существует.`);
    }

    // 2. Читаем JSON с вопросами
    console.log('📖 Читаем data/test-results.json...');
    const rawData = await fs.readFile(DATA_FILE, 'utf8');
    const questions = JSON.parse(rawData);

    // Собираем уникальные имена файлов (картинки вопросов + схемы)
    const filesToUpload = new Set();
    questions.forEach(q => {
        if (q.image_filename) filesToUpload.add(q.image_filename);
        if (q.schema_filename) filesToUpload.add(q.schema_filename);
    });

    console.log(`🔍 Найдено ${filesToUpload.size} уникальных изображений для загрузки.`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fileName of filesToUpload) {
        const filePath = path.join(IMAGES_DIR, fileName);

        try {
            await fs.access(filePath); // Проверяем существование файла
            const fileBuffer = await fs.readFile(filePath);
            const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

            // Проверяем, есть ли уже файл (чтобы не перезаписывать лишний раз)
            // Эту проверку можно пропустить и использовать upsert: false, либо upsert: true для принудительного обновления.
            // Для надежности используем upsert: true

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, fileBuffer, {
                    contentType,
                    upsert: true
                });

            if (uploadError) {
                console.error(`  ❌ Ошибка загрузки ${fileName}:`, uploadError.message);
                errorCount++;
            } else {
                console.log(`  ✅ Загружен: ${fileName}`);
                successCount++;
            }

        } catch (err) {
            console.warn(`  ⚠️ Файл не найден локально: ${fileName}`);
            skipCount++;
        }
    }

    console.log('\n🏁 Итоги загрузки:');
    console.log(`✅ Успешно: ${successCount}`);
    console.log(`⚠️ Пропущено (нет локально): ${skipCount}`);
    console.log(`❌ Ошибки: ${errorCount}`);

    // 3. Обновляем JSON с публичными URL (опционально, но полезно)
    console.log('\n🔗 Обновляем ссылки в JSON...');
    let updated = false;

    for (const q of questions) {
        if (q.image_filename) {
            const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(q.image_filename).data.publicUrl;
            if (q.image_url !== publicUrl) {
                q.image_url = publicUrl;
                updated = true;
            }
        }
        if (q.schema_filename) {
            const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(q.schema_filename).data.publicUrl;
            if (q.schema_url !== publicUrl) {
                q.schema_url = publicUrl;
                updated = true;
            }
        }
    }

    if (updated) {
        await fs.writeFile(DATA_FILE, JSON.stringify(questions, null, 2));
        console.log('✅ test-results.json обновлен новыми ссылками Supabase!');
    } else {
        console.log('ℹ️ Ссылки уже актуальны.');
    }
}

main().catch(console.error);
