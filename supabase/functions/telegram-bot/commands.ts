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
export async function handleStart(message: TelegramMessage, supabase: any): Promise<void> {
  const user = message.from;
  if (!user) return;

  // Получаем данные пользователя из БД
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, telegram_id')
    .eq('telegram_id', user.id)
    .maybeSingle();

  const userName = profile?.first_name || user.first_name || 'друг';

  const welcomeText = `
👋 Привет, ${userName}!

Я — Skilyapp, твой персональный тренер для экзамена DGT и Smart-марафонов на ${PUBLIC_SITE_URL}.

🎯 Что я делаю:
• Напоминаю о тренировках и серии
• Считаю прогресс и даю советы
• Запускаю дуэли и челленджи
• Помогаю открыть приложение в один тап

Выбирай действие ниже или заходи сразу на skilyapp.com 🚀
`.trim();

  await sendMessage({
    chat_id: message.chat.id,
    text: welcomeText,
    reply_markup: keyboards.getMainMenuKeyboard()
  });
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

