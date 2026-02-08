import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getHash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

async function importCategory(categoryCode, folderName) {
    console.log(`\n🚀 Начинаю импорт категории ${categoryCode}...`);

    const repoPath = '/tmp/pdd_russia';
    const ticketsPath = join(repoPath, `questions/${folderName}/tickets`);

    if (!existsSync(ticketsPath)) {
        console.error(`❌ Путь не найден: ${ticketsPath}`);
        return;
    }

    const files = readdirSync(ticketsPath).filter(f => f.endsWith('.json'));
    let totalImported = 0;

    for (const file of files) {
        const content = readFileSync(join(ticketsPath, file), 'utf-8');
        const questions = JSON.parse(content);

        const ticketMatch = file.match(/\d+/);
        const ticketNum = ticketMatch ? parseInt(ticketMatch[0]) : null;

        for (const qData of questions) {
            const questionMatch = qData.title?.match(/\d+/);
            const questionNum = questionMatch ? parseInt(questionMatch[0]) : null;

            if (!ticketNum || !questionNum) continue;

            // Генерируем уникальный source_id на основе текста и ответов
            const answersStr = qData.answers?.map(a => a.answer_text || a.text).join('') || '';
            const sourceId = getHash(`${qData.question}-${answersStr}-${categoryCode}`);

            // Проверяем существование
            const { data: existing } = await supabase
                .from('questions_new')
                .select('id')
                .eq('country', 'russia')
                .contains('metadata', {
                    ticket_category: categoryCode,
                    original_ticket_number: ticketNum,
                    question_number: questionNum
                })
                .maybeSingle();

            const questionId = existing?.id || uuidv4();

            const metadata = {
                ticket_category: categoryCode,
                original_ticket_number: ticketNum,
                ticket_number: categoryCode === 'C_D' ? ticketNum + 100 : ticketNum,
                question_number: questionNum,
                topics: Array.isArray(qData.topic) ? qData.topic : [qData.topic],
                image_src: qData.image || null,
                explanation: qData.answer_tip || null
            };

            const questionRow = {
                id: questionId,
                country: 'russia',
                question_ru: qData.question,
                explanation_ru: qData.answer_tip || null,
                metadata: metadata,
                image_url: qData.image ? `https://raw.githubusercontent.com/etspring/pdd_russia/master/${qData.image.replace(/^\.\//, '')}` : null,
                difficulty: 'medium',
                type: 'single',
                source: `pdd_russia_${categoryCode.toLowerCase()}`,
                updated_at: new Date().toISOString()
            };

            const { error: qError } = await supabase
                .from('questions_new')
                .upsert(questionRow);

            if (qError) {
                console.error(`❌ Ошибка вопроса ${ticketNum}-${questionNum}:`, qError.message);
                continue;
            }

            // Ответы
            if (qData.answers && Array.isArray(qData.answers)) {
                // Удаляем старые ответы перед вставкой (для чистоты при upsert)
                await supabase.from('answer_options').delete().eq('question_id', questionId);

                const answers = qData.answers.map((a, idx) => ({
                    question_id: questionId,
                    text_ru: a.answer_text || a.text || '',
                    is_correct: a.is_correct || false,
                    position: idx + 1
                }));

                const { error: aError } = await supabase.from('answer_options').insert(answers);
                if (aError) console.error(`❌ Ошибка ответов ${ticketNum}-${questionNum}:`, aError.message);
            }

            totalImported++;
        }
        console.log(`✅ Обработан билет ${ticketNum} (${questions.length} вопр.)`);
    }
    console.log(`✨ Категория ${categoryCode} завершена: ${totalImported} вопросов.`);
}

async function main() {
    await importCategory('A_B', 'A_B');
    await importCategory('C_D', 'C_D');
    console.log('\n🏁 ПОЛНЫЙ ИМПОРТ ЗАВЕРШЕН!');
}

main().catch(console.error);
