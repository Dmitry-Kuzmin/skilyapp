// =====================================================
// Обработчики команд Telegram-бота
// =====================================================

import { TelegramMessage, SendMessageOptions } from './types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as keyboards from './keyboards.ts';
import { t, getUserLanguage, getDaysWord, SupportedLanguage } from './translations.ts';
import { handleCourseStart, handleCourseBuyDirect, handleIndividualBookingStart, getMenuCourseLabel } from './course-funnel.ts';
import { handleCourseSupportStart } from './course-support.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const MINI_APP_URL = 'https://skilyapp.com';
const SUPPORT_CONTACT = Deno.env.get('SUPPORT_CONTACT') || '@SkilySupport';

export async function sendMessage(options: SendMessageOptions): Promise<unknown> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return await response.json();
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error);
    throw error;
  }
}

export async function setupMenuButton(): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '🚀 В БОЙ',
          web_app: { url: MINI_APP_URL }
        }
      })
    });
  } catch (error) {
    console.error('[setupMenuButton] Error:', error);
  }
}

export async function handleStart(message: TelegramMessage, supabase: SupabaseClient): Promise<void> {
  const user = message.from;
  if (!user || !message.chat) return;

  // ── Обработка deep-link параметров (/start <param>) ──
  const parts = message.text?.split(' ') || [];
  const startParam = parts[1] || '';

  if (startParam === 'course' || startParam === 'course_qualify') {
    await handleCourseStart(
      message.chat.id,
      user.first_name || 'друг',
      user.id,
      user.username,
      supabase
    );
    return;
  }
  if (startParam === 'support') {
    const { data: currentProfile } = await supabase.from('profiles').select('settings').eq('telegram_id', user.id).maybeSingle();
    const currentSettings = (typeof currentProfile?.settings === 'object' && currentProfile?.settings) || {};
    await supabase.from('profiles').update({ settings: { ...currentSettings, course_support_mode: true } }).eq('telegram_id', user.id);
    await handleCourseSupportStart(message.chat.id, user.first_name || 'друг');
    return;
  }
  if (startParam === 'buy_basic') {
    await handleCourseBuyDirect(
      message.chat.id,
      user.first_name || 'друг',
      user.id,
      user.username,
      'basic' as any,
      supabase
    );
    return;
  }
  if (startParam === 'buy_pro') {
    await handleCourseBuyDirect(
      message.chat.id,
      user.first_name || 'друг',
      user.id,
      user.username,
      'pro',
      supabase
    );
    return;
  }
  if (startParam === 'buy_vip') {
    await handleCourseBuyDirect(
      message.chat.id,
      user.first_name || 'друг',
      user.id,
      user.username,
      'vip',
      supabase
    );
    return;
  }
  if (startParam === 'buy_mini') {
    await handleIndividualBookingStart(
      message.chat.id,
      user.first_name || 'друг',
      user.id,
      user.username,
      'mini_group',
      supabase
    );
    return;
  }
  if (startParam === 'buy_individual') {
    await handleIndividualBookingStart(
      message.chat.id,
      user.first_name || 'друг',
      user.id,
      user.username,
      'individual',
      supabase
    );
    return;
  }

  const [lang, courseLabel] = await Promise.all([
    getUserLanguage(user.id, user.language_code, supabase),
    getMenuCourseLabel(supabase),
  ]);
  const { data: profile } = await supabase.from('profiles').select('id, first_name').eq('telegram_id', user.id).maybeSingle();
  const { data: metrics } = await supabase.from('user_metrics').select('streak_days, readiness_level').eq('user_id', profile?.id).maybeSingle();
  const { data: activeSeason } = await supabase.from('duel_pass_seasons').select('name_ru, name_en, name_es').eq('is_active', true).maybeSingle();
  const activeSeasonName = activeSeason ? (activeSeason[`name_${lang}` as keyof typeof activeSeason] as string ?? activeSeason.name_ru) : null;

  const userName = profile?.first_name || user.first_name || 'Pilot';
  const streakDays = metrics?.streak_days || 0;
  const readiness = metrics?.readiness_level || 0;
  const isNewUser = !profile || readiness === 0;

  const welcomeText = isNewUser
    ? t('start.welcome.new', lang, { name: userName })
    : t('start.welcome.returning', lang, {
      name: userName,
      streakEmoji: streakDays > 7 ? '🔥' : '✨',
      streak: streakDays,
      readiness,
      motivation: streakDays === 0 ? t('start.motivation.noStreak', lang) : t('start.motivation.hasStreak', lang)
    });

  await sendMessage({
    chat_id: message.chat.id,
    text: welcomeText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getMainMenuKeyboard(lang, activeSeasonName, courseLabel)
  });
}

