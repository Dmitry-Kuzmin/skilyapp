// =====================================================
// Обработчики команд Telegram-бота
// =====================================================

import { TelegramMessage, SendMessageOptions } from './types.ts';
import * as keyboards from './keyboards.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PUBLIC_SITE_URL = Deno.env.get('PUBLIC_SITE_URL') || 'https://skilyapp.com';
const SUPPORT_CONTACT = Deno.env.get('SUPPORT_CONTACT') || '@SkilySupport';

// =====================================================
// Утилита для отправки сообщений
// =====================================================
export async function sendMessage(options: SendMessageOptions): Promise<any> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Telegram] Send message error:', error);
      throw new Error(`Telegram API error: ${error.description}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error);
    throw error;
  }
}

// =====================================================
// /start - Приветствие и главное меню
// =====================================================
// =====================================================
// Установка Menu Button WebApp (глобально для всех пользователей)
// =====================================================
export async function setupMenuButton(): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn('[setupMenuButton] BOT_TOKEN not found');
    return;
  }

  const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';

  try {
    const response = await fetch(`${TELEGRAM_API}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '🚀 В БОЙ',
          web_app: {
            url: MINI_APP_URL
          }
        }
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('[setupMenuButton] ✅ Menu Button WebApp установлен глобально');
    } else {
      console.error('[setupMenuButton] ❌ Ошибка установки Menu Button:', result.description);
    }
  } catch (error) {
    console.error('[setupMenuButton] ❌ Ошибка при установке Menu Button:', error);
  }
}

