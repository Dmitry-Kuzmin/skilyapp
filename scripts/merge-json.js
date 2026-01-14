/**
 * ========================================
 * ОБЪЕДИНЕНИЕ JSON ФАЙЛОВ
 * ========================================
 * Объединяет несколько JSON файлов с вопросами в один
 */

import fs from 'fs/promises';
import path from 'path';

async function mergeJsonFiles(inputFiles, outputFile) {
    console.log('🔄 Объединение файлов...\n');

    const allQuestions = [];
    let totalFiles = 0;

    for (const filePath of inputFiles) {
        try {
            const absolutePath = path.resolve(filePath);
            const content = await fs.readFile(absolutePath, 'utf-8');
            const data = JSON.parse(content);
            const questions = Array.isArray(data) ? data : data.questions;

            if (questions && questions.length > 0) {
                allQuestions.push(...questions);
                console.log(`✅ ${path.basename(filePath)}: ${questions.length} вопросов`);
                totalFiles++;
            } else {
                console.log(`⚠️  ${path.basename(filePath)}: пустой файл`);
            }
        } catch (error) {
            console.error(`❌ ${path.basename(filePath)}: ${error.message}`);
        }
    }

    if (allQuestions.length === 0) {
        throw new Error('Нет вопросов для объединения');
    }

    // Сохраняем объединённый файл
    const outputPath = path.resolve(outputFile);
    await fs.writeFile(outputPath, JSON.stringify(allQuestions, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ');
    console.log('='.repeat(60));
    console.log(`Обработано файлов: ${totalFiles}`);
    console.log(`Всего вопросов: ${allQuestions.length}`);
    console.log(`Сохранено в: ${outputPath}`);
    console.log('='.repeat(60) + '\n');
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('❌ Недостаточно аргументов');
        console.error('Использование: node scripts/merge-json.js <output.json> <input1.json> <input2.json> ...');
        console.error('\nПример:');
        console.error('  node scripts/merge-json.js data/all-questions.json data/topic-*.json');
        process.exit(1);
    }

    const outputFile = args[0];
    const inputFiles = args.slice(1);

    console.log('='.repeat(60));
    console.log('📦 ОБЪЕДИНЕНИЕ JSON ФАЙЛОВ');
    console.log('='.repeat(60));
    console.log(`Выходной файл: ${outputFile}`);
    console.log(`Входных файлов: ${inputFiles.length}\n`);

    try {
        await mergeJsonFiles(inputFiles, outputFile);
        console.log('✨ Готово!');
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

main();
