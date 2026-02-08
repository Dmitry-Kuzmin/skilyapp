
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkDuplicates() {
    let allAnswers = [];
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
        const { data: answers, error } = await supabase
            .from('answer_options')
            .select('id, question_id, text_ru')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching answers:', error);
            return;
        }
        if (!answers || answers.length === 0) break;

        allAnswers = allAnswers.concat(answers);
        page++;
        console.log(`Fetched ${allAnswers.length} answers...`);
    }

    const ids = new Set();
    const duplicates = [];

    allAnswers.forEach(a => {
        if (ids.has(a.id)) {
            duplicates.push(a);
        } else {
            ids.add(a.id);
        }
    });

    console.log(`checked ${allAnswers.length} answers.`);
    console.log(`found ${duplicates.length} duplicate IDs.`);

    // Check for logical duplicates (same question, same text)
    const logicalDuplicates = [];
    const validAnswers = new Set();

    allAnswers.forEach(a => {
        const key = `${a.question_id}|${a.text_ru}`;
        if (validAnswers.has(key)) {
            logicalDuplicates.push(a);
        } else {
            validAnswers.add(key);
        }
    });

    console.log(`found ${logicalDuplicates.length} logical duplicates (same question + text).`);
}

checkDuplicates();
