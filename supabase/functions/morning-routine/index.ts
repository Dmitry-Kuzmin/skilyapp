// =====================================================
// Morning Routine — Ежедневная утренняя викторина DGT
// Bulk-режим:  вызов без test_telegram_id → все юзеры
// Тест-режим:  вызов с test_telegram_id → один юзер
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const BOT_TOKEN    = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

type Lang = 'ru' | 'es' | 'en';

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Отправка викторины одному пользователю ────────────────────────────────────
async function sendMorningQuiz(supabase: any, telegramId: number, forceLang?: Lang): Promise<void> {
  // 0. Профиль и язык
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, settings')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    console.warn(`[Morning] Profile not found for ${telegramId}`);
    return;
  }

  const profileSettings = (typeof profile.settings === 'object' && profile.settings) || {};
  // DGT España: всегда испанский для утренней викторины независимо от настроек пользователя
  const lang: Lang = (forceLang || 'es') as Lang;

  // 1. Вопросы с картинками — приоритет (только испанская база!)
  const { data: questionsWithImg } = await supabase
    .from('questions_new')
    .select('id, question_ru, question_es, explanation_ru, explanation_es, image_url')
    .eq('country', 'es')
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .limit(30);

  const pool = shuffle(questionsWithImg || []);

  if (pool.length < 8) {
    const { data: questionsNoImg } = await supabase
      .from('questions_new')
      .select('id, question_ru, question_es, explanation_ru, explanation_es, image_url')
      .eq('country', 'es')
      .or('image_url.is.null,image_url.eq.')
      .limit(20);
    pool.push(...shuffle(questionsNoImg || []));
  }

  if (pool.length === 0) throw new Error('No questions found');

  // 2. Собираем fullQuestions с вариантами ответов
  const fullQuestions: any[] = [];
  for (const q of pool) {
    if (fullQuestions.length >= 3) break;

    const { data: opts, error: oError } = await supabase
      .from('answer_options')
      .select('text_ru, text_es, is_correct')
      .eq('question_id', q.id)
      .order('position', { ascending: true });

    if (!oError && opts && opts.length >= 2) {
      const textField = lang === 'es' ? 'question_es' : 'question_ru';
      const expField  = lang === 'es' ? 'explanation_es' : 'explanation_ru';
      const optField  = lang === 'es' ? 'text_es' : 'text_ru';

      fullQuestions.push({
        id: q.id,
        text: q[textField] || q.question_ru,
        question_ru: q.question_ru,
        question_es: q.question_es,
        explanation: q[expField]  || q.explanation_ru,
        explanation_ru: q.explanation_ru,
        explanation_es: q.explanation_es,
        image_url: q.image_url || null,
        options: opts.map((o: any) => o[optField] || o.text_ru),
        correct_idx: opts.findIndex((o: any) => o.is_correct),
      });
    }
  }

  if (fullQuestions.length === 0) throw new Error('No questions with options found');

  // 3. Первый вопрос
  const firstQ       = fullQuestions[0];
  const plainQ       = stripHtml(firstQ.text);
  const plainExp     = stripHtml(firstQ.explanation || '');
  const cleanOptions = firstQ.options.map((o: string) => stripHtml(o).substring(0, 100));
  const total        = fullQuestions.length;
  const qLabel       = `Pregunta 1 de ${total}`;

  // 4. Фото (если есть) — только декоративный заголовок, текст вопроса только в poll
  let photoMsgId: number | null = null;
  if (firstQ.image_url) {
    try {
      const photoRes = await fetch(`${TELEGRAM_API}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          photo: firstQ.image_url,
          caption: `☀️ <b>Cuestionario matutino · ${qLabel}</b>`,
          parse_mode: 'HTML',
        }),
      });
      const photoData = await photoRes.json();
      if (photoRes.ok && photoData.result?.message_id) {
        photoMsgId = photoData.result.message_id;
      } else {
        console.warn(`[Morning] sendPhoto failed for ${telegramId}:`, photoData.description);
      }
    } catch (e) {
      console.warn(`[Morning] sendPhoto exception for ${telegramId}:`, e);
    }
  }

  // 5. Poll (quiz) — полный текст вопроса здесь
  const pollQuestion = `${qLabel}: ${plainQ}`.substring(0, 300);
  const pollRes = await fetch(`${TELEGRAM_API}/sendPoll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramId,
      question: pollQuestion,
      options: cleanOptions,
      type: 'quiz',
      correct_option_id: firstQ.correct_idx,
      explanation: plainExp.substring(0, 200),
      is_anonymous: false,
    }),
  });

  const pollData = await pollRes.json();

  // Если бот заблокирован — просто пропускаем, не падаем
  if (!pollRes.ok) {
    const code = pollData?.error_code;
    if (code === 403) {
      console.log(`[Morning] Skipped ${telegramId}: bot blocked`);
      return;
    }
    throw new Error(`sendPoll failed for ${telegramId}: ${pollData.description}`);
  }

  const pollMsgId = pollData.result?.message_id;
  const pollId    = pollData.result?.poll?.id;

  if (!pollMsgId) throw new Error(`Poll message_id not returned for ${telegramId}`);

  // 6. Сохраняем сессию в settings
  const settings = { ...profileSettings };
  settings.morning_quiz = {
    questions:    fullQuestions,
    current:      0,
    correct:      0,
    results:      [],
    poll_id:      pollId,
    photo_msg_id: photoMsgId,
    poll_msg_id:  pollMsgId,
    chat_id:      telegramId,
    botLang:      lang,
    started_at:   new Date().toISOString(),
  };
  await supabase.from('profiles').update({ settings }).eq('id', profile.id);

  // 7. Кнопка перевода 🤟 — отдельным сообщением под poll
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: '🤟 ¿No entiendes la pregunta?',
        reply_markup: {
          inline_keyboard: [[
            { text: '🤟 Traducir al ruso', callback_data: 'mqt_0', icon_custom_emoji_id: '5105268517691720533' },
          ]],
        },
      }),
    });
  } catch (e) {
    console.warn(`[Morning] sendTranslateBtn exception for ${telegramId}:`, e);
  }

  console.log(`[Morning] ✅ Sent to ${telegramId} (lang=${lang} questions=${fullQuestions.length})`);
}

// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createPooledSupabaseClient(SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const testTelegramId: number | undefined = body?.test_telegram_id;
    const forceLang: Lang | undefined        = body?.lang;

    // ── ТЕСТ-РЕЖИМ: один конкретный юзер ─────────────────────────────────
    if (testTelegramId) {
      console.log(`[Morning] Test mode for: ${testTelegramId}`);
      await sendMorningQuiz(supabase, testTelegramId, forceLang);
      return new Response(JSON.stringify({ ok: true, message: 'Quiz sent', telegram_id: testTelegramId }));
    }

    // ── BULK-РЕЖИМ: все активные юзеры с telegram_id ─────────────────────
    console.log('[Morning] Bulk mode — fetching all users with telegram_id');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('telegram_id')
      .not('telegram_id', 'is', null)
      .limit(1000);

    const telegramIds: number[] = (profiles || [])
      .map((p: any) => p.telegram_id)
      .filter(Boolean);

    console.log(`[Morning] Found ${telegramIds.length} users`);

    if (telegramIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No users', sent: 0 }));
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const tid of telegramIds) {
      try {
        await sendMorningQuiz(supabase, tid);
        sent++;
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('blocked') || msg.includes('Profile not found')) {
          skipped++;
        } else {
          failed++;
          console.error(`[Morning] Error for ${tid}:`, msg);
        }
      }
      // Telegram limit: max 30 msgs/sec к разным чатам
      // С задержкой 50ms = ~20/sec, безопасно
      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`[Morning] Bulk complete: sent=${sent} skipped=${skipped} failed=${failed}`);
    return new Response(JSON.stringify({
      ok: true,
      sent,
      skipped,
      failed,
      total: telegramIds.length,
    }));

  } catch (err) {
    console.error('[Morning] Fatal error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
