// =====================================================
// Telegram Bot - Main Webhook Handler
// =====================================================
// Основной обработчик webhook для Telegram-бота
// Принимает команды, callback-запросы и отправляет уведомления

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  TelegramUpdate, 
  TelegramCallbackQuery,
  AnswerCallbackQueryOptions,
  EditMessageTextOptions 
} from './types.ts';
import * as commands from './commands.ts';
import * as keyboards from './keyboards.ts';
import type { NotificationKeyboardState } from './keyboards.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('[Telegram Bot] Starting webhook handler...');

// =====================================================
// Главный обработчик
// =====================================================
serve(async (req) => {
  try {
    // Проверка метода
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        bot: 'DGT Prep Bot',
        version: '1.0.0'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Парсим update от Telegram
    const update: TelegramUpdate = await req.json();
    console.log('[Telegram Bot] Received update:', update.update_id);

    // Создаем Supabase клиент
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Обрабатываем разные типы update
    if (update.message) {
      await handleMessage(update.message, supabase);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, supabase);
    } else {
      console.log('[Telegram Bot] Unknown update type:', Object.keys(update));
    }

    // Всегда возвращаем 200 OK Telegram
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[Telegram Bot] Error processing update:', error);
    // Все равно возвращаем 200, чтобы Telegram не ретраил
    return new Response('OK', { status: 200 });
  }
});