export async function handleStats(message: TelegramMessage, supabase: SupabaseClient): Promise<void> {
  const user = message.from;
  if (!user) return;

  const lang = await getUserLanguage(user.id, user.language_code, supabase);
  const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_id', user.id).maybeSingle();

  if (!profile) {
    await sendMessage({ chat_id: message.chat.id, text: t('stats.noProfile', lang) });
    return;
  }

  const { data: metrics } = await supabase.from('user_metrics').select('*').eq('user_id', profile.id).maybeSingle();
  if (!metrics) {
    await sendMessage({ chat_id: message.chat.id, text: t('stats.noStats', lang), reply_markup: keyboards.getOpenAppKeyboard(lang) });
    return;
  }

  const accuracy = metrics.total_questions_answered > 0 ? ((metrics.correct_answers / metrics.total_questions_answered) * 100).toFixed(1) : '0';
  const statsText = `${t('stats.title', lang)}\n\n${t('stats.readiness', lang, { value: metrics.readiness_level || 0 })}\n${t('stats.streak', lang, { value: metrics.streak_days || 0 })}\n\n${t('stats.tests', lang)}\n${t('stats.testsCompleted', lang, { value: metrics.total_tests_completed || 0 })}\n${t('stats.questionsAnswered', lang, { value: metrics.total_questions_answered || 0 })}\n${t('stats.correctAnswers', lang, { value: metrics.correct_answers || 0, percent: accuracy })}\n\n${t('stats.duels', lang)}\n${t('stats.duelsPlayed', lang, { value: metrics.total_duels_played || 0 })}`;

  await sendMessage({ chat_id: message.chat.id, text: statsText, parse_mode: 'HTML', reply_markup: keyboards.getBackToMenuKeyboard(lang) });
}

export async function handleDuel(message: TelegramMessage, supabase: SupabaseClient): Promise<void> {
  const user = message.from;
  const lang = user ? await getUserLanguage(user.id, user.language_code, supabase) : 'ru';
  const duelText = `${t('duel.title', lang)}\n\n${t('duel.description', lang, { url: MINI_APP_URL })}`;

  await sendMessage({
    chat_id: message.chat.id,
    text: duelText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getDuelMenuKeyboard(lang)
  });
}

export async function handleStreak(message: TelegramMessage, supabase: SupabaseClient): Promise<void> {
  const user = message.from;
  if (!user) return;

  const lang = await getUserLanguage(user.id, user.language_code, supabase);
  const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_id', user.id).maybeSingle();

  if (!profile) {
    await sendMessage({ chat_id: message.chat.id, text: t('stats.noProfile', lang) });
    return;
  }

  const { data: metrics } = await supabase.from('user_metrics').select('streak_days, last_activity_at').eq('user_id', profile.id).maybeSingle();
  const streakDays = metrics?.streak_days || 0;
  const lastActivity = metrics?.last_activity_at ? new Date(metrics.last_activity_at) : null;
  const isToday = lastActivity ? new Date().toDateString() === lastActivity.toDateString() : false;

  const streakText = streakDays === 0 ? t('streak.noStreak', lang) : `${t('streak.current', lang, { days: streakDays, daysWord: getDaysWord(streakDays, lang) })}\n\n${isToday ? t('streak.todayActive', lang) : t('streak.todayInactive', lang)}`;

  await sendMessage({ chat_id: message.chat.id, text: streakText, parse_mode: 'HTML', reply_markup: keyboards.getQuickMenuKeyboard(lang) });
}

export async function handleHelp(message: TelegramMessage, supabase: SupabaseClient): Promise<void> {
  const user = message.from;
  const lang = user ? await getUserLanguage(user.id, user.language_code, supabase) : 'ru';
  const helpText = `${t('help.title', lang)}\n\n${t('help.commands', lang)}\n\n${t('help.about', lang)}\n\n${t('help.support', lang, { contact: SUPPORT_CONTACT })}`;

  await sendMessage({ chat_id: message.chat.id, text: helpText, parse_mode: 'HTML', reply_markup: keyboards.getQuickMenuKeyboard(lang) });
}

export async function handleSettings(message: TelegramMessage, supabase: SupabaseClient): Promise<void> {
  const user = message.from;
  if (!user) return;
  const lang = await getUserLanguage(user.id, user.language_code, supabase);

  await sendMessage({
    chat_id: message.chat.id,
    text: `${t('settings.title', lang)}\n\n${t('settings.description', lang)}`,
    parse_mode: 'HTML',
    reply_markup: keyboards.getSettingsKeyboard(lang)
  });
}

