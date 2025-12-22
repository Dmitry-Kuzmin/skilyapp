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
  TelegramInlineQuery,
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
const EXPRESS_QUESTION_LIMIT = 3;
const EXPRESS_DAILY_LIMIT = 3;
const EXPRESS_OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

console.log('[Telegram Bot] Starting webhook handler...');

// =====================================================
// Установка Menu Button WebApp при старте (один раз)
// =====================================================
// КРИТИЧНО: Это устанавливает Menu Button как WebApp, а не просто URL
// Это позволяет приложению открываться на весь экран (fullscreen)
if (BOT_TOKEN) {
  import('./commands.ts').then(async (commands) => {
    try {
      await commands.setupMenuButton();
    } catch (error) {
      console.error('[Telegram Bot] Failed to setup Menu Button:', error);
    }
  });
}

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
    } else if (update.inline_query) {
      await handleInlineQuery(update.inline_query);
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
  const chat = message.chat;

  if (!user) return;

  console.log(`[Telegram Bot] Message from @${user.username || user.id}: ${text}`);

  // Аутентифицируем пользователя в нашей БД
  await authenticateUser(user, supabase);

  // Синхронизируем участника группы, если сообщение из группы
  if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
    try {
      // Получаем профиль пользователя
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', user.id)
        .single();

      if (profile) {
        // Добавляем/обновляем участника группы
        await supabase.rpc('upsert_chat_member', {
          p_chat_id: chat.id,
          p_chat_type: chat.type,
          p_chat_title: chat.title || null,
          p_telegram_id: user.id,
          p_user_id: profile.id,
        });
        console.log(`[Telegram Bot] Synced chat member: chat_id=${chat.id}, user_id=${profile.id}`);
      }
    } catch (error) {
      console.error('[Telegram Bot] Error syncing chat member:', error);
      // Не прерываем обработку сообщения из-за ошибки синхронизации
    }
  }

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
        console.log('[Telegram Bot] 🚀 Обработка команды /start, вызываю handleStart...');
        try {
          await commands.handleStart(message, supabase);
          console.log('[Telegram Bot] ✅ handleStart завершился успешно');
        } catch (error) {
          console.error('[Telegram Bot] ❌ Ошибка в handleStart:', error);
          console.error('[Telegram Bot] Error stack:', error.stack);
          throw error; // Пробрасываем ошибку дальше
        }
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
      case 'express':
        await startExpressTestFlow(message.chat.id, user.id, supabase);
        break;
      case 'guide':
        await sendGuideMenu(message.chat.id, user.id, supabase);
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
    // Новые современные кнопки
    else if (data === 'profile') {
      await showProfile(message.chat.id, user.id, supabase);
    }
    else if (data === 'duel_inline') {
      // Показываем инструкцию для вызова друга через inline mode
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: `⚔️ <b>Вызвать друга на дуэль</b>

Чтобы бросить вызов, напиши в любом чате:

<code>@skilyapp_bot дуэль</code>

Я создам красивую карточку с приглашением! 🎴

Или открой приложение и создай дуэль там:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Создать в приложении', web_app: { url: `${MINI_APP_URL}/games/duel` } }],
            [{ text: '« Назад', callback_data: 'main_menu' }]
          ]
        }
      });
    }
    // Старые обработчики (для совместимости)
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
    else if (data === 'guide_menu') {
      await showGuideMenu(message.chat.id, message.message_id, user.id, supabase);
    }
    else if (data.startsWith('guide_category_')) {
      const categorySlug = data.replace('guide_category_', '');
      await showGuideCategory(message.chat.id, message.message_id, user.id, categorySlug, supabase);
    }
    else if (data.startsWith('guide_section_')) {
      const parts = data.split('_');
      const categorySlug = parts[2];
      const sectionSlug = parts.slice(3).join('_');
      await showGuideSection(message.chat.id, message.message_id, user.id, categorySlug, sectionSlug, supabase);
    }
    else if (data.startsWith('express_answer_')) {
      const parts = data.split('_');
      const sessionCode = parts[2];
      const optionIndex = Number(parts[3]);
      await handleExpressAnswer(query, sessionCode, optionIndex, supabase);
    }
    else if (data.startsWith('express_restart_')) {
      const sessionCode = data.split('_')[2];
      await startExpressTestFlow(message.chat.id, user.id, supabase, { restartFrom: sessionCode });
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
// Обработка inline-запросов (для шеринга статей)
// =====================================================

// Данные статей для inline-результатов
const ARTICLES_DATA: Record<string, { title: string; description: string; category: string; readTime: number }> = {
  'novye-voprosy-dgt-2025': {
    title: 'Новые типы вопросов DGT в 2025',
    description: 'Свежие требования экзамена и рабочие приёмы подготовки с помощью Skilyapp.',
    category: 'Актуально',
    readTime: 15
  },
  'gamifikaciya-podgotovki': {
    title: 'Геймификация подготовки: держи темп 60 дней',
    description: 'Как превращать подготовку в игру: рейтинги, награды и напоминания Skilyapp.',
    category: 'Советы',
    readTime: 9
  },
  'pervaya-poezdka-s-instruktorom': {
    title: 'Первая поездка с инструктором',
    description: 'Чего ожидать на первом практическом занятии и как к нему подготовиться.',
    category: 'Подготовка',
    readTime: 8
  },
  'kak-russkim-sdat-dgt': {
    title: 'Как русским сдать DGT с первого раза',
    description: 'Полное руководство для русскоязычных: от записи до получения прав.',
    category: 'Подготовка',
    readTime: 16
  },
  'tipichnye-oshibki-na-ekzamene': {
    title: 'Типичные ошибки на экзамене DGT',
    description: 'Разбираем самые частые ошибки и как их избежать.',
    category: 'Советы',
    readTime: 12
  }
};

async function handleInlineQuery(query: TelegramInlineQuery): Promise<void> {
  const queryText = query.query.trim().toLowerCase();
  console.log(`[Telegram Bot] Inline query from @${query.from.username || query.from.id}: "${queryText}"`);

  const results: any[] = [];

  // Формат запроса: article:slug
  if (queryText.startsWith('article:')) {
    const slug = queryText.replace('article:', '').trim();
    const article = ARTICLES_DATA[slug];

    if (article) {
      // Создаём красивую карточку статьи
      results.push({
        type: 'article',
        id: `article_${slug}`,
        title: article.title,
        description: `${article.category} • ${article.readTime} мин чтения`,
        input_message_content: {
          message_text: `📚 <b>${article.title}</b>\n\n${article.description}\n\n🏷 ${article.category} • ⏱ ${article.readTime} мин`,
          parse_mode: 'HTML'
        },
        reply_markup: {
          inline_keyboard: [[
            {
              text: '📖 Читать статью',
              url: `https://t.me/skilyapp_bot/app?startapp=blog_${slug}`
            }
          ]]
        },
        thumb_url: 'https://skilyapp.com/og-image.png',
        thumb_width: 512,
        thumb_height: 512
      });
    }
  }

  // Если нет результатов или пустой запрос, показываем дуэль + статьи
  if (results.length === 0) {
    // Первый результат: Дуэль (самая важная опция)
    results.push({
      type: 'article',
      id: 'duel_invite',
      title: '⚔️ Вызвать на дуэль',
      description: 'Брось вызов другу прямо в этом чате!',
      input_message_content: {
        message_text: `⚔️ <b>Вызов на дуэль!</b>

<b>${query.from.first_name || 'Кто-то'}</b> бросает тебе перчатку! 🧤

🎯 Тема: ПДД Испании
⏱ 10 вопросов • 60 секунд на ответ
🏆 На кону: честь и слава

<i>Примешь вызов?</i>`,
        parse_mode: 'HTML'
      },
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🎮 Принять вызов!',
            url: `https://t.me/skilyapp_bot/app?startapp=duel_new`
          }
        ]]
      },
      thumb_url: 'https://skilyapp.com/images/duel-icon.png',
      thumb_width: 512,
      thumb_height: 512
    });

    // Добавляем статьи
    for (const [slug, article] of Object.entries(ARTICLES_DATA)) {
      results.push({
        type: 'article',
        id: `article_${slug}`,
        title: article.title,
        description: `${article.category} • ${article.readTime} мин чтения`,
        input_message_content: {
          message_text: `📚 <b>${article.title}</b>\n\n${article.description}\n\n🏷 ${article.category} • ⏱ ${article.readTime} мин`,
          parse_mode: 'HTML'
        },
        reply_markup: {
          inline_keyboard: [[
            {
              text: '📖 Читать статью',
              url: `https://t.me/skilyapp_bot/app?startapp=blog_${slug}`
            }
          ]]
        },
        thumb_url: 'https://skilyapp.com/og-image.png',
        thumb_width: 512,
        thumb_height: 512
      });
    }
  }

  // Специальные запросы
  if (queryText === 'дуэль' || queryText === 'duel' || queryText === 'вызов') {
    // Только дуэль
    results.unshift({
      type: 'article',
      id: 'duel_challenge',
      title: '⚔️ Бросить вызов!',
      description: 'Создать приглашение на дуэль',
      input_message_content: {
        message_text: `⚔️ <b>Дуэль на ПДД!</b>

<b>${query.from.first_name || 'Претендент'}</b> вызывает тебя на дуэль! 🔥

🎯 10 вопросов по ПДД Испании
⏱ 60 секунд на каждый
🏆 Победитель забирает славу!

<i>Готов сразиться?</i>`,
        parse_mode: 'HTML'
      },
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🎮 Принять вызов!',
            url: `https://t.me/skilyapp_bot/app?startapp=duel_new`
          }
        ]]
      },
      thumb_url: 'https://skilyapp.com/images/duel-icon.png',
      thumb_width: 512,
      thumb_height: 512
    });
  }

  // Отправляем результаты
  try {
    const response = await fetch(`${TELEGRAM_API}/answerInlineQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inline_query_id: query.id,
        results: results.slice(0, 50), // Telegram лимит - 50 результатов
        cache_time: 300, // Кешируем на 5 минут
        is_personal: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram Bot] answerInlineQuery error:', error);
    } else {
      console.log(`[Telegram Bot] ✅ Answered inline query with ${results.length} results`);
    }
  } catch (error) {
    console.error('[Telegram Bot] Failed to answer inline query:', error);
  }
}

// =====================================================
// Показать профиль (современная карточка)
// =====================================================
async function showProfile(chatId: number, telegramId: number, supabase: any): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!profile) {
    await commands.sendMessage({
      chat_id: chatId,
      text: '❌ Профиль не найден. Открой приложение, чтобы создать!',
      reply_markup: keyboards.getMainMenuKeyboard()
    });
    return;
  }

  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle();

  const userName = profile.first_name || profile.username || 'Пилот';
  const streak = metrics?.streak_days || 0;
  const readiness = metrics?.readiness_level || 0;
  const tests = metrics?.total_tests_completed || 0;
  const duels = metrics?.total_duels_played || 0;
  const correctAnswers = metrics?.correct_answers || 0;
  const totalAnswers = metrics?.total_questions_answered || 0;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  // Определяем ранг
  let rank = '🌱 Новичок';
  if (readiness >= 80) rank = '🏆 Мастер';
  else if (readiness >= 60) rank = '⭐ Эксперт';
  else if (readiness >= 40) rank = '🚀 Продвинутый';
  else if (readiness >= 20) rank = '📚 Ученик';

  const profileText = `
<b>👤 ${userName}</b>

${rank}
━━━━━━━━━━━━━━━

🎯 Готовность: <b>${readiness}%</b>
🔥 Серия: <b>${streak} дней</b>
📝 Тестов: <b>${tests}</b>
⚔️ Дуэлей: <b>${duels}</b>
✅ Точность: <b>${accuracy}%</b>

━━━━━━━━━━━━━━━
<i>Открой приложение для детальной статистики</i>
`.trim();

  await commands.sendMessage({
    chat_id: chatId,
    text: profileText,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Детальная статистика', web_app: { url: `${MINI_APP_URL}/dashboard` } }],
        [{ text: '« Назад', callback_data: 'main_menu' }]
      ]
    }
  });
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
// Экспресс-тесты
// =====================================================

type ExpressQuestionSnapshot = {
  index: number;
  question_id: string;
  text: string;
  topic?: string | null;
  explanation?: string | null;
  options: Array<{
    index: number;
    label: string;
    text: string;
    is_correct: boolean;
  }>;
};

type ExpressSession = {
  id: string;
  session_code: string;
  user_id: string;
  telegram_id: number;
  status: string;
  question_snapshots: ExpressQuestionSnapshot[];
  answers: any[];
  current_index: number;
  total_questions: number;
  correct_count: number;
  language_code?: string;
};

async function startExpressTestFlow(
  chatId: number,
  telegramId: number,
  supabase: any,
  options: { restartFrom?: string } = {}
): Promise<void> {
  const profile = await getProfileByTelegramId(telegramId, supabase);

  if (!profile) {
    await commands.sendMessage({
      chat_id: chatId,
      text: '⚠️ Чтобы пройти экспресс-тест, сначала привяжи аккаунт в приложении (профиль → Telegram).'
    });
    return;
  }

  const dailyCount = await getExpressDailyCount(profile.id, supabase);
  if (dailyCount >= EXPRESS_DAILY_LIMIT) {
    await commands.sendMessage({
      chat_id: chatId,
      text: `⚡️ Ты уже прошёл ${EXPRESS_DAILY_LIMIT} экспресс-тест(а) сегодня. Завтра подготовлю новые вопросы!`,
      reply_markup: keyboards.getBackToMenuKeyboard()
    });
    return;
  }

  const session = await createExpressSession(profile, supabase);

  if (!session) {
    await commands.sendMessage({
      chat_id: chatId,
      text: 'Не нашёл подходящих вопросов для мини-теста. Попробуй позже — я обновлю подборку.',
      reply_markup: keyboards.getBackToMenuKeyboard()
    });
    return;
  }

  const intro = options.restartFrom
    ? '🔁 Новый экспресс-тест готов!'
    : '⚡️ Экспресс-тест: 3 ключевых вопроса. Отвечай прямо здесь.';

  await commands.sendMessage({
    chat_id: chatId,
    text: intro
  });

  await sendExpressQuestion(chatId, session, 0);
}

async function handleExpressAnswer(
  query: TelegramCallbackQuery,
  sessionCode: string,
  optionIndex: number,
  supabase: any
): Promise<void> {
  const message = query.message;
  if (!message) return;

  const chatId = message.chat.id;
  const messageId = message.message_id;
  const user = query.from;

  const session = await loadExpressSession(sessionCode, supabase);

  if (!session || session.telegram_id !== user.id) {
    await editMessage({
      chat_id: chatId,
      message_id: messageId,
      text: 'Сессия недоступна или устарела. Запусти новый экспресс-тест командой /express.',
      reply_markup: keyboards.getBackToMenuKeyboard()
    });
    return;
  }

  if (session.status !== 'active') {
    await editMessage({
      chat_id: chatId,
      message_id: messageId,
      text: 'Эта часть теста уже завершена. Нажми «Пройти ещё», чтобы запустить новый сет вопросов.',
      reply_markup: keyboards.getBackToMenuKeyboard()
    });
    return;
  }

  if (typeof optionIndex !== 'number' || Number.isNaN(optionIndex)) {
    return;
  }

  const question = session.question_snapshots[session.current_index];
  if (!question) {
    return;
  }

  const selectedOption = question.options.find((opt) => opt.index === optionIndex);
  if (!selectedOption) {
    return;
  }

  const correctOption = question.options.find((opt) => opt.is_correct);
  const isCorrect = selectedOption.is_correct;
  const nextIndex = session.current_index + 1;
  const isFinished = nextIndex >= session.total_questions;

  const updatedAnswers = [
    ...(session.answers || []),
    {
      question_index: session.current_index,
      selected_index: optionIndex,
      is_correct: isCorrect,
      answered_at: new Date().toISOString()
    }
  ];

  await supabase
    .from('bot_express_sessions')
    .update({
      answers: updatedAnswers,
      correct_count: session.correct_count + (isCorrect ? 1 : 0),
      current_index: nextIndex,
      status: isFinished ? 'completed' : 'active',
      completed_at: isFinished ? new Date().toISOString() : null
    })
    .eq('id', session.id);

  const reviewText = formatExpressAnswerText(
    question,
    selectedOption,
    correctOption,
    isCorrect,
    session.current_index + 1,
    session.total_questions
  );

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: reviewText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getBackToMenuKeyboard()
  });

  const updatedSession: ExpressSession = {
    ...session,
    current_index: nextIndex,
    correct_count: session.correct_count + (isCorrect ? 1 : 0),
    answers: updatedAnswers,
    status: isFinished ? 'completed' : 'active'
  };

  if (isFinished) {
    await sendExpressSummary(chatId, updatedSession);
  } else {
    await sendExpressQuestion(chatId, updatedSession, nextIndex);
  }
}

async function sendExpressQuestion(
  chatId: number,
  session: ExpressSession,
  questionIndex: number
): Promise<void> {
  const question = session.question_snapshots[questionIndex];
  if (!question) return;

  const text = formatExpressQuestionText(question, questionIndex + 1, session.total_questions);
  const keyboard = keyboards.getExpressOptionsKeyboard(
    session.session_code,
    question.options.map((opt) => ({
      label: `${opt.label}`,
      index: opt.index
    }))
  );

  await commands.sendMessage({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}

async function sendExpressSummary(chatId: number, session: ExpressSession): Promise<void> {
  const accuracy = Math.round((session.correct_count / session.total_questions) * 100);
  const summaryText = `
⚡️ <b>Экспресс-тест завершён</b>

Правильных ответов: <b>${session.correct_count}/${session.total_questions}</b>
Точность: <b>${accuracy}%</b>

Разбор вопросов уже лежит в Challenge Bank™. Хочешь ещё раунд — жми «Пройти ещё».
`.trim();

  await commands.sendMessage({
    chat_id: chatId,
    text: summaryText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getExpressSummaryKeyboard(session.session_code)
  });
}

function formatExpressQuestionText(
  question: ExpressQuestionSnapshot,
  index: number,
  total: number
): string {
  const header = `⚡️ Вопрос ${index}/${total}`;
  const topicLine = question.topic ? `\n<b>${escapeHtml(question.topic)}</b>` : '';
  const body = `\n\n${escapeHtml(question.text)}`;
  const optionsText = question.options
    .map((opt) => `<b>${opt.label}.</b> ${escapeHtml(opt.text)}`)
    .join('\n');

  return `${header}${topicLine}${body}\n\n${optionsText}`;
}

function formatExpressAnswerText(
  question: ExpressQuestionSnapshot,
  selected: { label: string; text: string; is_correct: boolean },
  correct: { label: string; text: string } | undefined,
  isCorrect: boolean,
  index: number,
  total: number
): string {
  const icon = isCorrect ? '✅' : '❌';
  const status = isCorrect ? 'Верно!' : 'Неверно';
  const correctLine = correct
    ? `<b>Правильный ответ:</b> ${escapeHtml(correct.label)}. ${escapeHtml(correct.text)}`
    : '';

  const yourAnswer = `<b>Твой ответ:</b> ${escapeHtml(selected.label)}. ${escapeHtml(selected.text)}`;

  return `${icon} <b>${status}</b> (${index}/${total})\n\n${escapeHtml(question.text)}\n\n${yourAnswer}\n${correctLine}`;
}

async function createExpressSession(profile: any, supabase: any): Promise<ExpressSession | null> {
  const language = profile?.language_code || 'ru';
  const snapshots = await pickExpressQuestionSnapshots(profile.id, language, supabase);

  if (snapshots.length === 0) {
    return null;
  }

  const sessionCode = await generateSessionCode(supabase);

  const { data, error } = await supabase
    .from('bot_express_sessions')
    .insert({
      session_code: sessionCode,
      user_id: profile.id,
      telegram_id: profile.telegram_id,
      language_code: language,
      question_snapshots: snapshots,
      total_questions: snapshots.length
    })
    .select('*')
    .maybeSingle();

  if (error || !data) {
    console.error('[Express Test] Failed to create session:', error);
    return null;
  }

  return data as ExpressSession;
}

async function pickExpressQuestionSnapshots(
  userId: string,
  language: string,
  supabase: any
): Promise<ExpressQuestionSnapshot[]> {
  const snapshots: ExpressQuestionSnapshot[] = [];

  const { data: challengeData } = await supabase
    .from('user_challenge_questions')
    .select(`
      question_id,
      questions_new!inner (
        id,
        question_ru,
        question_es,
        question_en,
        explanation_ru,
        explanation_es,
        explanation_en,
        image_url,
        topics (title_ru, title_es),
        answer_options (*)
      )
    `)
    .eq('user_id', userId)
    .eq('mastered', false)
    .order('last_wrong_at', { ascending: false })
    .limit(EXPRESS_QUESTION_LIMIT * 3);

  const challengeQuestions = (challengeData || [])
    .map((row: any) => row.questions_new)
    .filter(Boolean)
    .map((question: any) => buildQuestionSnapshot(question, language))
    .filter((snap): snap is ExpressQuestionSnapshot => !!snap);

  snapshots.push(...challengeQuestions.slice(0, EXPRESS_QUESTION_LIMIT));

  if (snapshots.length < EXPRESS_QUESTION_LIMIT) {
    const { data: fallbackData } = await supabase
      .from('questions_new')
      .select(`
        id,
        question_ru,
        question_es,
        question_en,
        explanation_ru,
        explanation_es,
        explanation_en,
        image_url,
        topics (title_ru, title_es),
        answer_options (*)
      `)
      .limit(50);

    const fallback = shuffle(fallbackData || [])
      .map((question: any) => buildQuestionSnapshot(question, language))
      .filter((snap): snap is ExpressQuestionSnapshot => !!snap);

    for (const snap of fallback) {
      if (!snapshots.find((item) => item.question_id === snap.question_id)) {
        snapshots.push(snap);
      }
      if (snapshots.length >= EXPRESS_QUESTION_LIMIT) break;
    }
  }

  return snapshots
    .slice(0, EXPRESS_QUESTION_LIMIT)
    .map((snap, idx) => ({ ...snap, index: idx }));
}

function buildQuestionSnapshot(question: any, language: string): ExpressQuestionSnapshot | null {
  if (!question?.answer_options || question.answer_options.length === 0) {
    return null;
  }

  const localizedQuestion =
    question[`question_${language}`] ||
    question.question_ru ||
    question.question_es ||
    question.question_en ||
    'Вопрос';

  const topicTitle =
    question.topics?.[`title_${language}`] ||
    question.topics?.title_ru ||
    question.topics?.title_es ||
    null;

  const options = question.answer_options
    .slice()
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
    .map((option: any, idx: number) => ({
      index: idx,
      label: EXPRESS_OPTION_LABELS[idx] || `#${idx + 1}`,
      text:
        option[`text_${language}`] ||
        option.text_ru ||
        option.text_es ||
        option.text_en ||
        '—',
      is_correct: !!option.is_correct
    }));

  return {
    index: 0,
    question_id: question.id,
    text: localizedQuestion,
    topic: topicTitle,
    explanation:
      question[`explanation_${language}`] ||
      question.explanation_ru ||
      question.explanation_es ||
      question.explanation_en ||
      null,
    options
  };
}

