
import fs from 'fs/promises';
import path from 'path';

// Helper to check if file exists
async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function scan() {
    const baseDir = path.resolve('data/parsed');
    const topics = await fs.readdir(baseDir);

    let totalPending = 0;
    const pendingFiles = [];

    for (const topic of topics) {
        if (!topic.startsWith('topic-')) continue;

        const topicDir = path.join(baseDir, topic);
        const files = await fs.readdir(topicDir);

        // Filter for base JSONs (not enriched, not backups)
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
                // Check question count
                const content = JSON.parse(await fs.readFile(fullPath, 'utf8'));
                if (content.length === 30) {
                    pendingFiles.push({ path: fullPath, count: content.length });
                    totalPending++;
                } else {
                    console.log(`⚠️ Skipping ${file} due to non-standard count: ${content.length}`);
                }
            }
        }
    }

    console.log(`\nFound ${totalPending} pending files for enrichment (standard 30q):`);
    pendingFiles.forEach(f => console.log(`- ${path.basename(f.path)}`));
}

scan().catch(console.error);
