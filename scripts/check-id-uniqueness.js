import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedDir = path.join(__dirname, '../data/parsed');
const targetTopic = process.argv[2]; // Optional: filter by topic (e.g. "topic-04")

async function scanDirectory(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    let files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await scanDirectory(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            if (entry.name.includes('test-') && !entry.name.includes('backup')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

async function analyzeIds() {
    console.log(`Scanning directory: ${parsedDir}`);
    if (targetTopic) console.log(`Filtering for topic: ${targetTopic}`);

    const allFiles = await scanDirectory(parsedDir);

    // ID Map: ID -> [Array of File Paths where it appears]
    const idMap = new Map();
    let totalQuestions = 0;
    let filesProcessed = 0;

    for (const file of allFiles) {
        // Filter by topic if requested
        if (targetTopic && !file.includes(targetTopic)) continue;

        try {
            const content = await fs.promises.readFile(file, 'utf8');
            const questions = JSON.parse(content);

            if (!Array.isArray(questions)) continue; // Skip non-array JSONs

            filesProcessed++;
            const relativePath = path.relative(parsedDir, file);

            questions.forEach((q, index) => {
                const id = q.external_id || q.id;
                const questionNum = q.question_number || (index + 1);

                if (!id) {
                    console.warn(`[WARNING] Queue ${questionNum} in ${relativePath} has NO ID!`);
                    return;
                }

                totalQuestions++;

                if (!idMap.has(id)) {
                    idMap.set(id, []);
                }
                idMap.get(id).push({
                    file: relativePath,
                    qNum: questionNum
                });
            });

        } catch (err) {
            console.error(`Error reading ${file}: ${err.message}`);
        }
    }

    console.log(`\n=== Analysis Result ===`);
    console.log(`Files Processed: ${filesProcessed}`);
    console.log(`Total Questions: ${totalQuestions}`);
    console.log(`Unique IDs: ${idMap.size}`);

    const duplicates = [];
    for (const [id, occurrences] of idMap.entries()) {
        if (occurrences.length > 1) {
            // Check if occurrences are from DIFFERENT tests (files)
            // It's okay if duplicates are between "raw" and "enriched" versions of the SAME test.
            // We should filter only UNIQUE tests numbers.

            const fileSet = new Set();
            occurrences.forEach(o => {
                // Normalize: topic-04_test-001.json vs topic-04_test-001-enriched.json -> same test
                const baseName = o.file.replace('-enriched.json', '').replace('.json', '');
                fileSet.add(baseName);
            });

            if (fileSet.size > 1) {
                duplicates.push({ id, tests: Array.from(fileSet), count: occurrences.length });
            }
        }
    }

    if (duplicates.length > 0) {
        console.log(`\n❌ CRITICAL: Found ${duplicates.length} IDs duplicated across DIFFERENT TESTS!`);
        console.log(`This confirms why data is being overwritten in the database.\n`);

        // Show first 5 examples
        duplicates.slice(0, 5).forEach(d => {
            console.log(`ID: ${d.id}`);
            console.log(`    Found in tests: ${d.tests.join(', ')}`);
        });

        if (duplicates.length > 5) console.log(`... and ${duplicates.length - 5} more.`);
    } else {
        console.log(`\n✅ No cross-test ID collisions found. IDs seem unique per test.`);
    }
}

analyzeIds();
