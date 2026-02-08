
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadImageToStorage(imagePath, repoPath) {
    try {
        if (!existsSync(imagePath)) {
            console.warn(`⚠️  Image not found: ${imagePath}`);
            return null;
        }

        const fileBuffer = readFileSync(imagePath);
        const fileName = basename(imagePath);
        const fileExt = extname(fileName).toLowerCase();

        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif'
        };

        const contentType = mimeTypes[fileExt] || 'image/jpeg';

        // Use C_D folder in storage
        const relativePath = imagePath.replace(repoPath, '').replace(/^[/\\]/, '');
        const storagePath = relativePath.replace(/\\/g, '/');

        const { data, error } = await supabase.storage
            .from('pdd_russia')
            .upload(storagePath, fileBuffer, {
                contentType,
                upsert: true,
                cacheControl: '3600',
            });

        if (error && !error.message?.includes('already exists')) {
            console.error(`❌ Error uploading image ${imagePath}:`, error.message);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('pdd_russia')
            .getPublicUrl(storagePath);

        return publicUrl;
    } catch (error) {
        console.error(`❌ Exception uploading image ${imagePath}:`, error.message);
        return null;
    }
}

async function importQuestion(questionData, repoPath) {
    try {
        const ticketMatch = questionData.ticket_number?.match(/\d+/);
        const ticketNumber = ticketMatch ? parseInt(ticketMatch[0]) : null;

        const questionMatch = questionData.title?.match(/\d+/);
        const questionNumber = questionMatch ? parseInt(questionMatch[0]) : null;

        if (!ticketNumber || !questionNumber) {
            console.warn(`⚠️  Skipped question without ticket/question number:`, questionData.title);
            return;
        }

        let imageUrl = null;
        if (questionData.image) {
            let imagePath;
            if (questionData.image.startsWith('./')) {
                // Fix path resolution
                imagePath = join(repoPath, questionData.image.replace(/^\.\//, ''));
            } else {
                imagePath = join(repoPath, questionData.image);
            }
            imageUrl = await uploadImageToStorage(imagePath, repoPath);
        }

        // Check existing in questions_new
        const { data: existing } = await supabase
            .from('questions_new')
            .select('id')
            .eq('country', 'ru')
            .contains('metadata', { ticket_number: ticketNumber, question_number: questionNumber, ticket_category: 'C_D' })
            .maybeSingle();

        if (existing) {
            console.log(`ℹ️  Question ${ticketNumber}-${questionNumber} (C_D) already exists in Unified Schema.`);
            return existing.id;
        }

        const questionId = uuidv4();

        // INSERT INTO questions_new
        const { error: newSchemaError } = await supabase
            .from('questions_new')
            .insert({
                id: questionId,
                country: 'ru',
                // category_id removed
                topic_id: null,
                is_premium: false,
                question_ru: questionData.question,
                explanation_ru: questionData.answer_tip || null,
                metadata: {
                    ticket_number: ticketNumber + 100, // Offset for C/D
                    original_ticket_number: ticketNumber,
                    question_number: questionNumber,
                    topics: Array.isArray(questionData.topic) ? questionData.topic : [questionData.topic],
                    image_src: imageUrl,
                    ticket_category: 'C_D'
                },
                image_url: imageUrl,
                difficulty: 'medium',
                type: 'single',
                source: 'pdd_russia_cd',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (newSchemaError) {
            console.error(`❌ Error inserting into questions_new:`, newSchemaError);
            return null;
        }

        // Answers for questions_new
        if (questionData.answers && Array.isArray(questionData.answers)) {
            const unifiedAnswers = questionData.answers.map((answer, index) => ({
                question_id: questionId,
                text_ru: answer.answer_text || answer.text || '',
                is_correct: answer.is_correct || false,
                position: index + 1
            }));

            const { error: ansError } = await supabase.from('answer_options').insert(unifiedAnswers);
            if (ansError) console.error(`❌ Error inserting answers:`, ansError);
        }

        console.log(`✅ Imported C_D (Unified): Ticket ${ticketNumber}, Question ${questionNumber}`);
        return questionId;
    } catch (error) {
        console.error(`❌ Exception importing question:`, error);
        return null;
    }
}

async function main() {
    const repoPath = process.argv[2];
    if (!repoPath) {
        console.error("Repo path required");
        process.exit(1);
    }

    const ticketsPath = join(repoPath, 'questions/C_D/tickets');
    console.log(`🚀 Importing C/D tickets from ${ticketsPath}...`);

    const files = readdirSync(ticketsPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const content = readFileSync(join(ticketsPath, file), 'utf-8');
        const questions = JSON.parse(content);

        for (const q of questions) {
            await importQuestion(q, repoPath);
        }
    }

    console.log('✨ C/D Import Complete!');
}

main().catch(console.error);
