
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARSED_DIR = path.resolve(__dirname, '../data/parsed');

// Regex patterns
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function scanFiles(dir) {
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });

    for (const dirent of list) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            results = results.concat(await scanFiles(fullPath));
        } else if (dirent.name.endsWith('-enriched.json')) {
            results.push(fullPath);
        }
    }
    return results;
}

function extractIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(UUID_REGEX);
    return match ? match[0] : null;
}

function generateHashId(text) {
    return crypto.createHash('md5').update(text.trim()).digest('hex');
}

async function main() {
    console.log('🔍 Scanning for enriched files...');
    const files = await scanFiles(PARSED_DIR);
    console.log(`📂 Found ${files.length} files.`);

    let totalFixed = 0;
    let totalQuestions = 0;

    for (const file of files) {
        // Backup
        if (!existsSync(file + '.backup_norm')) {
            await fs.copyFile(file, file + '.backup_norm');
        }

        const content = await fs.readFile(file, 'utf8');
        let questions;
        try {
            questions = JSON.parse(content);
        } catch (e) {
            console.error(`❌ Error parsing ${path.basename(file)}: ${e.message}`);
            continue;
        }

        let changed = false;

        questions.forEach((q, idx) => {
            totalQuestions++;

            // Logic to determine ID
            let newId = null;

            // 1. Try Image URL
            if (!newId && q.image_url) {
                newId = extractIdFromUrl(q.image_url);
            }

            // 2. Try Schema URL
            if (!newId && q.schema_url) {
                newId = extractIdFromUrl(q.schema_url);
            }

            // 3. Fallback: Existing external_id (trust it if it looks like UUID)
            if (!newId && q.external_id && UUID_REGEX.test(q.external_id)) {
                newId = q.external_id;
            }

            // 4. Fallback: Hash of Spanish text
            if (!newId && q.question?.es) {
                newId = 'hash-' + generateHashId(q.question.es);
                // console.warn(`⚠️  Using hash ID for question ${idx + 1} in ${path.basename(file)}`);
            }

            // Apply ID
            if (newId && q.external_id !== newId) {
                // console.log(`   ✏️  Fixing ID: ${q.external_id || 'null'} -> ${newId}`);
                q.external_id = newId;
                changed = true;
                totalFixed++;
            }
        });

        if (changed) {
            await fs.writeFile(file, JSON.stringify(questions, null, 2));
            console.log(`✅ Updated ${path.basename(file)} (${totalFixed} changes so far)`);
        }
    }

    console.log('\n🏁 Normalization complete.');
    console.log(`   Scanned Questions: ${totalQuestions}`);
    console.log(`   Fixed IDs: ${totalFixed}`);
}

main().catch(console.error);
