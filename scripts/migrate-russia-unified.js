
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Generate deterministic UUID from string
 */
function stringToUUID(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    // UUID v4-like format
    return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.padEnd(12, '0').slice(0, 12)}`;
}

async function migrateRussiaQuestions() {
    const startTime = Date.now();
    console.log('[Migration] Starting Russia questions migration...');

    try {
        // 1. Fetch Russia questions
        console.log('[Migration] Fetching pdd_russia_questions...');
        const { data: russiaQuestions, error: qError } = await supabase
            .from('pdd_russia_questions')
            .select('*')
            .order('ticket_number')
            .order('question_number');

        if (qError) throw qError;
        if (!russiaQuestions?.length) {
            console.log('No questions found in pdd_russia_questions');
            return;
        }

        console.log(`[Migration] Found ${russiaQuestions.length} questions`);

        // 2. Fetch answers (paginated)
        console.log('[Migration] Fetching pdd_russia_answers...');
        let allAnswers = [];
        let page = 0;
        const PAGE_SIZE = 1000;

        while (true) {
            const { data: answers, error: aError } = await supabase
                .from('pdd_russia_answers')
                .select('*')
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (aError) throw aError;
            if (!answers || answers.length === 0) break;

            allAnswers = allAnswers.concat(answers);
            page++;
            console.log(`[Migration] Fetched answers page ${page} (${allAnswers.length} total so far)`);
        }

        // Group answers
        const answersByQuestion = new Map();
        allAnswers.forEach(a => {
            if (!answersByQuestion.has(a.question_id)) {
                answersByQuestion.set(a.question_id, []);
            }
            answersByQuestion.get(a.question_id).push(a);
        });

        // 3. Transform and insert
        const BATCH_SIZE = 50;
        let questionsInserted = 0;
        let answersInserted = 0;

        for (let i = 0; i < russiaQuestions.length; i += BATCH_SIZE) {
            const batch = russiaQuestions.slice(i, i + BATCH_SIZE);

            // Transform questions
            const unifiedQuestions = batch.map(q => ({
                id: q.id, // Keep existing ID
                country: 'ru',
                question_ru: q.question_text,
                explanation_ru: q.explanation || null,
                topic_id: null,
                metadata: {
                    ticket_number: q.ticket_number,
                    question_number: q.question_number,
                    topics: q.topics || [],
                    image_src: q.image_url || null
                },
                image_url: q.image_url || null,
                difficulty: 'medium',
                is_premium: false,
                type: 'single',
                source: 'pdd_russia_legacy',
                created_at: q.created_at,
                updated_at: new Date().toISOString()
            }));

            // Insert questions
            const { error: insError } = await supabase
                .from('questions_new')
                .upsert(unifiedQuestions, { onConflict: 'id' });

            if (insError) {
                console.error(`Error inserting questions batch ${i}:`, insError);
            } else {
                questionsInserted += batch.length;
            }

            // Transform answers
            const unifiedAnswers = [];
            batch.forEach(q => {
                const answers = answersByQuestion.get(q.id) || [];
                answers.forEach(a => {
                    unifiedAnswers.push({
                        id: a.id,
                        question_id: q.id,
                        text_ru: a.answer_text,
                        is_correct: a.is_correct,
                        position: a.position
                    });
                });
            });

            if (unifiedAnswers.length > 0) {
                const { error: ansError } = await supabase
                    .from('answer_options')
                    .upsert(unifiedAnswers, { onConflict: 'id' });

                if (ansError) {
                    console.error(`Error inserting answers batch ${i}:`, ansError);
                } else {
                    answersInserted += unifiedAnswers.length;
                }
            }

            console.log(`[Migration] Processed ${Math.min(i + BATCH_SIZE, russiaQuestions.length)}/${russiaQuestions.length}`);
        }

        console.log(`[Migration] Done! Questions: ${questionsInserted}, Answers: ${answersInserted}`);
        console.log(`[Migration] Duration: ${Date.now() - startTime}ms`);

    } catch (e) {
        console.error('[Migration] Failed:', e);
    }
}

migrateRussiaQuestions();
