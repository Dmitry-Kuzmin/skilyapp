import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mime from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
).trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

const GENERATED_DIR = path.join(__dirname, '..', 'data', 'generated-images');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function findLocalImage(questionId, imageUrl) {
    // 1. Priority: Check GENERATED images (Recursive search)
    // Structure often: topic-XX_test-YY/UUID.png
    if (fs.existsSync(GENERATED_DIR)) {
        // Fast lookup hint: try to guess folder from DB or scan? 
        // Scanning is slow. Let's try to assume folder structure or search.
        // Actually, let's just use `find` command logic or recursive walk map if needed.
        // For speed, let's assume standard structure if possible, or walk once.
        return await findInGenerated(questionId);
    }
    return null;
}

// Build a map of generated images for speed
let generatedMap = new Map(); // questionId -> absolutePath
let mapBuilt = false;

async function buildGeneratedMap() {
    if (mapBuilt) return;
    console.log('📂 Scanning generated images...');

    async function scan(dir) {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const ent of entries) {
            const fullPath = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                await scan(fullPath);
            } else if (ent.name.endsWith('.png')) {
                const id = ent.name.replace('.png', '');
                generatedMap.set(id, fullPath);
            }
        }
    }

    if (fs.existsSync(GENERATED_DIR)) {
        await scan(GENERATED_DIR);
    }
    console.log(`✅ Found ${generatedMap.size} generated images.`);
    mapBuilt = true;
}

async function run() {
    console.log('🚀 Starting Image Optimization & Upload...');

    // Build map first
    await buildGeneratedMap();

    // Fetch all questions to process
    // We process in batches of 1000
    let rangeStart = 0;
    const batchSize = 1000;
    let totalUpdated = 0;

    while (true) {
        const { data: questions, error } = await supabase
            .from('questions_new')
            .select('id, image_url')
            .range(rangeStart, rangeStart + batchSize - 1);

        if (error) {
            console.error('Error fetching questions:', error);
            break;
        }
        if (!questions || questions.length === 0) break;

        console.log(`Processing batch ${rangeStart} - ${rangeStart + questions.length}...`);

        const updates = [];

        for (const q of questions) {
            let fileToUpload = null;
            let folder = 'misc';

            // Check 1: Do we have a Generated Image? (Priority)
            if (generatedMap.has(q.id)) {
                fileToUpload = generatedMap.get(q.id);
                folder = 'generated';
            }
            // Check 2: Is it a Russia local image?
            else if (q.image_url && q.image_url.startsWith('/images/pdd_russia/')) {
                const localRel = q.image_url;
                const absPath = path.join(PUBLIC_DIR, localRel);
                if (fs.existsSync(absPath)) {
                    fileToUpload = absPath;
                    folder = 'pdd_russia';
                }
            }

            // If we found a better file, upload it
            // Only upload if current URL is NOT already a Supabase URL (to avoid re-uploading)
            // OR if we insist on overwriting (e.g. replacing source with generated)
            const isSupabaseUrl = q.image_url && q.image_url.includes('supabase.co');
            const isSourceUrl = q.image_url && (q.image_url.includes('teorica.') || q.image_url.includes('practicavial'));
            const isLocalUrl = q.image_url && q.image_url.startsWith('/');

            // Condition to upload:
            // 1. It's a generated image found on disk AND (current is source OR current is missing)
            // 2. It's a local russia image AND (current is local path)

            let shouldUpload = false;

            if (folder === 'generated') {
                // If we have a generated image, we ALWAYS want to use it, unless DB already points to it?
                // Hard to know if DB points to it without checking content. 
                // Let's assume if it is Source URL, we MUST replace.
                if (!isSupabaseUrl) shouldUpload = true;
            } else if (folder === 'pdd_russia') {
                if (isLocalUrl) shouldUpload = true;
            }

            if (shouldUpload && fileToUpload) {
                updates.push(uploadAndUpdate(q, fileToUpload, folder));
            }
        }

        // Run batch in parallel (limit concurrency)
        const results = await Promise.allLimit(updates, 10); // Custom limit helper
        totalUpdated += results.filter(Boolean).length;

        rangeStart += batchSize;
    }

    console.log(`✨ DONE. Updated ${totalUpdated} images.`);
}

// Upload Helper
async function uploadAndUpdate(q, filePath, folderBase) {
    try {
        const fileContent = fs.readFileSync(filePath);
        const contentType = mime.lookup(filePath) || 'image/png';
        const ext = path.extname(filePath);

        // Storage Path: generated/QUESTION_ID.png or pdd_russia/QUESTION_ID.jpg
        const storagePath = `${folderBase}/${q.id}${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('questions')
            .upload(storagePath, fileContent, { upsert: true, contentType });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('questions')
            .getPublicUrl(storagePath);

        // Update DB
        const { error: dbError } = await supabase
            .from('questions_new')
            .update({ image_url: publicUrl })
            .eq('id', q.id);

        if (dbError) throw dbError;

        process.stdout.write(folderBase === 'generated' ? '✨' : '🇷🇺');
        return true;

    } catch (e) {
        console.error(`\n❌ Failed ${q.id}: ${e.message}`);
        return false;
    }
}

// Concurrency Helper
Promise.allLimit = async (collection, limit) => {
    const results = [];
    const executing = [];
    for (const item of collection) {
        const p = Promise.resolve().then(() => item);
        results.push(p);
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
};

run();
