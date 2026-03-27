// =====================================================
// Morning Routine — Утренняя разминка DGT + Чеклист Duel Pass
// =====================================================
// Каждое утро (9:00 по Мадриду):
// 1. Разминка: 3 вопроса DGT в одном сообщении (inline кнопки, автозамена)
// 2. Чеклист задач на сегодня из Duel Pass (inline кнопки + таймер)
//
// Квиз: фото+вопрос → пользователь нажимает кнопку ответа →
// сообщение редактируется: показывает результат → следующий вопрос →
// после 3 вопросов — итоговый анализ + CTA
//
// Запускается через GitHub Actions cron

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const AVATAR_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/avatars/bot`;

const BOT_USERNAME = 'skilyapp_bot';
const BOT_APP_NAME = 'skilyapp';
const QUIZ_QUESTIONS_COUNT = 3;

type Lang = 'ru' | 'en' | 'es';

// =====================================================
// Язык
// =====================================================

function getBotLang(profile: any): Lang {
  const code = profile?.language_code?.toLowerCase()?.split('-')[0];
  if (code) {
    if (['ru', 'uk', 'be', 'kk'].includes(code)) return 'ru';
    if (['es', 'ca', 'gl'].includes(code)) return 'es';
    if (['en', 'de', 'fr', 'it', 'pt', 'nl'].includes(code)) return 'en';
  }
  return 'ru';
}

function getContentLang(profile: any): Lang {
  let settings = profile?.settings;
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch { settings = null; }
  }
  const lang = settings?.exam_language || settings?.language;
  if (lang && ['ru', 'en', 'es'].includes(lang)) return lang as Lang;
  return 'es';
}

const GREETINGS: Record<Lang, string[]> = {
  ru: ['☀️ Утренняя разминка DGT!', '🧠 Разминка для мозга!', '🌅 Проверь свои знания!'],
  en: ['☀️ Morning DGT warm-up!', '🧠 Brain warm-up!', '🌅 Test your knowledge!'],
  es: ['☀️ ¡Calentamiento DGT!', '🧠 ¡Calentamiento mental!', '🌅 ¡Comprueba tus conocimientos!'],
};

// =====================================================
// Главный обработчик
// =====================================================

serve(async (req) => {
  try {
    const supabase = createPooledSupabaseClient();

    const results: any = {
      quizzes_sent: 0, checklists_sent: 0, checklists_text: 0,
      errors: 0, users_processed: 0,
      debug_langs: {} as Record<string, any>,
      checklist_errors: [] as string[],
    };

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, telegram_id, first_name, language_code, settings, last_activity_at')
      .not('telegram_id', 'is', null)
      .order('last_activity_at', { ascending: false })
      .limit(500);

    if (profilesError || !profiles?.length) {
      return jsonResponse({ error: profilesError?.message || 'No profiles' });
    }

    // Фильтруем только активных пользователей (заходили в последние 30 дней)
    const activeProfiles = profiles.filter((p: any) => {
      const d = new Date(); 
      d.setDate(d.getDate() - 30);
      return p.last_activity_at && new Date(p.last_activity_at) > d;
    });

    // Сезон для чеклиста
    const { data: seasons } = await supabase
      .from('duel_pass_seasons')
      .select('id, name_ru, name_en, name_es')
      .eq('is_active', true).limit(1);
    const activeSeason = seasons?.[0];

    // Меняем аватар
    await changeBotAvatar('LEARNING');

    for (const profile of activeProfiles) {
      if (!profile.telegram_id) continue;
      results.users_processed++;

      const botLang = getBotLang(profile);
      const contentLang = getContentLang(profile);
      results.debug_langs[profile.first_name] = { botLang, contentLang };

      const chatId = profile.telegram_id;

      try {
        // 0. Приветствие
        const introMsg = GREETINGS[botLang][Math.floor(Math.random() * GREETINGS[botLang].length)];
        await tgFetch('sendMessage', {
          chat_id: chatId,
          text: `👋 ${profile.first_name ? `${profile.first_name}, ` : ''}${formatMarkdown(introMsg)}`,
          parse_mode: 'HTML'
        });

        // A. Чеклист задач
        if (activeSeason) {
          const cl = await sendDailyChecklist(supabase, profile, activeSeason, botLang);
          if (cl.sent) { results.checklists_sent++; results.checklists_text++; }
          if (cl.error) results.checklist_errors.push(`${profile.first_name}: ${cl.error}`);
        }

        // B. Утренняя разминка — 3 вопроса inline
        const quizOk = await sendMorningQuiz(supabase, profile, botLang, contentLang);
        if (quizOk) results.quizzes_sent++;

        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        console.error(`[Morning] Error for ${profile.id}:`, error);
        results.errors++;
      }
    }

    setTimeout(() => changeBotAvatar('DEFAULT'), 60000);

    return jsonResponse({ success: true, results });
  } catch (error: any) {
    console.error('[Morning] Fatal:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// =====================================================
// Форматирование Markdown в HTML для Telegram
// =====================================================
function formatMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold: **text** -> <b>$1</b>
    .replace(/\*(.*?)\*/g, '<i>$1</i>');    // Italic: *text* -> <i>$1</i>
}

// =====================================================
// Quiz — Последовательные вопросы (1 за раз)
// =====================================================
// Отправляем только первый вопрос (фото + quiz poll).
// После ответа (poll_answer в telegram-bot) — удаляем и показываем следующий.
// Сессия хранится в profile.settings.morning_quiz

interface PreparedQuestion {
  id: string;
  text: string;
  image_url: string | null;
  explanation: string;
  options: string[];
  correct_idx: number;
}

async function sendMorningQuiz(
  supabase: any, profile: any, botLang: Lang, contentLang: Lang
): Promise<boolean> {
  try {
    const chatId = profile.telegram_id;

    // Берём 50 случайных вопросов с картинками на нужном языке (чтобы не было микса ru/es)
    const langCol = contentLang === 'es' ? 'question_es' : contentLang === 'en' ? 'question_en' : 'question_ru';
    const { data: questions, error: qErr } = await supabase
      .from('questions_new')
      .select('id, question_es, question_ru, question_en, explanation_es, explanation_ru, explanation_en, image_url')
      .not('image_url', 'is', null)
      .not(langCol, 'is', null)
      .limit(50);

    if (qErr || !questions || questions.length < QUIZ_QUESTIONS_COUNT) {
      console.warn(`[Morning] Not enough questions: ${questions?.length || 0}`);
      return false;
    }

    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, QUIZ_QUESTIONS_COUNT);

    // Подготавливаем все 3 вопроса
    const prepared: PreparedQuestion[] = [];
    for (const q of shuffled) {
      const { data: answers } = await supabase
        .from('answer_options')
        .select('text_es, text_ru, text_en, is_correct, position')
        .eq('question_id', q.id)
        .order('position', { ascending: true });

      if (!answers || answers.length < 2) continue;

      const correctIdx = answers.findIndex((a: any) => a.is_correct);
      if (correctIdx === -1) continue;

      // Формируем текст вопроса: если юзер на русском, а учит на исп — даем оба
      let qText = '';
      if (contentLang === 'es') {
        qText = q.question_es || q.question_ru || '❓';
        if (botLang === 'ru' && q.question_ru && q.question_ru !== q.question_es) {
          qText = `${qText}\n\n🌐 ${q.question_ru}`;
        }
      } else if (contentLang === 'en') {
        qText = q.question_en || q.question_ru || '❓';
        if (botLang === 'ru' && q.question_ru && q.question_ru !== q.question_en) {
          qText = `${qText}\n\n🇷🇺 ${q.question_ru}`;
        }
      } else {
        qText = q.question_ru || q.question_es || '❓';
      }

      // Объяснение: для русскоязычных даем на русском (если есть), иначе по контенту
      let explanation = '';
      if (botLang === 'ru') {
        explanation = q.explanation_ru || q.explanation_es || '';
      } else {
        explanation = contentLang === 'es' ? (q.explanation_es || '')
          : contentLang === 'en' ? (q.explanation_en || q.explanation_es || '')
          : (q.explanation_ru || q.explanation_es || '');
      }

      prepared.push({
        id: q.id,
        text: formatMarkdown(qText).substring(0, 300),
        image_url: q.image_url,
        explanation: formatMarkdown(explanation) || '', // БЕЗ ОБРЕЗКИ (обрежем только в полле)
        options: answers.map((a: any) => {
          const t = contentLang === 'es' ? (a.text_es || a.text_ru)
            : contentLang === 'en' ? (a.text_en || a.text_ru)
            : (a.text_ru || a.text_es);
          return (t || '—').substring(0, 100);
        }),
        correct_idx: correctIdx,
      });
    }

    if (prepared.length < QUIZ_QUESTIONS_COUNT) return false;

    // Отправляем первый вопрос
    const msgIds = await sendQuizQuestion(chatId, prepared[0], 0, QUIZ_QUESTIONS_COUNT, botLang);
    if (!msgIds) return false;

    // Сохраняем сессию
    let settingsObj = profile.settings || {};
    if (typeof settingsObj === 'string') {
      try { settingsObj = JSON.parse(settingsObj); } catch { settingsObj = {}; }
    }

    await supabase.from('profiles').update({
      settings: {
        ...settingsObj,
        morning_quiz: {
          questions: prepared,
          current: 0,
          correct: 0,
          chat_id: chatId,
          photo_msg_id: msgIds.photoMsgId,
          poll_msg_id: msgIds.pollMsgId,
          botLang,
          contentLang,
        },
      },
    }).eq('id', profile.id);

    console.log(`[Morning] Quiz Q1 sent to ${profile.first_name}`);
    return true;
  } catch (error) {
    console.error('[Morning] Quiz error:', error);
    return false;
  }
}

// Отправляет один вопрос (фото + poll), возвращает message_id обоих
export async function sendQuizQuestion(
  chatId: number, q: PreparedQuestion, index: number, total: number, botLang: Lang
): Promise<{ photoMsgId: number | null; pollMsgId: number } | null> {
  let photoMsgId: number | null = null;

  // Фото
  if (q.image_url) {
    const pr = await tgFetch('sendPhoto', {
      chat_id: chatId,
      photo: q.image_url,
      caption: `❓ ${botLang === 'ru' ? `Вопрос ${index + 1} из ${total}` : `Question ${index + 1} of ${total}`}`,
    });
    if (pr.ok) {
      photoMsgId = pr.result?.message_id;
      if (photoMsgId) {
        tgFetch('setMessageReaction', {
          chat_id: chatId, message_id: photoMsgId,
          reaction: [{ type: 'emoji', emoji: '🚗' }],
        }).catch(() => {});
      }
    }
  }

  // Quiz poll
  const pollBody: any = {
    chat_id: chatId,
    question: q.text,
    options: q.options.map((text: string) => ({ text })),
    type: 'quiz',
    correct_option_id: q.correct_idx,
    is_anonymous: false,
  };
  if (q.explanation?.trim()) {
    // В полле Telegram лимит 200 символов, обрезаем только тут!
    pollBody.explanation = q.explanation.substring(0, 200);
    pollBody.explanation_parse_mode = 'HTML';
  }

  const pollResp = await tgFetch('sendPoll', pollBody);
  if (!pollResp.ok) {
    console.error(`[Morning] sendPoll failed:`, pollResp.description);
    return null;
  }

  const pollMsgId = pollResp.result?.message_id;
  if (pollMsgId) {
    tgFetch('setMessageReaction', {
      chat_id: chatId, message_id: pollMsgId,
      reaction: [{ type: 'emoji', emoji: '🤓' }],
    }).catch(() => {});
  }

  return { photoMsgId, pollMsgId };
}

// Хелпер для Telegram API вызовов
export async function tgFetch(method: string, body: any): Promise<any> {
  try {
    const resp = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await resp.json();
    if (!resp.ok) {
      console.error(`[TG] ${method} error:`, result.description);
    }
    return result;
  } catch (e) {
    console.error(`[TG] ${method} fetch error:`, e);
    return { ok: false };
  }
}

// =====================================================
// Daily Checklist (inline кнопки + таймер)
// =====================================================

function getTimeRemaining(lang: Lang): string {
  const now = new Date();
  const madridOffset = 2;
  const madridHour = (now.getUTCHours() + madridOffset) % 24;
  const hoursLeft = 23 - madridHour;
  const minsLeft = 59 - now.getUTCMinutes();
  if (lang === 'ru') return `${hoursLeft}ч ${minsLeft}мин`;
  if (lang === 'es') return `${hoursLeft}h ${minsLeft}min`;
  return `${hoursLeft}h ${minsLeft}m`;
}

function questMiniBar(current: number, target: number): string {
  const ratio = Math.min(current / Math.max(target, 1), 1);
  const filled = Math.round(ratio * 8);
  return '▓'.repeat(filled) + '░'.repeat(8 - filled);
}

export function buildChecklistMessage(quests: any[], lang: Lang): string {
  const day = new Date().getDate();
  const months: Record<Lang, string[]> = {
    ru: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  };
  const m = months[lang][new Date().getMonth()];
  let totalSP = 0, done = 0;
  quests.forEach((q: any) => { totalSP += q.reward_sp || 0; if (q.is_completed) done++; });

  const allDone = done === quests.length;
  const tl = getTimeRemaining(lang);

  const lines: string[] = [];

  // Шапка
  if (lang === 'ru') {
    lines.push(`🗓 <b>Дейли-квесты · ${day} ${m}</b>`);
    lines.push(`⏰ До сброса: ${tl}`);
  } else {
    lines.push(`🗓 <b>Daily Quests · ${m} ${day}</b>`);
    lines.push(`⏰ Resets in: ${tl}`);
  }
  lines.push('');
  lines.push('─────────────');
  lines.push('');

  // Квесты
  quests.forEach((q: any) => {
    const d = q.is_completed;
    const cur = q.current_progress || 0;
    const tgt = q.target_value || 1;
    const sp = q.reward_sp || 0;
    const title = q.title || '???';

    if (d) {
      lines.push(`✅ <s>${title}</s>  <b>+${sp} SP</b> 🎉`);
      lines.push(`     ▰▰▰▰▰▰▰▰▰▰ ${tgt}/${tgt}`);
    } else if (cur > 0) {
      const ratio = Math.min(cur / Math.max(tgt, 1), 1);
      const filled = Math.round(ratio * 10);
      const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
      const pct = Math.round(ratio * 100);
      lines.push(`🔥 <b>${title}</b>  +${sp} SP`);
      lines.push(`     ${bar} ${cur}/${tgt} · ${pct}%`);
    } else {
      lines.push(`⬜ ${title}  +${sp} SP`);
      lines.push(`     ▱▱▱▱▱▱▱▱▱▱ 0/${tgt}`);
    }
    lines.push('');
  });

  lines.push('─────────────');

  // Итого
  if (allDone) {
    lines.push('');
    lines.push(`🏆 <b>ВСЕ ВЫПОЛНЕНО!</b>`);
    lines.push(`💎 Забери свои <b>${totalSP} SP</b> в приложении`);
  } else {
    const progressBar = Array.from({ length: quests.length }, (_, i) =>
      quests[i].is_completed ? '🟢' : '⚫'
    ).join('');
    lines.push('');
    lines.push(`${progressBar}  ${done}/${quests.length}`);
    lines.push(`💰 На кону: <b>${totalSP} SP</b>`);
    if (done === 0) {
      lines.push('');
      lines.push(lang === 'ru' ? '👆 Открой Skily и начни выполнять!' : '👆 Open Skily and start completing!');
    }
  }

  return lines.join('\n');
}

async function sendDailyChecklist(
  supabase: any, profile: any, season: any, lang: Lang
): Promise<{ sent: boolean; native: boolean; error?: string }> {
  try {
    const { data: quests, error } = await supabase
      .rpc('get_or_assign_daily_quests', { p_user_id: profile.id });

    if (error || !quests?.length) return { sent: false, native: false, error: 'no quests' };

    const chatId = profile.telegram_id;

    // Перечитываем settings из базы (quiz мог обновить их)
    const { data: freshProfile } = await supabase
      .from('profiles').select('settings').eq('id', profile.id).single();
    let s = freshProfile?.settings || {};
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = {}; } }

    // Удаляем предыдущий чеклист
    if (s?.checklist_msg_id) await unpinAndDelete(chatId, s.checklist_msg_id);

    // Отправляем текстовый чеклист (без inline кнопок)
    const text = buildChecklistMessage(quests, lang);
    const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error(`[Checklist] FAILED ${chatId}:`, result.description);
      return { sent: false, native: false, error: result.description };
    }

    const msgId = result.result?.message_id;
    if (msgId) {
      await pinAndCleanup(chatId, msgId);
      // Сохраняем
      await supabase.from('profiles').update({
        settings: { ...s, checklist_msg_id: msgId, checklist_date: new Date().toISOString().split('T')[0] },
      }).eq('id', profile.id);
    }

    return { sent: !!msgId, native: false };
  } catch (e: any) {
    return { sent: false, native: false, error: e.message };
  }
}

// =====================================================
// Утилиты Telegram
// =====================================================

async function unpinAndDelete(chatId: number, messageId: number) {
  try {
    await fetch(`${TELEGRAM_API}/unpinChatMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch {}
}

async function pinAndCleanup(chatId: number, messageId: number) {
  try {
    const r = await fetch(`${TELEGRAM_API}/pinChatMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, disable_notification: true }),
    });
    if (r.ok) {
      await new Promise(r => setTimeout(r, 500));
      await fetch(`${TELEGRAM_API}/deleteMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId + 1 }),
      });
    }
  } catch {}
}

async function changeBotAvatar(avatar: string) {
  try {
    const img = await fetch(`${AVATAR_BASE_URL}/${avatar}.png`);
    if (!img.ok) return;
    const blob = await img.blob();
    const fd = new FormData();
    fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://f' }));
    fd.append('f', new File([blob], `${avatar}.png`, { type: 'image/png' }));
    const r = await fetch(`${TELEGRAM_API}/setMyProfilePhoto`, { method: 'POST', body: fd });
    if (!r.ok) {
      const fd2 = new FormData();
      fd2.append('photo', new File([blob], `${avatar}.png`, { type: 'image/png' }));
      await fetch(`${TELEGRAM_API}/setMyProfilePhoto`, { method: 'POST', body: fd2 });
    }
  } catch {}
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