// =====================================================
// Обработка входящих сообщений
// =====================================================
async function handleMessage(message: any, supabase: any): Promise<void> {
  const text = message.text?.trim() || '';
  const user = message.from;

  if (!user) return;

  console.log(`[Telegram Bot] Message from @${user.username || user.id}: ${text}`);

  // Аутентифицируем пользователя в нашей БД
  await authenticateUser(user, supabase);

  // Обработка команд
  if (text.startsWith('/')) {
    const [rawCommand, rawParam] = text.split(' ');
    const command = rawCommand.toLowerCase().replace(/^\//, '');

    if (command === 'start' && rawParam?.startsWith('link_')) {
      await handleLinkToken(rawParam, user, message, supabase);
      return;
    }
    
    switch (command) {
      case 'start':
        await commands.handleStart(message, supabase);
        break;
      case 'stats':
        await commands.handleStats(message, supabase);
        break;
      case 'duel':
        await commands.handleDuel(message);
        break;
      case 'streak':
        await commands.handleStreak(message, supabase);
        break;
      case 'help':
        await commands.handleHelp(message);
        break;
      case 'settings':
        await commands.handleSettings(message);
        break;
      case 'tips':
        await commands.handleTips(message, supabase);
        break;
      default:
        await commands.sendMessage({
          chat_id: message.chat.id,
          text: '❓ Неизвестная команда. Используй /help для списка команд.',
          reply_markup: keyboards.getMainMenuKeyboard()
        });
    }
  } else {
    // Обработка обычных текстовых сообщений
    await commands.sendMessage({
      chat_id: message.chat.id,
      text: 'Используй команды или кнопки меню для навигации. Напиши /help для справки.',
      reply_markup: keyboards.getMainMenuKeyboard()
    });
  }
}

async function handleLinkToken(param: string, user: any, message: any, supabase: any) {
  const tokenString = param.replace('link_', '').trim();
  if (!tokenString) {
    await commands.sendMessage({
      chat_id: message.chat.id,
      text: '⚠️ Неверный токен привязки. Попробуйте сгенерировать новый в приложении.',
    });
    return;
  }

  try {
    const { data, error } = await supabase.rpc('link_telegram_user', {
      p_token: tokenString,
      p_telegram_id: user.id,
      p_username: user.username || user.first_name || null,
    });

    if (error) {
      console.error('[Telegram Bot] Link RPC error:', error);
      throw error;
    }

    console.log('[Telegram Bot] Link result:', data);
    await commands.sendMessage({
      chat_id: message.chat.id,
      text: '✅ Аккаунт успешно связан! Теперь я смогу помогать прямо здесь.',
      reply_markup: keyboards.getMainMenuKeyboard(),
    });
  } catch (err) {
    console.error('[Telegram Bot] Failed to link token:', err);
    await commands.sendMessage({
      chat_id: message.chat.id,
      text: '❌ Не удалось привязать аккаунт. Попробуйте снова или сгенерируйте новый токен.',
    });
  }
}

// =====================================================
// Обработка callback-запросов (нажатия на кнопки)
// =====================================================
async function handleCallbackQuery(query: TelegramCallbackQuery, supabase: any): Promise<void> {
  const data = query.data || '';
  const user = query.from;
  const message = query.message;

  console.log(`[Telegram Bot] Callback from @${user.username || user.id}: ${data}`);

  // Всегда отвечаем на callback, чтобы убрать "часики"
  await answerCallbackQuery({ callback_query_id: query.id });

  if (!message) return;

  // Аутентифицируем пользователя
  await authenticateUser(user, supabase);

  // Роутинг по callback_data
  try {
    if (data === 'main_menu') {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: '🏠 Главное меню\n\nВыбери действие:',
        reply_markup: keyboards.getMainMenuKeyboard()
      });
    } 
    else if (data === 'stats') {
      await showStats(message.chat.id, user.id, supabase);
    }
    else if (data === 'streak') {
      await showStreak(message.chat.id, user.id, supabase);
    }
    else if (data === 'duel_create') {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: '⚔️ Дуэли\n\nСоздай дуэль и пригласи друга!',
        reply_markup: keyboards.getDuelMenuKeyboard()
      });
    }
    else if (data === 'progress') {
      await showProgress(message.chat.id, user.id, supabase);
    }
    else if (data === 'settings') {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: '⚙️ Настройки\n\nВыбери параметр:',
        reply_markup: keyboards.getSettingsKeyboard()
      });
    }
    else if (data === 'settings_notifications') {
      await showNotificationSettings(message.chat.id, message.message_id, user.id, supabase);
    }
    else if (data === 'settings_language') {
      await showLanguageSettings(message.chat.id, message.message_id, user.id, supabase);
    }
    else if (data === 'settings_quiet_hours' || data === 'quiet_mode_menu') {
      await showQuietModeMenu(message.chat.id, message.message_id, user.id, supabase);
    }
    else if (data === 'toggle_notifications') {
      await toggleNotifications(message.chat.id, message.message_id, user.id, supabase);
    }
    else if (data === 'toggle_only_important') {
      await toggleOnlyImportant(message.chat.id, message.message_id, user.id, supabase);
    }
    else if (data.startsWith('toggle_category_')) {
      const category = data.replace('toggle_category_', '');
      await toggleCategoryPreference(message.chat.id, message.message_id, user.id, category, supabase);
    }
    else if (data.startsWith('quiet_mode_')) {
      const action = data.replace('quiet_mode_', '');
      await handleQuietModeAction(message.chat.id, message.message_id, user.id, action, supabase);
    }
    else if (data.startsWith('set_language_')) {
      const lang = data.replace('set_language_', '');
      await setLanguage(message.chat.id, message.message_id, user.id, lang, supabase);
    }
    else if (data === 'help') {
      await commands.handleHelp(message);
    }
    else if (data === 'tips_menu') {
      await showTipsMenu(message.chat.id, message.message_id, user.id, supabase);
    }
    else if (data.startsWith('tips_topic_')) {
      const topicSlug = data.replace('tips_topic_', '');
      await showTipByTopic(message.chat.id, message.message_id, user.id, topicSlug, supabase);
    }
    else if (data.startsWith('tips_next_')) {
      const [, topicSlug, tipId] = data.split('_').slice(1);
      if (topicSlug && tipId) {
        await showNextTip(message.chat.id, message.message_id, user.id, topicSlug, tipId, supabase);
      }
    }
    else {
      await answerCallbackQuery({
        callback_query_id: query.id,
        text: 'Эта функция скоро будет доступна!',
        show_alert: false
      });
    }
  } catch (error) {
    console.error('[Telegram Bot] Error handling callback:', error);
    await answerCallbackQuery({
      callback_query_id: query.id,
      text: '❌ Произошла ошибка. Попробуй позже.',
      show_alert: true
    });
  }
}

