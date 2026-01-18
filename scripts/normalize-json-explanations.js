#!/usr/bin/env node

/**
 * NORMALIZE JSON EXPLANATIONS
 * 
 * Проходит по всем enriched JSON файлам и чистит explanation.ru:
 * - Убирает "1️⃣ 🎓 Правило" -> оставляет "🎓"
 * - Убирает "2️⃣ 🇷🇺 Сравнение с РФ" -> оставляет "🇷🇺"
 * - Убирает "3️⃣ 💡 Шпаргалка" -> оставляет "💡"
 * 
 * НЕ трогает текст после заголовков!
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data/parsed');

/**
 * Нормализация текста объяснения
 */
function normalizeExplanation(text) {
    if (!text) return text;

    let normalized = text;

    // 1. Убираем "1️⃣ **🎓 Правило**" и вариации
    // Паттерн: цифра, пробелы, опциональные звёздочки, эмодзи, пробелы, слово Правило, опциональные звёздочки
    normalized = normalized.replace(/1️⃣\s*\*{0,2}\s*🎓\s*Правило\s*\*{0,2}/g, '🎓');

    // 2. Убираем "2️⃣ **🇷🇺 Сравнение с РФ**" и вариации
    normalized = normalized.replace(/2️⃣\s*\*{0,2}\s*🇷🇺\s*Сравнение с РФ[^*\n]*\*{0,2}/g, '🇷🇺');

    // 3. Убираем "3️⃣ **💡 Шпаргалка**" и вариации
    normalized = normalized.replace(/3️⃣\s*\*{0,2}\s*💡\s*Шпаргалка[^*\n]*\*{0,2}/g, '💡');

    // 4. Склеиваем эмодзи с текстом (убираем перенос строки сразу после эмодзи)
    // Было: "🎓\nТекст" -> Станет: "🎓 Текст"
    normalized = normalized.replace(/🎓\s*\n+\s*/g, '🎓 ');
    normalized = normalized.replace(/🇷🇺\s*\n+\s*/g, '🇷🇺 ');
    normalized = normalized.replace(/💡\s*\n+\s*/g, '💡 ');

    // 5. Убираем тройные и более переносы строк (оставляем максимум двойные для разделения секций)
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    return normalized;
}

/**
 * Обработка одного JSON файла
 */
async function processFile(filePath) {
    console.log(`  🔄 Processing: ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf-8');
    const questions = JSON.parse(content);

    let changedCount = 0;

    for (const q of questions) {
        if (q.explanation?.ru) {
            const original = q.explanation.ru;
            const normalized = normalizeExplanation(original);

            if (normalized !== original) {
                q.explanation.ru = normalized;
                changedCount++;
            }
        }
    }

    // Сохраняем обратно (красиво форматируем)
    await fs.writeFile(filePath, JSON.stringify(questions, null, 2), 'utf-8');

    console.log(`  ✅ Updated ${changedCount}/${questions.length} explanations`);
    return changedCount;
}

/**
 * Рекурсивный поиск всех enriched JSON файлов
 */
async function findEnrichedFiles(dir) {
    const files = [];

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Рекурсия в подпапки
                const subFiles = await findEnrichedFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.name.endsWith('-enriched.json')) {
                files.push(fullPath);
            }
        }
    } catch (err) {
        // Игнорируем ошибки доступа к папкам
    }

    return files;
}

async function main() {
    console.log('🧹 NORMALIZE JSON EXPLANATIONS\n');
    console.log(`📂 Searching in: ${dataDir}\n`);

    const files = await findEnrichedFiles(dataDir);

    if (files.length === 0) {
        console.log('❌ No enriched JSON files found!');
        return;
    }

    console.log(`✅ Found ${files.length} enriched files\n`);

    let totalChanged = 0;

    for (const file of files) {
        const changed = await processFile(file);
        totalChanged += changed;
    }

    console.log(`\n🎉 Done! Normalized ${totalChanged} explanations across ${files.length} files.`);
}

main().catch(console.error);
