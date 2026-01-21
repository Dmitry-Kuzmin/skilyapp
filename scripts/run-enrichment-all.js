
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

async function main() {
    console.log('🔍 Searching for test files...');

    // 0. Argument for filtering (e.g. specific test ID)
    const targetFilter = process.argv[2];
    if (targetFilter) {
        console.log(`🎯 Filtering tasks by: "${targetFilter}"`);
    }

    // 1. Находим все исходные тесты
    // Ищем в topic-01, topic-02... и dgt_test, essential_test тоже
    const allTests = await glob('data/parsed/**/*.json');

    // Фильтруем файлы, которые
    // 1. НЕ заканчиваются на -enriched.json
    // 2. НЕ dashboard.json, validation-decisions.json и т.д.
    // 3. Содержат 'test-' в имени
    // 4. (Optional) Match target filter
    const sourceTests = allTests.filter(f =>
        !f.endsWith('-enriched.json') &&
        path.basename(f).includes('test-') &&
        (!targetFilter || f.includes(targetFilter))
    );

    console.log(`📋 Found ${sourceTests.length} source test files.`);

    // 2. Умная фильтрация: проверяем не просто наличие файла, а его полноту
    const tasks = [];

    console.log('🧐 Checking which files need enrichment (Smart resume)...');

    for (const sourceFile of sourceTests) {
        const enrichedFile = sourceFile.replace('.json', '-enriched.json');

        try {
            // Если файла обогащения нет совсем — точно надо делать
            await fs.access(enrichedFile);

            // Если есть — читаем и проверяем качество (нет ли пустых полей)
            const content = await fs.readFile(enrichedFile, 'utf8');
            const data = JSON.parse(content);

            // Простая проверка: если хоть один вопрос не имеет перевода объяснения, значит файл не доделан
            // Или если количество вопросов не совпадает (хотя это сложнее проверить без чтения исходника, но sourceFile у нас есть)
            const hasGaps = data.some(q => !q.explanation?.ru || !q.explanation?.es);

            if (hasGaps) {
                const missingCount = data.filter(q => !q.explanation?.ru || !q.explanation?.es).length;
                console.log(`   🔸 Found ${missingCount} gaps in ${path.basename(enrichedFile)}, adding to queue.`);
                tasks.push(sourceFile);
            } else {
                // Файл полностью готов
                // process.stdout.write('.'); // Optional: show progress for skipped
            }
        } catch (e) {
            // Файла нет или ошибка чтения — добавляем в очередь
            console.log(`   🆕 Missing enriched file for ${path.basename(sourceFile)}, adding to queue.`);
            tasks.push(sourceFile);
        }
    }

    /* 
    const enrichedFiles = new Set(
        (await glob('data/parsed/**//*-enriched.json')).map(f => f.replace('-enriched.json', '.json'))
);
const tasks = sourceTests.filter(f => !enrichedFiles.has(f)); 
*/

    console.log(`✅ Fully completed: ${sourceTests.length - tasks.length}`);
    console.log(`⏳ Need enrichment (gaps or missing): ${tasks.length}`);

    console.log('\n🚀 Starting enrichment process for all pending files...');
    console.log('This will take some time as we process files sequentially to avoid rate limits.\n');

    for (const [index, file] of tasks.entries()) {
        const progress = `[${index + 1}/${tasks.length}]`;
        console.log(`${progress} Processing: ${file}`);

        try {
            await runScript('./scripts/enrich-batch.js', [file]);
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
