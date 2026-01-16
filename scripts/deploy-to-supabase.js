
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

const PARSED_DIR = path.resolve(__dirname, '../data/parsed');
const GENERATED_IMAGES_DIR = path.resolve(__dirname, '../data/optimized-images');
const BUCKET_NAME = 'dgt-images';

async function main() {
    console.log('🚀 Starting deployment to Supabase...');

    // 1. Confirm Deletion
    console.log('⚠️  WARNING: This will DELETE all existing Spanish questions from the database!');
    // In automated env, we assume yes if --yes passed.
    const args = process.argv.slice(2);
    if (!args.includes('--yes')) {
        console.log('Please run with --yes to confirm.');
        process.exit(1);
    }

    console.log('🗑️  Deleting old data...');
    // We filter by country = 'es' to avoid deleting other data if any
    const { error: deleteError } = await supabase
        .from('questions_new')
        .delete()
        .eq('country', 'es');

    if (deleteError) {
        console.error('❌ Error deleting old questions:', deleteError.message);
        process.exit(1);
    }
    console.log('✅ Old data deleted.');

    // 2. Get Topics Map
    console.log('📚 Fetching topics...');
    const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, number');

    if (topicsError) {
        console.error('❌ Error fetching topics:', topicsError.message);
        process.exit(1);
    }

    const topicMap = new Map(); // topic_number -> uuid
    topics.forEach(t => topicMap.set(t.number, t.id));
    console.log(`✅ Loaded ${topics.length} topics.`);

    // 3. Scan for Enriched Files
    console.log('📂 Scanning for files...');
    const topicDirs = await fs.readdir(PARSED_DIR);

    for (const topicDir of topicDirs) {
        if (!topicDir.startsWith('topic-')) continue;

        const topicNum = parseInt(topicDir.replace('topic-', ''), 10);
        const topicId = topicMap.get(topicNum);

        if (!topicId) {
            console.warn(`⚠️  Topic ${topicNum} not found in DB. Skipping folder ${topicDir}.`);
            continue;
        }

        const fullTopicPath = path.join(PARSED_DIR, topicDir);
        const files = await fs.readdir(fullTopicPath);

        for (const file of files) {
            if (!file.endsWith('-enriched.json')) continue;

            // Check filter argument
            const filterArg = args.find(a => !a.startsWith('--'));
            if (filterArg && !file.includes(filterArg)) {
                continue;
            }

            console.log(`\n📄 Processing ${file}...`);
            const filePath = path.join(fullTopicPath, file);
            const content = await fs.readFile(filePath, 'utf8');
            const questions = JSON.parse(content);

            // Extract testId from filename: topic-01_test-001-enriched.json -> topic-01_test-001
            const testId = file.replace('-enriched.json', '');

            for (const q of questions) {
                if (!q.external_id) {
                    console.warn('⚠️  Skipping question without external_id');
                    continue;
                }

                // 4. Upload Image (Optimized)
                let finalImageUrl = q.image_url; // Default to original
                const imagePath = path.join(GENERATED_IMAGES_DIR, testId, `${q.external_id}.webp`);

                let imageBuffer = null;
                try {
                    imageBuffer = await fs.readFile(imagePath);
                } catch (e) {
                    // Try PNG as fallback? No, let's stick to strict optimization pipeline
                }

                if (imageBuffer) {
                    const storagePath = `generated/${testId}/${q.external_id}.webp`;
                    const { error: uploadError } = await supabase.storage
                        .from(BUCKET_NAME)
                        .upload(storagePath, imageBuffer, {
                            contentType: 'image/webp',
                            upsert: true
                        });

                    if (uploadError) {
                        console.error(`   ❌ Failed to upload image ${q.external_id}: ${uploadError.message}`);
                    } else {
                        const { data: publicUrlData } = supabase.storage
                            .from(BUCKET_NAME)
                            .getPublicUrl(storagePath);
                        // Add cache bust param
                        finalImageUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
                    }
                }

                // 5. Insert Question
                const questionData = {
                    id: q.external_id, // Use external_id as ID if valid UUID, otherwise let DB generate?
                    // Assuming external_id IS valid UUID.
                    question_es: q.question?.es || null,
                    question_ru: q.question?.ru || null,
                    // question_en: q.question?.en || null,
                    explanation_es: q.explanation?.es || null,
                    explanation_ru: q.explanation?.ru || null,
                    // explanation_en: q.explanation?.en || null,
                    image_url: finalImageUrl,
                    topic_id: topicId,
                    type: 'single', // Fixed enum value
                    difficulty: 'easy', // Default
                    country: 'es',
                    source: 'practicavial',
                    source_id: q.external_id,
                    metadata: {
                        original_image: q.image_url,
                        schema_url: q.schema_url,
                        test_id: testId,
                        question_number: q.question_number
                    }
                };

                // Note: IF q.external_id is NOT a UUID, this will fail if ID is UUID type.
                // Practicavial IDs are UUIDs, so we are good.

                const { error: upsertError } = await supabase
                    .from('questions_new')
                    .upsert(questionData, { onConflict: 'id' });

                if (upsertError) {
                    console.error(`   ❌ Failed to insert question ${q.external_id}: ${upsertError.message}`);
                    continue; // Skip answers if question failed
                }

                // 6. Insert Answers
                // Delete existing options first?
                await supabase.from('answer_options').delete().eq('question_id', q.external_id);

                const answersData = q.answers.map(ans => ({
                    question_id: q.external_id,
                    text_es: ans.text?.es || '',
                    text_ru: ans.text?.ru || '',
                    // text_en: ans.text?.en || '',
                    is_correct: ans.is_correct
                }));

                const { error: ansError } = await supabase
                    .from('answer_options')
                    .insert(answersData);

                if (ansError) {
                    console.error(`   ❌ Failed to insert answers for ${q.external_id}: ${ansError.message}`);
                }
            }
            console.log(`✅ Processed ${questions.length} questions from ${file}`);
        }
    }

    console.log('\n🎉 Deployment complete!');
}

main().catch(console.error);
