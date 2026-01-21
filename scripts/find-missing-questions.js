import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const topic = 'topic-04';
const test = 'test-004';
const jsonPath = path.join(__dirname, `../data/parsed/${topic}/${topic}_${test}-enriched.json`);

async function findMissing() {
  console.log(`🔍 Analyxing missing questions for ${topic} ${test}...`);

  // 1. Read JSON
  let questions = [];
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    questions = JSON.parse(content);
    console.log(`📄 Found ${questions.length} questions in local file.`);
  } catch (e) {
    console.error(`❌ Could not read file: ${e.message}`);
    process.exit(1);
  }

  // 2. Extract IDs
  const expectedIds = questions.map(q => q.external_id || q.id);
  console.log('🆔 Extracted IDs from file:', expectedIds.length);

  // 3. Query Supabase
  // We fetch ALL questions for this topic to be sure
  const { data: dbQuestions, error } = await supabase
    .from('questions_new')
    .select('id, metadata')
    .eq('topic_id', '44257cca-462b-494c-8798-73bfab638b8a'); // Topic 04 ID from your logs

  if (error) {
    console.error('❌ DB Error:', error);
    return;
  }

  console.log(`🗄️  Total questions in DB for Topic 4: ${dbQuestions.length}`);

  const dbIds = new Set(dbQuestions.map(q => q.id));

  // 4. Compare
  const missing = questions.filter(q => !dbIds.has(q.external_id || q.id));

  if (missing.length === 0) {
    console.log('✅ All questions from file are present in DB!');

    // Check for duplicates in DB just in case
    if (dbQuestions.length < questions.length + 90) { // 30+30+30+26 = 116
      console.warn(`⚠️  Wait. DB Count ${dbQuestions.length} != 116. But all local IDs are present.`);
      console.warn(`   This implies questions from OTHER tests (001, 002, 003) might be missing or overwritten.`);
    }
  } else {
    console.log(`❌ FOUND ${missing.length} MISSING QUESTIONS:`);
    missing.forEach(q => {
      console.log(`   - [${q.question_number}] ID: ${q.external_id || q.id}`);
      console.log(`     Text: ${q.question.es.substring(0, 50)}...`);
    });
  }

  // Check if missing IDs exist in DB but under DIFFERENT Topic?
  // Or check if IDs from Test 4 collide with IDs from Test 3 in DB?

}

findMissing();