// =====================================================
// Вспомогательные функции
// =====================================================

// Аутентификация пользователя в БД
async function authenticateUser(user: any, supabase: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        telegram_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || null,
        username: user.username || null,
        language_code: user.language_code || 'ru',
        is_premium: user.is_premium || false,
        platform: 'telegram',
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'telegram_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[Telegram Bot] Auth error:', error);
    } else {
      console.log(`[Telegram Bot] User authenticated: ${user.id}`);
    }
  } catch (error) {
    console.error('[Telegram Bot] Auth exception:', error);
  }
}

// Показать статистику
async function showStats(chatId: number, telegramId: number, supabase: any): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!profile) {
    await commands.sendMessage({
      chat_id: chatId,
      text: '❌ Профиль не найден'
    });
    return;
  }

  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!metrics) {
    await commands.sendMessage({
      chat_id: chatId,
      text: '📊 У тебя пока нет статистики. Начни обучение!',
      reply_markup: keyboards.getOpenAppKeyboard()
    });
    return;
  }

  const accuracy = metrics.total_questions_answered > 0
    ? ((metrics.correct_answers / metrics.total_questions_answered) * 100).toFixed(1)
    : '0';

  const statsText = `
📊 <b>Твоя статистика</b>

🎯 Готовность: <b>${metrics.readiness_level || 0}%</b>
🔥 Серия: <b>${metrics.streak_days || 0} дней</b>

📝 Тесты: ${metrics.total_tests_completed || 0}
⚔️ Дуэли: ${metrics.total_duels_played || 0}
✅ Точность: ${accuracy}%
`.trim();

  await commands.sendMessage({
    chat_id: chatId,
    text: statsText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getBackToMenuKeyboard()
  });
}

// Показать серию
async function showStreak(chatId: number, telegramId: number, supabase: any): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!profile) return;

  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('streak_days')
    .eq('user_id', profile.id)
    .maybeSingle();

  const streakDays = metrics?.streak_days || 0;

  await commands.sendMessage({
    chat_id: chatId,
    text: `🔥 Твоя серия: <b>${streakDays} дней</b>\n\n${streakDays === 0 ? 'Начни заниматься каждый день!' : 'Отлично! Продолжай в том же духе!'}`,
    parse_mode: 'HTML',
    reply_markup: keyboards.getOpenAppKeyboard('learn')
  });
}

// Показать прогресс
async function showProgress(chatId: number, telegramId: number, supabase: any): Promise<void> {
  await commands.sendMessage({
    chat_id: chatId,
    text: '📈 Прогресс обучения\n\nОткрой приложение, чтобы увидеть детальный прогресс по всем темам.',
    reply_markup: keyboards.getOpenAppKeyboard('dashboard')
  });
}

// Показать настройки уведомлений
async function showNotificationSettings(
  chatId: number, 
  messageId: number, 
  telegramId: number, 
  supabase: any
): Promise<void> {
  const { profile, settings } = await loadNotificationSettings(telegramId, supabase);
  if (!profile) return;

  const state = buildNotificationKeyboardState(settings);
  const text = buildNotificationSettingsText(state);

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboards.getNotificationSettingsKeyboard(state)
  });
}

// Показать настройки языка
async function showLanguageSettings(
  chatId: number,
  messageId: number,
  telegramId: number,
  supabase: any
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, language_code')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  const currentLang = profile?.language_code || 'ru';

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: '🌍 Выбери язык:',
    reply_markup: keyboards.getLanguageKeyboard(currentLang)
  });
}

