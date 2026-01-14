/**
 * ========================================
 * СКАЧИВАНИЕ ИЗОБРАЖЕНИЙ (Вопросы + Схемы)
 * ========================================
 * 
 * Автоматически скачивает изображения и схемы из JSON.
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * node scripts/download-images.js <path-to-json>
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { createWriteStream } from 'fs';

const IMAGES_DIR = './data/images';
const CONCURRENT_DOWNLOADS = 5;

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const fileStream = createWriteStream(filepath);

        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                return;
            }
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath).catch(() => { });
            reject(err);
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('❌ Укажите путь к JSON!');
        process.exit(1);
    }

    const jsonPath = path.resolve(args[0]);
    const content = await fs.readFile(jsonPath, 'utf-8');
    const questions = JSON.parse(content);

    const downloadList = [];
    questions.forEach(q => {
        if (q.image_url && q.image_filename) downloadList.push({ url: q.image_url, filename: q.image_filename });
        if (q.schema_url && q.schema_filename) downloadList.push({ url: q.schema_url, filename: q.schema_filename });
    });

    const uniqueDownloads = Array.from(new Map(downloadList.map(item => [item.filename, item])).values());
    console.log(`🖼️ Найдено файлов: ${uniqueDownloads.length}`);

    await fs.mkdir(IMAGES_DIR, { recursive: true });
    const existingFiles = new Set(await fs.readdir(IMAGES_DIR).catch(() => []));
    const toDownload = uniqueDownloads.filter(d => !existingFiles.has(d.filename));

    console.log(`🚀 Скачиваем ${toDownload.length} новых файлов...`);

    for (let i = 0; i < toDownload.length; i += CONCURRENT_DOWNLOADS) {
        const batch = toDownload.slice(i, i + CONCURRENT_DOWNLOADS);
        await Promise.all(batch.map(d => {
            console.log(`  Downloading: ${d.filename}`);
            return downloadImage(d.url, path.join(IMAGES_DIR, d.filename))
                .catch(err => console.error(`  ❌ Error ${d.filename}:`, err.message));
        }));
    }

    console.log('✨ Готово!');
}

main();