async function loadExpressSession(sessionCode: string, supabase: any): Promise<ExpressSession | null> {
  const { data } = await supabase
    .from('bot_express_sessions')
    .select('*')
    .eq('session_code', sessionCode)
    .maybeSingle();

  return (data as ExpressSession) || null;
}

async function getExpressDailyCount(userId: string, supabase: any): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('bot_express_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString());

  return count || 0;
}

async function generateSessionCode(supabase: any, attempt = 0): Promise<string> {
  const code = createRandomCode(6);

  const { data } = await supabase
    .from('bot_express_sessions')
    .select('id')
    .eq('session_code', code)
    .maybeSingle();

  if (data && attempt < 5) {
    return generateSessionCode(supabase, attempt + 1);
  }

  return code;
}

function createRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function shuffle<T>(array: T[]): T[] {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getProfileByTelegramId(telegramId: number, supabase: any) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  return data;
}

// =====================================================
// FAQ / Guide
// =====================================================

async function sendGuideMenu(
  chatId: number,
  telegramId: number,
  supabase: any
): Promise<void> {
  const { categories } = await fetchGuideCategories(telegramId, supabase);

  if (!categories.length) {
    await commands.sendMessage({
      chat_id: chatId,
      text: 'ℹ️ Гид пока пуст. Я обновлю раздел и сообщу, когда появятся подсказки.',
      reply_markup: keyboards.getBackToMenuKeyboard()
    });
    return;
  }

  const intro = `
ℹ️ <b>Гид по Skilyapp</b>

Выбери тему: расскажу, как работает сезон, дуэли, Premium и экспресс-тесты.
`.trim();

  await commands.sendMessage({
    chat_id: chatId,
    text: intro,
    parse_mode: 'HTML',
    reply_markup: keyboards.getGuideCategoriesKeyboard(categories)
  });
}

