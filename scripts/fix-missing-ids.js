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
    } catch (err) {
        if (err.code === 'ENOENT') {
            // Directory doesn't exist, ignore
        } else {
            console.error(`Error reading directory ${dir}:`, err);
        }
    }
    return results;
}

async function fixFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const questions = JSON.parse(content);
        let modified = false;
        let fixedCount = 0;

        const fixedQuestions = questions.map(q => {
            // Если ID уже есть, пропускаем
            if (q.external_id && q.id) return q;

            // Пытаемся извлечь UUID из image_url
            // Пример: .../question/acd3ec1e-490f-4909-895a-735577e5b259-1657810553-i.jpg
            const idMatch = q.image_url && q.image_url.match(/\/question\/([0-9a-f-]{36})[-]/);

            if (idMatch && idMatch[1]) {
                const uuid = idMatch[1];

                // Добавляем отсутствующие поля
                if (!q.external_id) {
                    q.external_id = uuid;
                    modified = true;
                }
                if (!q.id) { // Для совместимости добавляем и просто id
                    q.id = uuid;
                    modified = true;
                }
                fixedCount++;
            }
            return q;
        });

        if (modified) {
            await fs.writeFile(filePath, JSON.stringify(fixedQuestions, null, 2));
            console.log(`✅ Fixed ${fixedCount} IDs in: ${path.basename(filePath)}`);
        } else {
            console.log(`👌 No changes needed: ${path.basename(filePath)}`);
        }

    } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err.message);
    }
}

async function main() {
    console.log('🔍 Scanning for enriched files missing IDs...');
    try {
        const files = await findEnrichedFiles(DATA_DIR);
        console.log(`📂 Found ${files.length} enriched files.`);

        for (const file of files) {
            await fixFile(file);
        }
        console.log('✨ All done!');
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

main();