// =====================================================
// Установка Menu Button WebApp для конкретного пользователя
// =====================================================
export async function setupMenuButtonForUser(chatId: number): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn('[setupMenuButtonForUser] BOT_TOKEN not found');
    return;
  }

  const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';

  console.log(`[setupMenuButtonForUser] 🚀 Начинаю установку Menu Button для чата ${chatId}`);
  console.log(`[setupMenuButtonForUser] 📋 URL: ${MINI_APP_URL}`);

  try {
    const requestBody = {
      chat_id: chatId,
      menu_button: {
        type: 'web_app',
        text: '🚀 В БОЙ',
        web_app: {
          url: MINI_APP_URL
        }
      }
    };

    console.log(`[setupMenuButtonForUser] 📤 Отправляю запрос:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${TELEGRAM_API}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log(`[setupMenuButtonForUser] 📥 Ответ от Telegram API (status ${response.status}):`, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error(`[setupMenuButtonForUser] ❌ Не удалось распарсить ответ:`, e);
      console.error(`[setupMenuButtonForUser] ❌ Сырой ответ:`, responseText);
      return;
    }

    if (result.ok) {
      console.log(`[setupMenuButtonForUser] ✅✅✅ Menu Button WebApp успешно установлен для чата ${chatId}`);
    } else {
      console.error(`[setupMenuButtonForUser] ❌❌❌ Ошибка установки Menu Button для чата ${chatId}:`, {
        error_code: result.error_code,
        description: result.description,
        parameters: result.parameters
      });
    }
  } catch (error) {
    console.error(`[setupMenuButtonForUser] ❌❌❌ Критическая ошибка при установке Menu Button для чата ${chatId}:`, error);
    console.error(`[setupMenuButtonForUser] Stack:`, error.stack);
  }
}

export async function handleStart(message: TelegramMessage, supabase: any): Promise<void> {
  console.log('[handleStart] 🚀 ФУНКЦИЯ ВЫЗВАНА! message.chat.id:', message.chat?.id, 'message.from.id:', message.from?.id);

  const user = message.from;
  if (!user) {
    console.error('[handleStart] ❌ message.from отсутствует!');
    return;
  }

  if (!message.chat) {
    console.error('[handleStart] ❌ message.chat отсутствует!');
    return;
  }

  console.log(`[handleStart] 🚀 Обработка команды /start для пользователя ${user.id}, чат ${message.chat.id}`);

  // Получаем данные пользователя из БД
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, telegram_id')
    .eq('telegram_id', user.id)
    .maybeSingle();

  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('streak_days, readiness_level')
    .eq('user_id', profile?.id)
    .maybeSingle();

  const userName = profile?.first_name || user.first_name || 'Пилот';
  const streakDays = metrics?.streak_days || 0;
  const readiness = metrics?.readiness_level || 0;

  // Определяем статус пользователя
  const isNewUser = !profile || readiness === 0;

  // URL баннера (можно заменить на свой)
  const WELCOME_BANNER = 'https://skilyapp.com/images/telegram-welcome-banner.png';

  // Формируем приветственное сообщение
  let welcomeText = '';

  if (isNewUser) {
    // Новый пользователь
    welcomeText = `
<b>Привет, ${userName}!</b> 👋

Я — твой штурман в мире ПДД.

🏎 <b>Skily</b> — это не скучные тесты, а гонки, дуэли и прокачка.

<i>Тебя ждут 2000+ вопросов, AI-помощник и дуэли с друзьями.</i>

Готов сдать на права играючи?
`.trim();
  } else {
    // Возвращающийся пользователь
    const streakEmoji = streakDays > 7 ? '🔥' : streakDays > 0 ? '✨' : '💤';

    welcomeText = `
<b>С возвращением, ${userName}!</b> 👋

${streakEmoji} Серия: <b>${streakDays} дней</b>
🎯 Готовность: <b>${readiness}%</b>

${streakDays === 0 ? '<i>Не дай серии остыть — позанимайся сегодня!</i>' : '<i>Отличная работа! Продолжай в том же духе.</i>'}
`.trim();
  }

  // Отправляем сообщение с баннером (если доступен) или без
  try {
    // Пробуем отправить с фото
    const photoResponse = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        photo: WELCOME_BANNER,
        caption: welcomeText,
        parse_mode: 'HTML',
        reply_markup: keyboards.getMainMenuKeyboard()
      })
    });

    if (!photoResponse.ok) {
      // Если фото не отправилось, отправляем без фото
      throw new Error('Photo not available');
    }
  } catch (error) {
    // Fallback: отправляем без фото
    console.log('[handleStart] Sending welcome without photo');
    await sendMessage({
      chat_id: message.chat.id,
      text: welcomeText,
      parse_mode: 'HTML',
      reply_markup: keyboards.getMainMenuKeyboard()
    });
  }
}

// =====================================================
// /stats - Статистика пользователя
// =====================================================
export async function handleStats(message: TelegramMessage, supabase: any): Promise<void> {
  const user = message.from;
  if (!user) return;

  // Получаем метрики пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', user.id)
    .maybeSingle();

  if (!profile) {
    await sendMessage({
      chat_id: message.chat.id,
      text: '❌ Профиль не найден. Сначала откройте приложение через /start'
    });
    return;
  }

  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!metrics) {
    await sendMessage({
      chat_id: message.chat.id,
      text: '📊 У тебя пока нет статистики. Начни обучение в приложении!',
      reply_markup: keyboards.getOpenAppKeyboard()
    });
    return;
  }

  const accuracy = metrics.total_questions_answered > 0
    ? ((metrics.correct_answers / metrics.total_questions_answered) * 100).toFixed(1)
    : '0';

  const statsText = `
📊 <b>Твоя статистика</b>

🎯 Готовность к экзамену: <b>${metrics.readiness_level || 0}%</b>
🔥 Серия дней: <b>${metrics.streak_days || 0}</b>

📝 Тесты:
• Пройдено: ${metrics.total_tests_completed || 0}
• Вопросов: ${metrics.total_questions_answered || 0}
• Правильных: ${metrics.correct_answers || 0} (${accuracy}%)

⚔️ Дуэли:
• Сыграно: ${metrics.total_duels_played || 0}

${metrics.last_test_at ? `\n🕐 Последний тест: ${new Date(metrics.last_test_at).toLocaleDateString('ru')}` : ''}
`.trim();

  await sendMessage({
    chat_id: message.chat.id,
    text: statsText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getBackToMenuKeyboard()
  });
}

// =====================================================
// /duel - Меню дуэлей
// =====================================================
export async function handleDuel(message: TelegramMessage): Promise<void> {
  const duelText = `
⚔️ <b>Дуэли на Skilyapp</b>

Создавай дуэль, кидай код другу и сражайся прямо в приложении.
Все дуэли, рейтинги и реванши теперь на <a href="${PUBLIC_SITE_URL}/duels">skilyapp.com/duels</a>.

Выбери действие ниже или жми “Создать дуэль”, чтобы открыть веб-приложение. 🚀
`.trim();

  await sendMessage({
    chat_id: message.chat.id,
    text: duelText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getDuelMenuKeyboard()
  });
}

// =====================================================
// /streak - Информация о серии
// =====================================================
export async function handleStreak(message: TelegramMessage, supabase: any): Promise<void> {
  const user = message.from;
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', user.id)
    .maybeSingle();

  if (!profile) {
    await sendMessage({
      chat_id: message.chat.id,
      text: '❌ Профиль не найден. Сначала откройте приложение через /start'
    });
    return;
  }

  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('streak_days, last_streak_date')
    .eq('user_id', profile.id)
    .maybeSingle();

  const streakDays = metrics?.streak_days || 0;
  const today = new Date().toISOString().split('T')[0];
  const isActive = metrics?.last_streak_date === today;

  let streakText = '';

  if (streakDays === 0) {
    streakText = `
🔥 <b>Серия дней</b>

У тебя пока нет активной серии.

Начни заниматься каждый день, чтобы:
• Получать бонусы
• Улучшать результаты
• Быстрее подготовиться к экзамену

Начни прямо сейчас! 💪
`.trim();
  } else {
    const motivation = streakDays >= 30
      ? 'Невероятно! 🏆'
      : streakDays >= 14
        ? 'Отличный результат! 🌟'
        : streakDays >= 7
          ? 'Так держать! 💪'
          : 'Хорошее начало! 👍';

    streakText = `
🔥 <b>Серия: ${streakDays} ${getDaysWord(streakDays)}</b>

${motivation}

${isActive ? '✅ Сегодня ты уже позанимался' : '⏰ Не забудь позаниматься сегодня!'}

Продолжай в том же духе, чтобы получить:
${streakDays >= 7 ? '✅' : '⬜'} День 7 — Бонус XP
${streakDays >= 14 ? '✅' : '⬜'} День 14 — Особый значок
${streakDays >= 30 ? '✅' : '⬜'} День 30 — Мастер дисциплины!
`.trim();
  }

  await sendMessage({
    chat_id: message.chat.id,
    text: streakText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getOpenAppKeyboard('learn')
  });
}

// =====================================================
// /help - Справка
// =====================================================
export async function handleHelp(message: TelegramMessage): Promise<void> {
  const helpText = `
❓ <b>Помощь</b>

<b>Доступные команды:</b>
/start — Главное меню
/stats — Твоя статистика
/duel — Начать дуэль
/streak — Серия дней
/express — Экспресс-тест (3 вопроса)
/guide — Гид по функциям
/tips — Учебные советы
/settings — Настройки
/help — Эта справка

<b>О приложении:</b>
Skilyapp — это современная подготовка к экзамену DGT и тренировочный центр с дуэлями, челленджами и прогрессом на ${PUBLIC_SITE_URL}.

<b>Поддержка:</b>
Если возникли вопросы, напиши ${SUPPORT_CONTACT} или заполни форму на ${PUBLIC_SITE_URL}/support

🚀 Открой приложение, чтобы увидеть все темы и задания!
`.trim();

  await sendMessage({
    chat_id: message.chat.id,
    text: helpText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getOpenAppKeyboard()
  });
}

// =====================================================
// /settings - Настройки
// =====================================================
export async function handleSettings(message: TelegramMessage): Promise<void> {
  const settingsText = `
⚙️ <b>Настройки</b>

Настрой уведомления и параметры бота под себя.
`.trim();

  await sendMessage({
    chat_id: message.chat.id,
    text: settingsText,
    parse_mode: 'HTML',
    reply_markup: keyboards.getSettingsKeyboard()
  });
}

// =====================================================
// /tips - Учебные советы
// =====================================================
export async function handleTips(message: TelegramMessage, supabase: any): Promise<void> {
  const user = message.from;
  if (!user) return;

  const language = await getUserLanguageCode(user.id, supabase);

  const { data: topicsData, error } = await supabase
    .from('bot_tips')
    .select('topic_slug, topic_title, topic_icon')
    .eq('language', language)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !topicsData || topicsData.length === 0) {
    await sendMessage({
      chat_id: message.chat.id,
      text: '🧠 Советы временно недоступны. Загляни позже — я пополню базу!'
    });
    return;
  }

  const uniqueTopics: { topic_slug: string; topic_title: string; topic_icon?: string | null }[] = [];
  const seen = new Set<string>();
  for (const topic of topicsData) {
    if (topic.topic_slug && !seen.has(topic.topic_slug)) {
      seen.add(topic.topic_slug);
      uniqueTopics.push(topic);
    }
  }

  const intro = `
🧠 <b>Учебные советы Skily</b>

Выбери тему, а я дам короткий инсайт, который помогает на тестах и в реальных сценариях. Никакой воды — только практика.
`.trim();

  await sendMessage({
    chat_id: message.chat.id,
    text: intro,
    parse_mode: 'HTML',
    reply_markup: keyboards.getTipsTopicsKeyboard(uniqueTopics)
  });
}

// =====================================================
// Утилиты
// =====================================================

function getDaysWord(count: number): string {
  const cases = [2, 0, 1, 1, 1, 2];
  const titles = ['день', 'дня', 'дней'];
  return titles[
    count % 100 > 4 && count % 100 < 20
      ? 2
      : cases[count % 10 < 5 ? count % 10 : 5]
  ];
}

async function getUserLanguageCode(telegramId: number, supabase: any): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('language_code')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  return profile?.language_code || 'ru';
}