// Переключить уведомления
async function toggleNotifications(
  chatId: number,
  messageId: number,
  telegramId: number,
  supabase: any
): Promise<void> {
  const { profile, settings } = await loadNotificationSettings(telegramId, supabase);
  if (!profile) return;

  const newEnabled = !(settings?.enabled ?? true);

  await upsertNotificationSettings(profile.id, { enabled: newEnabled }, supabase);
  await showNotificationSettings(chatId, messageId, telegramId, supabase);
}

// Установить язык
async function setLanguage(
  chatId: number,
  messageId: number,
  telegramId: number,
  lang: string,
  supabase: any
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!profile) return;

  await supabase
    .from('profiles')
    .update({ language_code: lang, updated_at: new Date().toISOString() })
    .eq('id', profile.id);

  await supabase
    .from('user_notification_settings')
    .upsert({
      user_id: profile.id,
      preferred_language: lang,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  const langNames: Record<string, string> = {
    ru: 'Русский 🇷🇺',
    es: 'Español 🇪🇸',
    en: 'English 🇬🇧'
  };

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: `✅ Язык изменён на ${langNames[lang] || lang}`,
    reply_markup: keyboards.getBackToMenuKeyboard()
  });
}

async function toggleOnlyImportant(
  chatId: number,
  messageId: number,
  telegramId: number,
  supabase: any
): Promise<void> {
  const { profile, settings } = await loadNotificationSettings(telegramId, supabase);
  if (!profile) return;

  const newValue = !(settings?.only_important ?? false);
  await upsertNotificationSettings(profile.id, { only_important: newValue }, supabase);
  await showNotificationSettings(chatId, messageId, telegramId, supabase);
}

async function toggleCategoryPreference(
  chatId: number,
  messageId: number,
  telegramId: number,
  category: string,
  supabase: any
): Promise<void> {
  if (!['duel', 'progress', 'motivation', 'educational'].includes(category)) {
    return;
  }

  const { profile, settings } = await loadNotificationSettings(telegramId, supabase);
  if (!profile) return;

  const categories = parseCategories(settings?.categories_enabled);
  const mutable = categories ? [...categories] : [...ALL_CATEGORIES];
  const index = mutable.indexOf(category);

  if (categories === null || categories.length === 0) {
    // все включены по умолчанию, значит отключаем выбранную
    const next = [...ALL_CATEGORIES].filter((c) => c !== category);
    await upsertNotificationSettings(profile.id, { categories_enabled: next }, supabase);
  } else if (index >= 0) {
    mutable.splice(index, 1);
    await upsertNotificationSettings(profile.id, { categories_enabled: mutable }, supabase);
  } else {
    mutable.push(category);
    await upsertNotificationSettings(profile.id, { categories_enabled: mutable }, supabase);
  }

  await showNotificationSettings(chatId, messageId, telegramId, supabase);
}

async function showQuietModeMenu(
  chatId: number,
  messageId: number,
  telegramId: number,
  supabase: any
): Promise<void> {
  const { settings } = await loadNotificationSettings(telegramId, supabase);
  const { label } = getQuietModeState(settings);

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: '🌙 <b>Тихий режим</b>\n\nОтключи уведомления на время, если нужен фокус. Важные события (например, покупки) всё равно можно посмотреть в истории.',
    parse_mode: 'HTML',
    reply_markup: keyboards.getQuietModeKeyboard(label)
  });
}

async function handleQuietModeAction(
  chatId: number,
  messageId: number,
  telegramId: number,
  action: string,
  supabase: any
): Promise<void> {
  const { profile } = await loadNotificationSettings(telegramId, supabase);
  if (!profile) return;

  let quietUntil: string | null = null;
  const now = new Date();

  if (action === '12h') {
    quietUntil = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  } else if (action === '7d') {
    quietUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (action === 'off') {
    quietUntil = null;
  }

  await upsertNotificationSettings(
    profile.id,
    { quiet_mode_until: quietUntil },
    supabase
  );

  await showQuietModeMenu(chatId, messageId, telegramId, supabase);
}

const CATEGORY_KEYS = ['duel', 'progress', 'motivation', 'educational'] as const;
const CATEGORY_LABELS: Record<typeof CATEGORY_KEYS[number], string> = {
  duel: 'Дуэли',
  progress: 'Прогресс',
  motivation: 'Мотивация',
  educational: 'Подсказки тем'
};
const ALL_CATEGORIES = ['duel', 'progress', 'motivation', 'educational', 'system', 'monetization', 'premium', 'daily'];

async function loadNotificationSettings(telegramId: number, supabase: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!profile) {
    return { profile: null, settings: null };
  }

  const { data: settings } = await supabase
    .from('user_notification_settings')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle();

  return { profile, settings };
}

