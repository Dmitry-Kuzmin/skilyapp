
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

async function main() {
    console.log('🔍 Searching for test files...');

    // 1. Находим все исходные тесты
    // Ищем в topic-01, topic-02... и dgt_test, essential_test тоже
    const allTests = await glob('data/parsed/**/*.json');

    // Фильтруем файлы, которые
    // 1. НЕ заканчиваются на -enriched.json
    // 2. НЕ dashboard.json, validation-decisions.json и т.д.
    // 3. Содержат 'test-' в имени
    const sourceTests = allTests.filter(f =>
        !f.endsWith('-enriched.json') &&
        path.basename(f).includes('test-')
    );

    console.log(`📋 Found ${sourceTests.length} source test files.`);

    // 2. Находим уже обогащенные файлы
    const enrichedFiles = new Set(
        (await glob('data/parsed/**/*-enriched.json')).map(f => f.replace('-enriched.json', '.json'))
    );

    // 3. Выделяем те, которые нужно обработать
    const tasks = sourceTests.filter(f => !enrichedFiles.has(f));

    console.log(`✅ Already enriched: ${enrichedFiles.size}`);
    console.log(`⏳ Pending enrichment: ${tasks.length}`);

    if (tasks.length === 0) {
        console.log('🎉 All tests are already enriched!');
        return;
    }

    console.log('\n🚀 Starting enrichment process for all pending files...');
    console.log('This will take some time as we process files sequentially to avoid rate limits.\n');

    for (const [index, file] of tasks.entries()) {
        const progress = `[${index + 1}/${tasks.length}]`;
        console.log(`${progress} Processing: ${file}`);

        try {
            await runScript('./scripts/enrich-batch-v2.js', [file]);
            console.log(`${progress} ✅ Success: ${file}\n`);
        } catch (error) {
            console.error(`${progress} ❌ Failed: ${file}`);
            console.error(error.message + '\n');
            // Continue with next file instead of stopping completely
        }

        // Пауза между файлами, чтобы дать передышку API (хотя внутри скрипта тоже есть паузы)
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n✨ Batch enrichment completed!');
}

function runScript(scriptPath, args) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [scriptPath, ...args], { stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Script exited with code ${code}`));
        });

        child.on('error', (err) => reject(err));
    });
}

main().catch(console.error);
