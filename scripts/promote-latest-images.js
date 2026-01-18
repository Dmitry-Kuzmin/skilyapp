import fs from 'fs/promises';
import path from 'path';

const TOPICS_DIR = './data/generated-images';

async function promoteImages(testId) {
    const testDir = path.join(TOPICS_DIR, testId);

    try {
        await fs.access(testDir);
    } catch (e) {
        console.error(`❌ Directory not found: ${testDir}`);
        return;
    }

    const files = await fs.readdir(testDir);
    const candidates = files.filter(f => f.includes('_') && f.endsWith('.png') && !f.endsWith('_original.png'));

    // Group by UUID
    const groups = {};
    candidates.forEach(f => {
        // format: uuid_timestamp.png
        const parts = f.split('_');
        const timestampPart = parts.pop().replace('.png', '');
        const uuid = parts.join('_'); // Rejoin in case uuid has underscores (unlikely for UUID)

        if (!groups[uuid]) groups[uuid] = [];
        groups[uuid].push({ file: f, ts: parseInt(timestampPart) });
    });

    let promotedCount = 0;

    for (const uuid in groups) {
        // Sort by timestamp desc (newest first)
        groups[uuid].sort((a, b) => b.ts - a.ts);
        const latest = groups[uuid][0];

        const srcPath = path.join(testDir, latest.file);
        const destPath = path.join(testDir, `${uuid}.png`);

        await fs.copyFile(srcPath, destPath);
        promotedCount++;
    }

    console.log(`✅ [${testId}] Promoted ${promotedCount} latest images to production (UUID.png)`);
}

const targetTest = process.argv[2];

if (!targetTest) {
    console.log("Usage: node scripts/promote-latest-images.js <test_id>");
    console.log("Example: node scripts/promote-latest-images.js topic-01_test-005");
} else {
    promoteImages(targetTest);
}