function parseCategories(raw: any): string[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function buildNotificationKeyboardState(settings: any): NotificationKeyboardState {
  const categories = parseCategories(settings?.categories_enabled);
  const quietState = getQuietModeState(settings);

  const state: NotificationKeyboardState = {
    enabled: settings?.enabled ?? true,
    onlyImportant: settings?.only_important ?? false,
    categories: {
      duel: isCategoryEnabled('duel', categories),
      progress: isCategoryEnabled('progress', categories),
      motivation: isCategoryEnabled('motivation', categories),
      educational: isCategoryEnabled('educational', categories)
    },
    quietModeActive: quietState.active,
    quietModeLabel: quietState.label
  };

  return state;
}

function buildNotificationSettingsText(state: NotificationKeyboardState): string {
  const status = state.enabled ? '✅ Включены' : '❌ Выключены';
  const important = state.onlyImportant
    ? '⭐ Режим "Только важное": включён'
    : '⭐ Режим "Только важное": выключен';
  const quiet = state.quietModeActive
    ? `🌙 Тихий режим активен до ${state.quietModeLabel}`
    : '🌙 Тихий режим выключен';

  const categoriesLines = CATEGORY_KEYS
    .map((key) => `${state.categories[key] ? '✅' : '⬜'} ${CATEGORY_LABELS[key]}`)
    .join('\n');

  return `🔔 <b>Настройки уведомлений</b>

Статус: ${status}
${important}
${quiet}

Категории:
${categoriesLines}`.trim();
}

function isCategoryEnabled(category: typeof CATEGORY_KEYS[number], categories: string[] | null): boolean {
  if (!categories || categories.length === 0) return true;
  return categories.includes(category);
}

function getQuietModeState(settings: any): { active: boolean; label?: string } {
  if (!settings?.quiet_mode_until) {
    return { active: false };
  }

  const until = new Date(settings.quiet_mode_until);
  if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
    return { active: false };
  }

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    active: true,
    label: formatter.format(until)
  };
}

async function upsertNotificationSettings(
  profileId: string,
  patch: Record<string, any>,
  supabase: any
) {
  await supabase
    .from('user_notification_settings')
    .upsert({
      user_id: profileId,
      ...patch,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
}

// =====================================================
// Учебные советы
// =====================================================

async function showTipsMenu(
  chatId: number,
  messageId: number,
  telegramId: number,
  supabase: any
): Promise<void> {
  const { topics } = await fetchTipTopics(telegramId, supabase);

  if (!topics.length) {
    await editMessage({
      chat_id: chatId,
      message_id: messageId,
      text: '🧠 Советы появятся чуть позже. Я подготовлю новые подсказки и напомню.',
      reply_markup: keyboards.getBackToMenuKeyboard()
    });
    return;
  }

  const intro = `
🧠 <b>Учебные советы Skily</b>

Выбери тему, чтобы получить короткий инсайт и быстрый переход в нужный раздел приложения.
`.trim();

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: intro,
    parse_mode: 'HTML',
    reply_markup: keyboards.getTipsTopicsKeyboard(topics)
  });
}

