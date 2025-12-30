// =====================================================
// Обработчики команд Telegram-бота
// =====================================================

import { TelegramMessage, SendMessageOptions } from './types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as keyboards from './keyboards.ts';
import { t, getUserLanguage, getDaysWord, SupportedLanguage } from './translations.ts';

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

  const lang = await getUserLanguage(user.id, user.language_code, supabase);
  const { data: profile } = await supabase.from('profiles').select('id, first_name').eq('telegram_id', user.id).maybeSingle();
  const { data: metrics } = await supabase.from('user_metrics').select('streak_days, readiness_level').eq('user_id', profile?.id).maybeSingle();

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
    reply_markup: keyboards.getMainMenuKeyboard(lang)
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
