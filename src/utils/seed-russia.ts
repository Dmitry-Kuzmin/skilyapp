/**
 * Migration Script: pdd_russia_questions -> questions_new (Unified Schema)
 * 
 * This script copies Russian questions from the legacy tables
 * (pdd_russia_questions, pdd_russia_answers) to the unified schema
 * (questions_new, answer_options).
 * 
 * RUN ONCE via Supabase SQL Editor or Edge Function.
 */

import { supabase } from '@/integrations/supabase/client';

interface RussiaQuestion {
    id: string;
    ticket_number: number;
    question_number: number;
    text: string;
    image_url?: string;
    topics?: string[];
    explanation?: string;
    hint?: string;
    created_at: string;
}

interface RussiaAnswer {
    id: string;
    question_id: string;
    text: string;
    is_correct: boolean;
    position: number;
}

interface MigrationResult {
    success: boolean;
    questionsInserted: number;
    answersInserted: number;
    errors: string[];
    duration: number;
}

/**
 * Generate deterministic UUID from string (for idempotent migrations)
 */
function stringToUUID(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    // Convert to UUID format (v4-like, but deterministic)
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.padEnd(12, '0').slice(0, 12)}`;
}

/**
 * Migrate Russian questions to unified schema
 */
export async function migrateRussiaQuestions(): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let questionsInserted = 0;
    let answersInserted = 0;

    console.log('[Migration] Starting Russia questions migration...');

    try {
        // Step 1: Fetch all Russia questions
        console.log('[Migration] Fetching pdd_russia_questions...');
        const { data: russiaQuestions, error: questionsError } = await supabase
            .from('pdd_russia_questions')
            .select('*')
            .order('ticket_number', { ascending: true })
            .order('question_number', { ascending: true });

        if (questionsError) throw questionsError;
        if (!russiaQuestions || russiaQuestions.length === 0) {
            return {
                success: true,
                questionsInserted: 0,
                answersInserted: 0,
                errors: ['No Russia questions found in source table'],
                duration: Date.now() - startTime,
            };
        }

        console.log(`[Migration] Found ${russiaQuestions.length} questions`);

        // Step 2: Fetch all Russia answers
        console.log('[Migration] Fetching pdd_russia_answers...');
        const { data: russiaAnswers, error: answersError } = await supabase
            .from('pdd_russia_answers')
            .select('*')
            .order('question_id', { ascending: true })
            .order('position', { ascending: true });

        if (answersError) throw answersError;

        // Group answers by question_id
        const answersByQuestion = new Map<string, RussiaAnswer[]>();
        russiaAnswers?.forEach((answer) => {
            const existing = answersByQuestion.get(answer.question_id) || [];
            existing.push(answer as RussiaAnswer);
            answersByQuestion.set(answer.question_id, existing);
        });

        console.log(`[Migration] Found ${russiaAnswers?.length || 0} answers`);

        // Step 3: Transform and insert into questions_new
        const BATCH_SIZE = 100;

        for (let i = 0; i < russiaQuestions.length; i += BATCH_SIZE) {
            const batch = russiaQuestions.slice(i, i + BATCH_SIZE);

            // Transform questions to unified format
            const unifiedQuestions = batch.map((q: RussiaQuestion) => ({
                // Use original ID to enable updates on re-run
                id: q.id,
                // Country tag
                country: 'ru',
                // Russian text only (other languages are NULL)
                question_ru: q.text,
                question_es: null,
                question_en: null,
                explanation_ru: q.explanation || null,
                explanation_es: null,
                explanation_en: null,
                // No Spanish topics
                topic_id: null,
                // Metadata for Russia-specific fields
                metadata: {
                    ticket_number: q.ticket_number,
                    question_number: q.question_number,
                    topics: q.topics || [],
                    hint: q.hint || null,
                    image_src: q.image_url || null,
                },
                // Optional fields
                image_url: q.image_url || null,
                difficulty: 'medium' as const,
                is_premium: false,
                type: 'single' as const,
                source: 'pdd_russia_legacy',
                created_at: q.created_at,
                updated_at: new Date().toISOString(),
            }));

            // Upsert questions (idempotent)
            const { error: insertError } = await supabase
                .from('questions_new')
                .upsert(unifiedQuestions, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });

            if (insertError) {
                console.error(`[Migration] Error inserting batch ${i / BATCH_SIZE}:`, insertError);
                errors.push(`Batch ${i / BATCH_SIZE}: ${insertError.message}`);
            } else {
                questionsInserted += batch.length;
            }

            // Transform and insert answers
            const unifiedAnswers: Array<{
                id: string;
                question_id: string;
                text_ru: string;
                text_es: string | null;
                text_en: string | null;
                is_correct: boolean;
                position: number;
            }> = [];

            batch.forEach((q: RussiaQuestion) => {
                const answers = answersByQuestion.get(q.id) || [];
                answers.forEach((a) => {
                    unifiedAnswers.push({
                        id: a.id, // Keep original ID
                        question_id: q.id,
                        text_ru: a.text,
                        text_es: null,
                        text_en: null,
                        is_correct: a.is_correct,
                        position: a.position,
                    });
                });
            });

            if (unifiedAnswers.length > 0) {
                const { error: answersInsertError } = await supabase
                    .from('answer_options')
                    .upsert(unifiedAnswers, {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });

                if (answersInsertError) {
                    console.error(`[Migration] Error inserting answers batch:`, answersInsertError);
                    errors.push(`Answers batch ${i / BATCH_SIZE}: ${answersInsertError.message}`);
                } else {
                    answersInserted += unifiedAnswers.length;
                }
            }

            console.log(`[Migration] Progress: ${Math.min(i + BATCH_SIZE, russiaQuestions.length)}/${russiaQuestions.length} questions`);
        }

        const duration = Date.now() - startTime;
        console.log(`[Migration] ✅ Completed in ${duration}ms`);
        console.log(`[Migration] Questions: ${questionsInserted}, Answers: ${answersInserted}`);

        return {
            success: errors.length === 0,
            questionsInserted,
            answersInserted,
            errors,
            duration,
        };
    } catch (error: any) {
        console.error('[Migration] ❌ Failed:', error);
        return {
            success: false,
            questionsInserted,
            answersInserted,
            errors: [error.message || 'Unknown error'],
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Verify migration by counting questions
 */
export async function verifyMigration(): Promise<{
    legacy: number;
    unified: number;
    match: boolean;
}> {
    const [legacyResult, unifiedResult] = await Promise.all([
        supabase.from('pdd_russia_questions').select('*', { count: 'exact', head: true }),
        supabase.from('questions_new').select('*', { count: 'exact', head: true }).eq('country', 'ru'),
    ]);

    const legacy = legacyResult.count || 0;
    const unified = unifiedResult.count || 0;

    return {
        legacy,
        unified,
        match: legacy === unified,
    };
}

/**
 * Export for console usage:
 * 
 * import { migrateRussiaQuestions, verifyMigration } from '@/utils/seed-russia';
 * 
 * // Run migration
 * const result = await migrateRussiaQuestions();
 * console.log(result);
 * 
 * // Verify
 * const verification = await verifyMigration();
 * console.log(verification);
 */
