#!/usr/bin/env node

/**
 * ========================================
 * АВТОМАТИЧЕСКИЙ КОНВЕЙЕР ВОПРОСОВ (v2.0)
 * ========================================
 * Парсинг → AI (Текст) → AI (Изображения) → Импорт
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

const args = process.argv.slice(2);
const inputFile = args.find(arg => !arg.startsWith('-'));
const autoMode = args.includes('--auto') || args.includes('-a');

if (!inputFile) {
    console.error('❌ Укажите путь к JSON файлу');
    process.exit(1);
}

const absolutePath = path.resolve(inputFile);

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`\n💫 Запуск: ${command} ${args.join(' ')}\n`);
        const child = spawn(command, args, { stdio: 'inherit', shell: true });
        child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Exit code ${code}`)));
    });
}

async function main() {
    console.log('\n🏭 GOLDEN PIPELINE v2.0 (AI IMAGES EDITION)');
    console.log('='.repeat(60));

    try {
        // 1. AI Тексты и Теория (V5)
        console.log('\n🤖 ЭТАП 1: ГЕНЕРАЦИЯ ОБЪЯСНЕНИЙ (Gemini V5)');
        await runCommand('node', ['scripts/digitize-explanations-golden.js', absolutePath]);

        // 2. Resolve Topics
        console.log('\n🔗 ЭТАП 2: МАППИНГ ТЕМ');
        await runCommand('node', ['scripts/resolve-topic-ids.js', absolutePath]);

        // 3. AI Изображения (ControlNet HARDCORE)
        console.log('\n🎯 ЭТАП 3: CONTROLNET РЕСТАЙЛИНГ (Точная структура)');
        console.log('   (Максимальный контроль - сохраняем ВСЕ детали оригинала)');
        await runCommand('node', ['scripts/generate-images-controlnet.js', absolutePath]);

        // 4. Загрузка в Cloud
        console.log('\n📸 ЭТАП 4: ЗАГРУЗКА В SUPABASE STORAGE');
        await runCommand('node', ['scripts/upload-images-golden.js', absolutePath]);

        // 5. Импорт
        console.log('\n📦 ЭТАП 5: ФИНАЛЬНЫЙ ИМПОРТ');
        await runCommand('node', ['scripts/import-golden.js', absolutePath, '--yes']);

        console.log('\n🎉 КОНВЕЙЕР ЗАВЕРШЕН!');
    } catch (error) {
        console.error(`\n❌ ОШИБКА: ${error.message}`);
        process.exit(1);
    }
}

main();