async function showGuideMenu(
  chatId: number,
  messageId: number,
  telegramId: number,
  supabase: any
): Promise<void> {
  const { categories } = await fetchGuideCategories(telegramId, supabase);

  if (!categories.length) {
    await editMessage({
      chat_id: chatId,
      message_id: messageId,
      text: 'ℹ️ Пока раздел пуст. Я обновлю гид в ближайшее время.',
      reply_markup: keyboards.getBackToMenuKeyboard()
    });
    return;
  }

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: 'ℹ️ <b>Гид по Skilyapp</b>\n\nВыбери категорию:',
    parse_mode: 'HTML',
    reply_markup: keyboards.getGuideCategoriesKeyboard(categories)
  });
}

async function showGuideCategory(
  chatId: number,
  messageId: number,
  telegramId: number,
  categorySlug: string,
  supabase: any
): Promise<void> {
  const language = await getUserLanguage(telegramId, supabase);
  const sections = await fetchGuideSections(categorySlug, language, supabase);

  if (!sections.length) {
    await editMessage({
      chat_id: chatId,
      message_id: messageId,
      text: 'Пока здесь нет материалов. Выбери другую категорию.',
      reply_markup: keyboards.getGuideCategoriesKeyboard((await fetchGuideCategories(telegramId, supabase)).categories)
    });
    return;
  }

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text: `📘 <b>${escapeHtml(sections[0].category_title || 'Раздел')}</b>\n\nВыбери карточку:`,
    parse_mode: 'HTML',
    reply_markup: keyboards.getGuideSectionsKeyboard(categorySlug, sections)
  });
}

