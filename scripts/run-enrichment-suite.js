
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

// Helper to check if file exists
async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function runScript(scriptPath, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [scriptPath, ...args], { stdio: 'inherit' });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Script exited with code ${code}`));
        });
    });
}

async function main() {
    const baseDir = path.resolve('data/parsed');
    const topics = await fs.readdir(baseDir);
    const scriptToRun = path.resolve('scripts/enrich-batch-v2.js');

    let processedCount = 0;
    const pendingFiles = [];

    // 1. Discovery Phase
    console.log("🔍 Scanning for unenriched tests...");
    for (const topic of topics) {
        if (!topic.startsWith('topic-')) continue;

        const topicDir = path.join(baseDir, topic);
        const files = await fs.readdir(topicDir);

        const baseFiles = files.filter(f =>
            f.endsWith('.json') &&
            !f.includes('-enriched') &&
            !f.includes('.backup')
        );

        for (const file of baseFiles) {
            const fullPath = path.join(topicDir, file);
            const enrichedName = file.replace('.json', '-enriched.json');
            const enrichedPath = path.join(topicDir, enrichedName);

            if (!(await exists(enrichedPath))) {
                pendingFiles.push(fullPath);
            }
        }
    }

    console.log(`📋 Found ${pendingFiles.length} files pending enrichment.`);

    if (pendingFiles.length === 0) {
        console.log("🎉 All done! No files to process.");
        return;
    }

    // 2. Execution Phase
    console.log("🚀 Starting batch enrichment...\n");

    for (const file of pendingFiles) {
        processedCount++;
        const fileName = path.basename(file);
        console.log(`\n======================================================`);
        console.log(`📦 Processing File ${processedCount}/${pendingFiles.length}: ${fileName}`);
        console.log(`======================================================`);

        try {
            await runScript(scriptToRun, [file]);
            console.log(`✅ Success: ${fileName}`);
        } catch (e) {
            console.error(`❌ Failed processing ${fileName}: ${e.message}`);
            // We continue to the next one instead of dying
        }

        // Cool down slightly
        await new Promise(r => setTimeout(r, 2000));
    }
}

main().catch(console.error);