export async function handleBroadcast(
  message: TelegramMessage,
  text: string,
  supabase: SupabaseClient
): Promise<void> {
  const user = message.from;
  if (!user) return;

  // Список telegram_id администраторов (из env или hard-coded)
  const adminIdsRaw = Deno.env.get('ADMIN_TELEGRAM_IDS') || '';
  const adminIds = adminIdsRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

  if (!adminIds.includes(user.id)) {
    await sendMessage({
      chat_id: message.chat.id,
      text: '⛔ У тебя нет прав администратора для этой команды.'
    });
    return;
  }

  if (!text || text.trim().length < 3) {
    await sendMessage({
      chat_id: message.chat.id,
      text: '❗ Укажи текст для рассылки:\n/broadcast <текст сообщения>'
    });
    return;
  }

  await sendMessage({
    chat_id: message.chat.id,
    text: `📣 Начинаю рассылку...\nТекст: <b>${text}</b>`,
    parse_mode: 'HTML'
  });

  // Получаем всех пользователей с telegram_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('telegram_id, first_name')
    .not('telegram_id', 'is', null)
    .limit(5000);

  if (error || !profiles) {
    await sendMessage({
      chat_id: message.chat.id,
      text: `❌ Ошибка получения пользователей: ${error?.message}`
    });
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const profile of profiles) {
    if (!profile.telegram_id) continue;
    try {
      const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.telegram_id,
          text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{
              text: '🚀 Открыть Skilyapp',
              web_app: { url: Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com' }
            }]]
          }
        })
      });
      if (resp.ok) {
        sent++;
      } else {
        failed++;
      }
    } catch (_e) {
      failed++;
    }
    // Небольшая задержка чтобы не словить rate-limit Telegram (30 msg/sec)
    if (sent % 25 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  await sendMessage({
    chat_id: message.chat.id,
    text: `✅ Рассылка завершена!\n\n📬 Отправлено: <b>${sent}</b>\n❌ Ошибок: <b>${failed}</b>\n👥 Всего: <b>${profiles.length}</b>`,
    parse_mode: 'HTML'
  });
}

export async function handleTips(message: TelegramMessage, supabase: SupabaseClient): Promise<void> {
  const user = message.from;
  if (!user) return;
  const lang = await getUserLanguage(user.id, user.language_code, supabase);

  await sendMessage({
    chat_id: message.chat.id,
    text: `${t('tips.title', lang)}\n\n${t('tips.intro', lang)}`,
    parse_mode: 'HTML',
    reply_markup: keyboards.getTipsMenuKeyboard(lang)
  });
}

// =====================================================
// Тест нового API: Checklist (Bot API 9.0+)
// =====================================================
export async function handleChecklist(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;

  try {
    const resp = await fetch(`${TELEGRAM_API}/sendChecklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        checklist: {
          title: '🗺 Skily Bot — Идеальное меню',
          tasks: [
            { id: 1,  text: '🏠 Главное меню — точка входа' },
            { id: 2,  text: '👤 Профиль — статистика, серия, точность' },
            { id: 3,  text: '⚔️ Дуэли — вызов, рейтинг, история' },
            { id: 4,  text: '📚 Учёба — тесты, карточки, темы' },
            { id: 5,  text: '🤖 AI-помощник — вопросы по ПДД' },
            { id: 6,  text: '🎮 Duel Pass — сезон и награды' },
            { id: 7,  text: '⭐ Сезон — активная кнопка сезона' },
            { id: 8,  text: '⚙️ Настройки — язык, уведомления' },
            { id: 9,  text: '💎 Premium — способы оплаты' },
            { id: 10, text: '🔔 Ежедневный квест — чеклист задач' },
            { id: 11, text: '📊 Детальная статистика — web_app' },
            { id: 12, text: '🏆 Достижения — бейджи и прогресс' }
          ],
          others_can_mark_tasks_as_done: true,
          others_can_add_tasks: false
        }
      })
    });
    const result = await resp.json();
    console.log('[Checklist] Result:', JSON.stringify(result));

    if (!result.ok) {
      // Fallback: sendChecklist не поддерживается в этой версии
      await sendMessage({
        chat_id: chatId,
        text: `❌ <b>sendChecklist</b> не поддерживается в текущей версии Bot API.\n\nОтвет: <code>${result.description || 'unknown error'}</code>`,
        parse_mode: 'HTML'
      });
    }
  } catch (e) {
    console.error('[Checklist] Error:', e);
  }
}
