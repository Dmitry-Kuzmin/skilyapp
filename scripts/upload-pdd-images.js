import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mime from 'mime-types'; // Needed for content-type, or just use 'image/jpeg'

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

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function uploadImages() {
    console.log('🚀 Starting PDD Russia Image Upload...');

    // 1. Fetch questions that need upload
    const { data: questions, error } = await supabase
        .from('questions_new')
        .select('id, image_url')
        .like('image_url', '/images/pdd_russia/%');

    if (error) {
        console.error('❌ Error fetching questions:', error);
        return;
    }

    console.log(`📂 Found ${questions.length} questions with local images needing upload.`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const q of questions) {
        const localPathRel = q.image_url; // e.g. /images/pdd_russia/A_B/123.jpg
        const localPathAbs = path.join(PUBLIC_DIR, localPathRel);

        if (!fs.existsSync(localPathAbs)) {
            console.warn(`   ⚠️ File not found: ${localPathAbs}`);
            failCount++;
            continue;
        }

        try {
            const fileBuffer = fs.readFileSync(localPathAbs);
            // Storage path: pdd_russia/filename
            // Or keep structure: pdd_russia/A_B/filename
            const storagePath = localPathRel.replace('/images/', ''); // removes leading /images/ -> pdd_russia/A_B/xyz.jpg
            const contentType = mime.lookup(localPathAbs) || 'image/jpeg';

            // Upload
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('questions')
                .upload(storagePath, fileBuffer, {
                    contentType: contentType,
                    upsert: true
                });

            if (uploadError) {
                console.error(`   ❌ Upload failed for ${q.id}: ${uploadError.message}`);
                failCount++;
                continue;
            }

            // Get Public URL
            const { data: urlData } = supabase.storage
                .from('questions')
                .getPublicUrl(storagePath);

            const publicUrl = urlData.publicUrl;

            // Update DB
            const { error: updateError } = await supabase
                .from('questions_new')
                .update({ image_url: publicUrl })
                .eq('id', q.id);

            if (updateError) {
                console.error(`   ❌ DB Update failed for ${q.id}: ${updateError.message}`);
                failCount++;
            } else {
                successCount++;
                process.stdout.write('.');
            }

        } catch (e) {
            console.error(`   ❌ Exception for ${q.id}:`, e.message);
            failCount++;
        }
    }

    console.log('\n\n========================================');
    console.log('✅ UPLOAD COMPLETED');
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

uploadImages();