async function showGuideSection(
  chatId: number,
  messageId: number,
  telegramId: number,
  categorySlug: string,
  sectionSlug: string,
  supabase: any
): Promise<void> {
  const language = await getUserLanguage(telegramId, supabase);
  const section = await fetchGuideSection(categorySlug, sectionSlug, language, supabase);

  if (!section) {
    await showGuideCategory(chatId, messageId, telegramId, categorySlug, supabase);
    return;
  }

  const text = formatGuideSectionText(section);

  await editMessage({
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboards.getGuideDetailKeyboard(section, categorySlug)
  });
}

async function fetchGuideCategories(
  telegramId: number,
  supabase: any
): Promise<{ language: string; categories: Array<{ category_slug: string; category_title: string; icon?: string | null }> }> {
  const language = await getUserLanguage(telegramId, supabase);

  const { data } = await supabase
    .from('bot_guide_sections')
    .select('category_slug, category_title, icon')
    .eq('language', language)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const categories: Array<{ category_slug: string; category_title: string; icon?: string | null }> = [];
  const seen = new Set<string>();

  (data || []).forEach((row: any) => {
    if (!seen.has(row.category_slug)) {
      seen.add(row.category_slug);
      categories.push(row);
    }
  });

  return { language, categories };
}

async function fetchGuideSections(
  categorySlug: string,
  language: string,
  supabase: any
): Promise<any[]> {
  const { data } = await supabase
    .from('bot_guide_sections')
    .select('*')
    .eq('language', language)
    .eq('category_slug', categorySlug)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return data || [];
}

async function fetchGuideSection(
  categorySlug: string,
  sectionSlug: string,
  language: string,
  supabase: any
) {
  const { data } = await supabase
    .from('bot_guide_sections')
    .select('*')
    .eq('language', language)
    .eq('category_slug', categorySlug)
    .eq('section_slug', sectionSlug)
    .eq('is_active', true)
    .maybeSingle();

  return data;
}

function formatGuideSectionText(section: any): string {
  const header = `${section.icon || 'ℹ️'} <b>${escapeHtml(section.section_title)}</b>`;
  const summary = section.summary ? `\n\n${escapeHtml(section.summary)}` : '';
  const body = `\n\n${escapeHtml(section.content)}`;
  return `${header}${summary}${body}`;
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

