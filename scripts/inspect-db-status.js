import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Keys missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('🔍 Inspecting Database Status...\n');

    // 1. Count
    const { count: qCount, error: qError } = await supabase
        .from('questions_new')
        .select('*', { count: 'exact', head: true });

    if (qError) console.error('Error counting questions:', qError);
    console.log(`📊 Total Questions: ${qCount}`);

    // 2. Count Answers
    const { count: aCount } = await supabase
        .from('answer_options')
        .select('*', { count: 'exact', head: true });
    console.log(`📊 Total Answers: ${aCount}`);

    if (qCount > 0) {
        // 3. Samples
        const { data: samples, error: sampleError } = await supabase
            .from('questions_new')
            .select('id, topic_id, image_url, question_ru, source, metadata')
            .limit(3);

        if (sampleError) {
            console.error('Error fetching samples:', sampleError);
        } else if (samples) {
            console.log('\n📝 Sample Questions:');
            samples.forEach((q, i) => {
                console.log(`\n--- Question #${i + 1} ---`);
                console.log(`ID: ${q.id}`);
                console.log(`Source: ${q.source}`);
                console.log(`Image URL: ${q.image_url}`);
                const ru = q.question_ru || 'No RU';
                console.log(`Text: ${ru.substring(0, 50)}...`);
            });
        }

        // 4. Stats
        const { count: localImages } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).like('image_url', '/%');
        const { count: cloudImages } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).ilike('image_url', 'http%');
        const { count: supabaseImages } = await supabase.from('questions_new').select('*', { count: 'exact', head: true }).ilike('image_url', '%supabase.co%');

        console.log('\n🖼️  Image Stats:');
        console.log(`   Local Paths: ${localImages}`);
        console.log(`   Cloud URLs (Total): ${cloudImages}`);
        console.log(`   Supabase URLs: ${supabaseImages}`);
        console.log(`   External URLs (Teorica...): ${cloudImages - supabaseImages}`);
    }
}

inspect();
