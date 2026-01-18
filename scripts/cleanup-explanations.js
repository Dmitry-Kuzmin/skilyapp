import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data/parsed');

async function findEnrichedFiles(dir) {
    let results = [];
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const file of list) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                results = results.concat(await findEnrichedFiles(fullPath));
            } else if (file.name.endsWith('-enriched.json')) {
                results.push(fullPath);
            }
        }
    } catch (err) { }
    return results;
}

function cleanText(text) {
    if (!text) return text;

    // Remove headers but keep emojis
    let clean = text
        .replace(/🎓\s*(ОБЪЯСНЕНИЕ ПРАВИЛА|Правило|Explanation)([\s\S]*?)/gi, '🎓 $2')
        .replace(/💡\s*(ШПАРГАЛКА|МНЕМОТЕХНИКА|Совет|Tip|Memo)([\s\S]*?)/gi, '💡 $2')
        .replace(/🇷🇺\s*(СРАВНЕНИЕ С РФ|Отличие от РФ|Rh|Ru comparison)([\s\S]*?)/gi, '🇷🇺 $2')

        // Remove specific leftover headers if they appear without emoji
        .replace(/\*\*ОБЪЯСНЕНИЕ ПРАВИЛА\*\*:?/gi, '')
        .replace(/\*\*ШПАРГАЛКА\*\*:?/gi, '')
        .replace(/\*\*СРАВНЕНИЕ С РФ\*\*:?/gi, '')

        // Clean up markdown bolding around header words if they remain
        .replace(/\*\*(Правило|Шпаргалка)\*\*/gi, '')

        // Trim excessive whitespace/newlines created by removal
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return clean;
}

async function processFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const questions = JSON.parse(content);
        let modified = false;

        const processedQuestions = questions.map(q => {
            if (q.explanation && q.explanation.ru) {
                const original = q.explanation.ru;
                const cleaned = cleanText(original);

                if (cleaned !== original) {
                    q.explanation.ru = cleaned;
                    modified = true;
                }
            }
            return q;
        });

        if (modified) {
            await fs.writeFile(filePath, JSON.stringify(processedQuestions, null, 2));
            console.log(`✅ Cleaned: ${path.basename(filePath)}`);
        } else {
            // console.log(`Tests passed (no changes): ${path.basename(filePath)}`);
        }
    } catch (err) {
        console.error(`❌ Error: ${filePath}`, err.message);
    }
}

async function main() {
    console.log('🧹 Cleaning explanation headers...');
    const files = await findEnrichedFiles(DATA_DIR);
    console.log(`📂 Found ${files.length} enriched files.`);

    for (const file of files) {
        await processFile(file);
    }
    console.log('✨ All texts cleaned!');
}

main();
