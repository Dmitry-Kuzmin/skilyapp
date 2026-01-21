import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedDir = path.resolve(__dirname, '../data/parsed');
const dgtDir = path.join(parsedDir, 'dgt_test');

function extractUuidFromUrl(url) {
    if (!url) return null;
    const match = url.match(/([a-f0-9-]{36})/);
    return match ? match[1] : null;
}

function analyzeOverlap() {
    console.log("🔍 Scanning enriched topic tests...");

    // 1. Build a map of EXISTING enriched questions
    const enrichedMap = new Map(); // UUID -> EnrichedData
    let enrichedCount = 0;

    const topics = fs.readdirSync(parsedDir).filter(f => f.startsWith('topic-'));

    topics.forEach(topic => {
        const topicPath = path.join(parsedDir, topic);
        if (!fs.statSync(topicPath).isDirectory()) return;

        const files = fs.readdirSync(topicPath).filter(f => f.endsWith('-enriched.json'));

        files.forEach(file => {
            const content = JSON.parse(fs.readFileSync(path.join(topicPath, file), 'utf8'));
            content.forEach(q => {
                if (q.external_id) {
                    enrichedMap.set(q.external_id, q);
                    enrichedCount++;
                }
            });
        });
    });

    console.log(`✅ Indexed ${enrichedCount} enriched questions.`);

    // 2. Scan DGT tests and check overlap
    console.log("🔍 Analyzing DGT tests overlap...");

    const dgtFiles = fs.readdirSync(dgtDir).filter(f => f.match(/^dgt_test-\d+\.json$/));

    let totalDgtQuestions = 0;
    let duplicateCount = 0;
    let newCount = 0;

    dgtFiles.forEach(file => {
        const content = JSON.parse(fs.readFileSync(path.join(dgtDir, file), 'utf8'));

        content.forEach(q => {
            totalDgtQuestions++;
            const uuid = extractUuidFromUrl(q.image_url) || extractUuidFromUrl(q.schema_url);

            if (uuid && enrichedMap.has(uuid)) {
                duplicateCount++;
            } else {
                newCount++;
            }
        });
    });

    console.log(`\n📊 **DGT Test Analysis Report**`);
    console.log(`--------------------------------`);
    console.log(`Total DGT Files: ${dgtFiles.length}`);
    console.log(`Total Questions: ${totalDgtQuestions}`);
    console.log(`--------------------------------`);
    console.log(`🔄 Duplicates (Already Enriched): ${duplicateCount} (${((duplicateCount / totalDgtQuestions) * 100).toFixed(1)}%)`);
    console.log(`🆕 New Questions (Need Enrichment): ${newCount} (${((newCount / totalDgtQuestions) * 100).toFixed(1)}%)`);
    console.log(`--------------------------------`);

    if (newCount === 0) {
        console.log("🎉 Amazing! All DGT questions are already enriched in Topics!");
    } else {
        console.log(`💡 Recommendation: Reuse ${duplicateCount} questions and only enrich the ${newCount} new ones.`);
    }
}

analyzeOverlap();
