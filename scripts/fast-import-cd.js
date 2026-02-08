import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fastImportCD() {
    console.log('🚀 Быстрый импорт категории C/D...');

    const repoPath = '/tmp/pdd_russia';
    const ticketsPath = join(repoPath, 'questions/C_D/tickets');

    const files = readdirSync(ticketsPath).filter(f => f.endsWith('.json'));
    const allQuestions = [];
    const allAnswers = [];

    for (const file of files) {
        const content = readFileSync(join(ticketsPath, file), 'utf-8');
        const questions = JSON.parse(content);

        const ticketMatch = file.match(/\d+/);
        const ticketNum = ticketMatch ? parseInt(ticketMatch[0]) : null;
        if (!ticketNum) continue;

        for (const qData of questions) {
            const questionMatch = qData.title?.match(/\d+/);
            const questionNum = questionMatch ? parseInt(questionMatch[0]) : null;
            if (!questionNum) continue;

            const questionId = uuidv4();

            const metadata = {
                ticket_category: 'C_D',
                original_ticket_number: ticketNum,
                ticket_number: ticketNum + 100,
                question_number: questionNum,
                topics: Array.isArray(qData.topic) ? qData.topic : [qData.topic],
                image_src: qData.image || null,
                explanation: qData.answer_tip || null
            };

            allQuestions.push({
                id: questionId,
                country: 'russia',
                question_ru: qData.question,
                explanation_ru: qData.answer_tip || null,
                metadata: metadata,
                image_url: qData.image ? `https://raw.githubusercontent.com/etspring/pdd_russia/master/${qData.image.replace(/^\.\//, '')}` : null,
                difficulty: 'medium',
                type: 'single',
                source: 'pdd_russia_c_d',
                updated_at: new Date().toISOString()
            });

            if (qData.answers && Array.isArray(qData.answers)) {
                qData.answers.forEach((a, idx) => {
                    allAnswers.push({
                        question_id: questionId,
                        text_ru: a.answer_text || a.text || '',
                        is_correct: a.is_correct || false,
                        position: idx + 1
                    });
                });
            }
        }
    }

    console.log(`📦 Подготовл��но ${allQuestions.length} вопросов и ${allAnswers.length} ответов`);

    // Батч-вставка вопросов (порциями по 100)
    for (let i = 0; i < allQuestions.length; i += 100) {
        const batch = allQuestions.slice(i, i + 100);
        const { error } = await supabase.from('questions_new').insert(batch);
        if (error) console.error(`Ошибка на батче ${i}:`, error.message);
        else console.log(`✅ Залито вопросов ${i + 1}-${Math.min(i + 100, allQuestions.length)}`);
    }

    // Батч-вставка ответов
    for (let i = 0; i < allAnswers.length; i += 500) {
        const batch = allAnswers.slice(i, i + 500);
        const { error } = await supabase.from('answer_options').insert(batch);
        if (error) console.error(`Ошибка на батче ответов ${i}:`, error.message);
    }

    console.log('✨ Импорт C/D завершён!');
}

fastImportCD().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