async function showTipByTopic(
  chatId: number,
  messageId: number,
  telegramId: number,
  topicSlug: string,
  supabase: any
): Promise<void> {
  const language = await getUserLanguage(telegramId, supabase);
  const tip = await fetchTip(topicSlug, language, supabase);

  if (!tip) {
    await editMessage({
      chat_id: chatId,
      message_id: messageId,
      text: 'Пока нет советов по этой теме. Попробуй выбрать другую.',
      reply_markup: keyboards.getTipsTopicsKeyboard([])
    });
    return;
  }

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: formatTipText(tip),
    parse_mode: 'HTML',
    reply_markup: keyboards.getTipActionsKeyboard(topicSlug, tip)
  });
}

async function showNextTip(
  chatId: number,
  messageId: number,
  telegramId: number,
  topicSlug: string,
  tipId: string,
  supabase: any
): Promise<void> {
  const language = await getUserLanguage(telegramId, supabase);

  const { data: current } = await supabase
    .from('bot_tips')
    .select('sort_order')
    .eq('id', tipId)
    .maybeSingle();

  const nextTip = await fetchTip(
    topicSlug,
    language,
    supabase,
    typeof current?.sort_order === 'number' ? current.sort_order : undefined,
    tipId
  );

  if (!nextTip) {
    await commands.sendMessage({
      chat_id: chatId,
      text: 'Пока это все советы по теме. Скоро добавлю новые материалы!',
      reply_markup: keyboards.getTipsTopicsKeyboard([])
    });
    return;
  }

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: formatTipText(nextTip),
    parse_mode: 'HTML',
    reply_markup: keyboards.getTipActionsKeyboard(topicSlug, nextTip)
  });
}

async function fetchTipTopics(
  telegramId: number,
  supabase: any
): Promise<{ language: string; topics: Array<{ topic_slug: string; topic_title: string; topic_icon?: string | null }> }> {
  const language = await getUserLanguage(telegramId, supabase);

  const { data } = await supabase
    .from('bot_tips')
    .select('topic_slug, topic_title, topic_icon')
    .eq('language', language)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const uniqueTopics: Array<{ topic_slug: string; topic_title: string; topic_icon?: string | null }> = [];
  const seen = new Set<string>();

  (data || []).forEach((topic) => {
    if (topic.topic_slug && !seen.has(topic.topic_slug)) {
      seen.add(topic.topic_slug);
      uniqueTopics.push(topic);
    }
  });

  return { language, topics: uniqueTopics };
}

async function fetchTip(
  topicSlug: string,
  language: string,
  supabase: any,
  afterSortOrder?: number,
  excludeId?: string
): Promise<any | null> {
  let query = supabase
    .from('bot_tips')
    .select('*')
    .eq('topic_slug', topicSlug)
    .eq('language', language)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1);

  if (typeof afterSortOrder === 'number') {
    query = query.gt('sort_order', afterSortOrder);
  }

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Telegram Bot] fetchTip error:', error);
    return null;
  }

  if (data && data.length > 0) {
    return data[0];
  }

  if (typeof afterSortOrder === 'number') {
    // цикл закончился — берём первый совет
    return fetchTip(topicSlug, language, supabase, undefined, excludeId);
  }

  return null;
}

async function getUserLanguage(telegramId: number, supabase: any): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('language_code')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  return data?.language_code || 'ru';
}

function formatTipText(tip: any): string {
  const header = `${tip.topic_icon || '🧠'} <b>${tip.title}</b>`;
  const summary = tip.summary ? `\n\n💡 ${tip.summary}` : '';
  const skill = tip.skill_level && tip.skill_level !== 'all'
    ? `\n\n🎯 Уровень: ${tip.skill_level}`
    : '';

  return `${header}\n\n${tip.tip_body}${summary}${skill}`.trim();
}

// =====================================================
// Telegram API Utilities
// =====================================================

async function answerCallbackQuery(options: AnswerCallbackQueryOptions): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
  } catch (error) {
    console.error('[Telegram Bot] Failed to answer callback:', error);
  }
}

async function editMessage(options: EditMessageTextOptions): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
  } catch (error) {
    console.error('[Telegram Bot] Failed to edit message:', error);
  }
}

