import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedDir = path.resolve(__dirname, '../data/parsed');

function checkStatus() {
    const topics = fs.readdirSync(parsedDir).filter(f => f.startsWith('topic-'));

    let totalTests = 0;
    let enrichedTests = 0;
    const pending = {};

    topics.forEach(topic => {
        const topicPath = path.join(parsedDir, topic);
        if (!fs.statSync(topicPath).isDirectory()) return;

        const files = fs.readdirSync(topicPath);
        const testFiles = files.filter(f => f.match(/topic-\d+_test-\d+\.json$/));

        testFiles.forEach(testFile => {
            totalTests++;
            const enrichedFile = testFile.replace('.json', '-enriched.json');
            if (files.includes(enrichedFile)) {
                enrichedTests++;
            } else {
                if (!pending[topic]) pending[topic] = [];
                pending[topic].push(testFile);
            }
        });
    });

    console.log(`📊 **Enrichment Status Report**`);
    console.log(`--------------------------------`);
    console.log(`Total Topic Tests: ${totalTests}`);
    console.log(`Enriched: ${enrichedTests}`);
    console.log(`Pending: ${totalTests - enrichedTests}`);
    console.log(`--------------------------------`);

    if (Object.keys(pending).length === 0) {
        console.log("🎉 All topic tests are enriched!");
    } else {
        console.log("⏳ **Pending Tests by Topic:**");
        Object.keys(pending).sort().forEach(topic => {
            // Sort files naturally
            const sortedFiles = pending[topic].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            const files = sortedFiles.map(f => f.replace('.json', '').replace(topic + '_', '')).join(', ');
            console.log(`- **${topic}**: ${pending[topic].length} tests pending ([${files}])`);
        });
    }
}

checkStatus();
