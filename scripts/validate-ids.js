import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedDir = path.resolve(__dirname, '../data/parsed');

function validateIds() {
    console.log("🔍 Scanning for questions missing UUIDs...");

    // Check if --fix flag passed
    const autoFix = process.argv.includes('--fix');

    // Scan recursivelly or just topics
    const topics = fs.readdirSync(parsedDir).filter(f => f.startsWith('topic-'));

    let stats = {
        enriched: { total: 0, missing: 0, files: [] },
        raw: { total: 0, missing: 0, files: [] }
    };

    topics.forEach(topic => {
        const topicPath = path.join(parsedDir, topic);
        if (!fs.statSync(topicPath).isDirectory()) return;

        const files = fs.readdirSync(topicPath).filter(f => f.endsWith('.json'));

        files.forEach(file => {
            const isEnriched = file.endsWith('-enriched.json');
            const type = isEnriched ? 'enriched' : 'raw';
            const filePath = path.join(topicPath, file);

            let content;
            try {
                content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                console.error(`❌ Error parsing ${file}:`, e.message);
                return;
            }

            let fileModified = false;
            let missingInFile = [];

            content.forEach((q, index) => {
                stats[type].total++;

                if (!q.id && !q.external_id) {
                    stats[type].missing++;
                    const qNum = q.question_number || index + 1;
                    missingInFile.push(qNum);

                    if (autoFix) {
                        const newId = uuidv4();
                        q.id = newId;
                        q.external_id = newId;
                        fileModified = true;
                    }
                }
            });

            if (missingInFile.length > 0) {
                stats[type].files.push({
                    file: path.join(topic, file),
                    questions: missingInFile,
                    fixed: fileModified
                });
            }

            if (fileModified) {
                fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
                console.log(`✅ Fixed IDs in ${file}`);
            }
        });
    });

    console.log(`\n📊 **ID Validation Report**`);
    console.log(`--------------------------------`);
    console.log(`ENRICHED FILES (Critical for App):`);
    console.log(`  - Questions Scanned: ${stats.enriched.total}`);
    console.log(`  - Questions Missing IDs: ${stats.enriched.missing}`);

    if (stats.enriched.files.length > 0) {
        console.log(`  🚨 **Enriched Files with Issues:**`);
        stats.enriched.files.forEach(issue => console.log(`    - ${issue.file}: Q[${issue.questions.join(',')}]`));
    } else {
        console.log(`  ✅ All enriched questions are valid.`);
    }

    console.log(`--------------------------------`);
    console.log(`RAW FILES (Source Data):`);
    console.log(`  - Questions Scanned: ${stats.raw.total}`);
    console.log(`  - Questions Missing IDs: ${stats.raw.missing}`);

    if (stats.raw.files.length > 0 && !autoFix) {
        // Show limit examples
        stats.raw.files.slice(0, 5).forEach(issue => console.log(`    - Example: ${issue.file} (Q: ${issue.questions.length})`));
        if (stats.raw.files.length > 5) console.log(`    ... and ${stats.raw.files.length - 5} more files.`);
    }

    if (autoFix) {
        console.log(`\n✨ Auto-fix completed! All missing IDs have been generated.`);
    } else if (stats.enriched.missing > 0 || stats.raw.missing > 0) {
        console.log(`\n💡 To auto-fix ALL missing IDs, run with flag: --fix`);
    }
}

validateIds();
