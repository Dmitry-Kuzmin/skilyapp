import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v5 as uuidv5 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
    return typeof str === 'string' && UUID_REGEX.test(str);
}

function generateDeterministicUUID(input) {
    return uuidv5(input, NAMESPACE);
}

async function findAllEnrichedFiles(dir, files = []) {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            // Only process topic-XX directories
            if (item.name.startsWith('topic-')) {
                await findAllEnrichedFiles(fullPath, files);
            }
        } else if (item.name.endsWith('-enriched.json')) {
            files.push(fullPath);
        }
    }

    return files;
}

async function fixFile(filePath) {
    console.log(`\n📄 Checking: ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf-8');
    const questions = JSON.parse(content);

    let invalidCount = 0;
    let fixed = false;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const currentId = q.external_id || q.id;

        if (!isValidUUID(currentId)) {
            invalidCount++;

            // Generate new UUID based on question content
            const seed = q.question?.ru || q.question_ru || q.question?.es || q.question_es || currentId;
            const newId = generateDeterministicUUID(seed + i);

            console.log(`   ⚠️  Invalid ID found: ${currentId}`);
            console.log(`   ✅ Fixed to: ${newId}`);

            // Update both id and external_id to be safe
            questions[i].id = newId;
            questions[i].external_id = newId;

            fixed = true;
        }
    }

    if (fixed) {
        await fs.writeFile(filePath, JSON.stringify(questions, null, 2), 'utf-8');
        console.log(`   💾 File saved with ${invalidCount} fixes`);
    } else {
        console.log(`   ✅ All UUIDs valid (${questions.length} questions)`);
    }

    return invalidCount;
}

async function main() {
    console.log('🔍 Scanning for invalid UUIDs in enriched files...\n');

    const parsedDir = path.join(__dirname, '..', 'data', 'parsed');
    const files = await findAllEnrichedFiles(parsedDir);

    console.log(`Found ${files.length} enriched files to check.\n`);

    let totalInvalid = 0;

    for (const file of files) {
        const count = await fixFile(file);
        totalInvalid += count;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Scan complete!`);
    console.log(`   Total files checked: ${files.length}`);
    console.log(`   Invalid UUIDs fixed: ${totalInvalid}`);
    console.log('='.repeat(60));
}

main().catch(console.error);
