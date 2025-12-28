#!/usr/bin/env node
/**
 * Автоматическое обновление APP_VERSION в index.html перед каждым билдом
 * Это гарантирует принудительную очистку кэша на клиенте при новом деплое
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_HTML_PATH = path.join(__dirname, '../index.html');

// Генерируем версию на основе текущей даты и времени
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const newVersion = `${year}-${month}-${day}-${hours}:${minutes}`;

console.log(`[update-version] 🔄 Updating APP_VERSION to: ${newVersion}`);

try {
    // Читаем index.html
    let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

    // Заменяем APP_VERSION
    const regex = /const APP_VERSION = ['"]([^'"]+)['"]/;
    const match = html.match(regex);

    if (match) {
        const oldVersion = match[1];
        html = html.replace(regex, `const APP_VERSION = '${newVersion}'`);

        // Записываем обратно
        fs.writeFileSync(INDEX_HTML_PATH, html, 'utf8');
        console.log(`[update-version] ✅ Version updated: ${oldVersion} → ${newVersion}`);
    } else {
        console.warn('[update-version] ⚠️ APP_VERSION not found in index.html');
        process.exit(1);
    }
} catch (error) {
    console.error('[update-version] ❌ Error:', error.message);
    process.exit(1);
}
