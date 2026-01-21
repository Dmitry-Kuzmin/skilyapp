/**
 * Fix missing external_id and id fields in enriched JSON files
 * Extracts UUID from image_url and adds required fields
 */

import fs from 'fs';
import path from 'path';

// Function to extract UUID from image URL
function extractUuidFromUrl(url) {
    if (!url) return null;

    // Example URL: https://teorica.practicavial.com/question/560d3722-7b99-4ffd-896f-5d593605c2ac-1657810888-i.jpg
    const match = url.match(/\/question\/([a-f0-9-]+)-\d+-[is]\.jpg/i);
    return match ? match[1] : null;
}

// Process a single file
function processFile(filePath) {
    console.log(`\n📄 Processing: ${filePath}`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const questions = JSON.parse(content);

        let modified = 0;
        let alreadyHad = 0;

        questions.forEach((question, index) => {
            // Check if already has external_id
            if (question.external_id || question.id) {
                alreadyHad++;
                return;
            }

            // Extract UUID from image_url
            const uuid = extractUuidFromUrl(question.image_url);

            if (uuid) {
                question.external_id = uuid;
                question.id = uuid;
                question.enriched_from_cache = true; // Mark as processed
                modified++;
                console.log(`  ✅ Question ${index + 1}: Added external_id = ${uuid}`);
            } else {
                console.log(`  ⚠️  Question ${index + 1}: Could not extract UUID from ${question.image_url}`);
            }
        });

        if (modified > 0) {
            // Write back to file
            fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf8');
            console.log(`\n✅ Modified ${modified} questions in ${path.basename(filePath)}`);
        } else {
            console.log(`\n✨ All ${alreadyHad} questions already had external_id`);
        }

        return { modified, alreadyHad, total: questions.length };

    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return { modified: 0, alreadyHad: 0, total: 0 };
    }
}

// Main execution
function main() {
    const targetFile = process.argv[2];

    if (!targetFile) {
        console.log(`
Usage: node fix-missing-external-ids.js <file-or-directory>

Examples:
  node fix-missing-external-ids.js data/parsed/topic-02/topic-02_test-002-enriched.json
  node fix-missing-external-ids.js data/parsed/topic-02
  node fix-missing-external-ids.js data/parsed
`);
        process.exit(1);
    }

    const fullPath = path.resolve(targetFile);

    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Path not found: ${fullPath}`);
        process.exit(1);
    }

    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
        // Process single file
        processFile(fullPath);
    } else if (stat.isDirectory()) {
        // Process all enriched JSON files in directory
        const files = fs.readdirSync(fullPath)
            .filter(f => f.endsWith('-enriched.json'))
            .map(f => path.join(fullPath, f));

        console.log(`\n🔍 Found ${files.length} enriched JSON files\n`);

        let totalModified = 0;
        let totalAlreadyHad = 0;
        let totalQuestions = 0;

        files.forEach(file => {
            const result = processFile(file);
            totalModified += result.modified;
            totalAlreadyHad += result.alreadyHad;
            totalQuestions += result.total;
        });

        console.log(`\n📊 Summary:`);
        console.log(`   Total questions: ${totalQuestions}`);
        console.log(`   Modified: ${totalModified}`);
        console.log(`   Already had: ${totalAlreadyHad}`);
        console.log(`   ✅ Done!`);
    }
}

main();
