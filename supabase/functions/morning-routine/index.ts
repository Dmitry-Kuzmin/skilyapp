// =====================================================
// Morning Routine — Запуск интерактивной викторины
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
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

serve(async (req) => {
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createPooledSupabaseClient(SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const testTelegramId = body?.test_telegram_id; // если задан — тест-режим (один юзер)
    const isBulk = !testTelegramId;

    // ── BULK-режим: берём всех активных юзеров с telegram_id ──────────────
    let telegramIds: number[] = [];

    if (isBulk) {
      console.log('[Morning] Bulk mode — fetching all active users');
      const { data: profiles } = await supabase
        .from('profiles')
        .select('telegram_id')
        .not('telegram_id', 'is', null)
        .eq('is_active', true)
        .limit(500);

      if (!profiles || profiles.length === 0) {
        // Fallback: берём всех у кого есть telegram_id (нет поля is_active)
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('telegram_id')
          .not('telegram_id', 'is', null)
          .limit(500);
        telegramIds = (allProfiles || []).map((p: any) => p.telegram_id).filter(Boolean);
      } else {
        telegramIds = profiles.map((p: any) => p.telegram_id).filter(Boolean);
      }

      console.log(`[Morning] Found ${telegramIds.length} users to notify`);

      if (telegramIds.length === 0) {
        return new Response(JSON.stringify({ ok: true, message: 'No users found', sent: 0 }));
      }

      // Отправляем каждому пользователю асинхронно (fire-and-forget batch)
      let sent = 0;
      let failed = 0;
      for (const tid of telegramIds) {
        try {
          await sendMorningQuiz(supabase, tid);
          sent++;
          // Небольшая задержка чтобы не флудить Telegram API (30 msg/sec лимит)
          if (sent % 25 === 0) await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          failed++;
          console.error(`[Morning] Failed for ${tid}:`, e);
        }
      }
      console.log(`[Morning] Bulk done: sent=${sent} failed=${failed}`);
      return new Response(JSON.stringify({ ok: true, sent, failed, total: telegramIds.length }));
    }

    console.log(`[Morning] Test mode for: ${testTelegramId}`);

    // 0. Определяем язык пользователя из профиля
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, settings')
      .eq('telegram_id', testTelegramId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    const profileSettings = (typeof profile.settings === 'object' && profile.settings) || {};
    const lang: Lang = (body?.lang || profileSettings.language || 'es') as Lang;
    console.log(`[Morning] User lang: ${lang}`);

    // 1. Вопросы С картинками — приоритет
    const { data: questionsWithImg } = await supabase
      .from('questions_new')
      .select('id, question_ru, question_es, explanation_ru, explanation_es, image_url')
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .limit(30);

    const pool = shuffle(questionsWithImg || []);

    // Если вопросов с картинками < 3, добавляем без картинок
    if (pool.length < 8) {
      const { data: questionsNoImg } = await supabase
        .from('questions_new')
        .select('id, question_ru, question_es, explanation_ru, explanation_es, image_url')
        .or('image_url.is.null,image_url.eq.')
        .limit(20);
      pool.push(...shuffle(questionsNoImg || []));
    }

    if (pool.length === 0) {
      throw new Error('No questions found');
    }

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
        const expField = lang === 'es' ? 'explanation_es' : 'explanation_ru';
        const optField = lang === 'es' ? 'text_es' : 'text_ru';

        fullQuestions.push({
          id: q.id,
          text: q[textField] || q.question_ru,
          question_ru: q.question_ru,
          question_es: q.question_es,
          explanation: q[expField] || q.explanation_ru,
          explanation_ru: q.explanation_ru,
          explanation_es: q.explanation_es,
          image_url: q.image_url || null,
          options: opts.map((o: any) => o[optField] || o.text_ru),
          correct_idx: opts.findIndex((o: any) => o.is_correct)
        });
      }
    }

    if (fullQuestions.length === 0) throw new Error('Could not load questions with options');

    console.log(`[Morning] Loaded ${fullQuestions.length} questions (lang=${lang})`);

    // 3. Первый вопрос
    const firstQ = fullQuestions[0];
    const plainQ = stripHtml(firstQ.text);
    const plainExp = stripHtml(firstQ.explanation || '');
    const cleanOptions = firstQ.options.map((o: string) => stripHtml(o).substring(0, 100));
    const total = fullQuestions.length;

    const qLabel = lang === 'es' ? `Pregunta 1 de ${total}` : lang === 'en' ? `Question 1 of ${total}` : `Вопрос 1 из ${total}`;

    // 4. Фото (если есть)
    let photoMsgId: number | null = null;
    if (firstQ.image_url) {
      try {
        const photoRes = await fetch(`${TELEGRAM_API}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: testTelegramId,
            photo: firstQ.image_url,
            caption: `<tg-emoji emoji-id="5452069934089641166">❓</tg-emoji> <b>${qLabel}</b>\n\n${plainQ}`,
            parse_mode: 'HTML'
          })
        });
        const photoData = await photoRes.json();
        if (photoRes.ok && photoData.result?.message_id) {
          photoMsgId = photoData.result.message_id;
          console.log(`[Morning] Photo sent: msg_id=${photoMsgId}`);
        } else {
          console.warn(`[Morning] sendPhoto failed:`, photoData.description || photoData);
        }
      } catch (photoErr) {
        console.warn(`[Morning] sendPhoto exception:`, photoErr);
      }
    }

    // 5. Poll (обязательно)
    const pollQuestion = `❓ ${qLabel}: ${plainQ}`.substring(0, 300);
    const pollRes = await fetch(`${TELEGRAM_API}/sendPoll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: testTelegramId,
        question: pollQuestion,
        options: cleanOptions,
        type: 'quiz',
        correct_option_id: firstQ.correct_idx,
        explanation: plainExp.substring(0, 200),
        is_anonymous: false
      })
    });

    const pollData = await pollRes.json();
    if (!pollRes.ok) {
      console.error(`[Morning] sendPoll FAILED:`, pollData);
      return new Response(JSON.stringify({ error: 'sendPoll failed', details: pollData.description }), { status: 500 });
    }

    const pollMsgId = pollData.result?.message_id;
    const pollId = pollData.result?.poll?.id;

    if (!pollMsgId) {
      return new Response(JSON.stringify({ error: 'Poll message_id not returned' }), { status: 500 });
    }

    console.log(`[Morning] Poll sent: msg_id=${pollMsgId}, poll_id=${pollId}`);

    // 6. Сохраняем сессию
    const settings = { ...profileSettings };
    settings.morning_quiz = {
      questions: fullQuestions,
      current: 0,
      correct: 0,
      results: [],
      poll_id: pollId,
      photo_msg_id: photoMsgId,
      poll_msg_id: pollMsgId,
      chat_id: testTelegramId,
      botLang: lang,
      started_at: new Date().toISOString()
    };
    await supabase.from('profiles').update({ settings }).eq('id', profile.id);
    console.log(`[Morning] Session saved for profile ${profile.id}`);

    return new Response(JSON.stringify({ ok: true, message: 'Session started', questions: fullQuestions.length, lang }));

  } catch (err) {
    console.error(`[Morning] Error:`, err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
