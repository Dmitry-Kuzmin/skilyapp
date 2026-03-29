
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("🚀 Запуск рассылки тестовых квизов для @EmigrationPublic...");

    // 1. Находим пользователя
    const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_id, first_name')
        .eq('username', 'EmigrationPublic')
        .maybeSingle();

    if (!profile) {
        console.error("❌ Пользователь @EmigrationPublic не найден в базе данных.");
        return;
    }

    const chatId = profile.telegram_id;
    console.log(`✅ Нашли ID: ${chatId} (${profile.first_name})`);

    // 2. Берем 2 рандомных вопроса с картинками
    const { data: questions } = await supabase
        .rpc('get_random_questions_with_images', { lim: 2 });

    if (!questions || questions.length === 0) {
        console.error("❌ Не удалось найти вопросы в базе.");
        return;
    }

    // 3. Отправляем в Telegram
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        console.log(`📦 Отправка вопроса ${i + 1}: ${q.text.substring(0, 30)}...`);

        // А. Фото
        if (q.image_url) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    photo: q.image_url,
                    caption: `❓ Тестовая викторина для Дима (${i + 1}/2)`,
                })
            });
        }

        // Б. Опрос (Quiz) - чистим текст от HTML
        const plainQuestion = (q.text || '').replace(/<[^>]*>/g, '').trim();
        const plainExplanation = (q.explanation || '').replace(/<[^>]*>/g, '').trim();
        
        const pollResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPoll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                question: plainQuestion.substring(0, 300),
                options: q.answer_options.map((opt: any) => opt.text.substring(0, 100)),
                type: 'quiz',
                correct_option_id: q.answer_options.findIndex((opt: any) => opt.is_correct),
                is_anonymous: false,
                explanation: plainExplanation.substring(0, 200)
            })
        });

        const res = await pollResp.json();
        if (!res.ok) {
           console.error(`[Error] sendPoll failed:`, res.description);
        } else {
           console.log(`✨ Вопрос ${i + 1} отправлен!`);
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("🏁 Всё готово! Проверяй Telegram. 😉");
}

main().catch(console.error);
