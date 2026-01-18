import fs from 'fs/promises';
import path from 'path';

async function restore() {
    console.log("🚑 Starting Emergency Restore Protocols...");

    // 1. Delete Enrichment Cache (source of corrupt data)
    try {
        await fs.unlink('data/enrichment-cache.json');
        console.log("✅ Cache cleared (it contained broken translations).");
    } catch (e) { }

    // 2. Identify and delete broken enriched files
    const root = 'data/parsed';
    const topics = ['topic-01', 'topic-02'];
    let deletedCount = 0;

    for (const t of topics) {
        const dir = path.join(root, t);
        try {
            const files = await fs.readdir(dir).catch(() => []);
            for (const file of files) {
                if (!file.endsWith('-enriched.json')) continue;

                const filePath = path.join(dir, file);
                const content = await fs.readFile(filePath, 'utf8');
                let json;
                try { json = JSON.parse(content); } catch (e) { continue; }

                // Robust check: check ratio of null RU fields
                let nullCount = 0;
                let total = json.length;
                for (const q of json) {
                    if (!q.question || !q.question.ru) nullCount++;
                }

                // If more than 50% are missing translations, consider it broken
                if (total > 0 && (nullCount / total) > 0.5) {
                    console.log(`🗑 Deleting broken file: ${file} (${nullCount}/${total} empty)`);
                    await fs.unlink(filePath);
                    deletedCount++;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    console.log(`\n✅ Diagnosis complete. ${deletedCount} files deleted and prepared for regeneration.`);
}

restore();
