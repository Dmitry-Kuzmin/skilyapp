# 📱 Telegram Bot: Напоминания о Daily Bonus
## Простая настройка без Supabase Cron

---

## 🎯 ЦЕЛЬ

Отправлять напоминания пользователям **БЕЗ** использования Supabase Cron (экономия).

**Архитектура:**
- Telegram Bot на Node.js (если еще нет)
- Простой scheduler (node-cron или setInterval)
- Webhook для подписки на напоминания

---

## 📋 ТРЕБОВАНИЯ

1. **Node.js сервер** (где крутится Telegram bot)
2. **Supabase** (для проверки кто не получил бонус)
3. **Telegram Bot Token**

---

## 🔧 ВАРИАНТ 1: Минимальный (10 минут)

### Если у тебя УЖЕ ЕСТЬ Telegram bot:

#### Шаг 1: Добавить таблицу настроек

```sql
-- В Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT,
  daily_reminder BOOLEAN DEFAULT false,
  reminder_time TEXT DEFAULT '20:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_telegram 
  ON user_settings(telegram_id) 
  WHERE daily_reminder = true;

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (can_access_daily_bonus(user_id));
```

#### Шаг 2: Добавить команду в bot

```javascript
// В твой существующий bot (telegraf/grammy/etc)
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Команда включения напоминаний
bot.command('reminders', async (ctx) => {
  const telegramId = ctx.from.id;
  
  // Найти user_id по telegram_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();
  
  if (!profile) {
    return ctx.reply('❌ Профиль не найден. Сначала авторизуйтесь в приложении.');
  }
  
  ctx.reply(
    '⏰ Настройка напоминаний о Daily Bonus:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Включить в 20:00', callback_data: 'remind_on_20' }],
          [{ text: '✅ Включить в 21:00', callback_data: 'remind_on_21' }],
          [{ text: '✅ Включить в 22:00', callback_data: 'remind_on_22' }],
          [{ text: '❌ Отключить', callback_data: 'remind_off' }]
        ]
      }
    }
  );
});

// Обработка кнопок
bot.action(/remind_(on|off)_?(\d*)/, async (ctx) => {
  const telegramId = ctx.from.id;
  const action = ctx.match[1]; // 'on' или 'off'
  const hour = ctx.match[2]; // '20', '21', '22' или ''
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();
  
  if (!profile) {
    return ctx.answerCbQuery('Профиль не найден');
  }
  
  if (action === 'off') {
    await supabase
      .from('user_settings')
      .upsert({
        user_id: profile.id,
        telegram_id: telegramId,
        daily_reminder: false
      });
    
    await ctx.answerCbQuery('✅ Напоминания отключены');
    return ctx.editMessageText('❌ Напоминания о Daily Bonus отключены');
  }
  
  // Включаем напоминания
  await supabase
    .from('user_settings')
    .upsert({
      user_id: profile.id,
      telegram_id: telegramId,
      daily_reminder: true,
      reminder_time: `${hour}:00`
    });
  
  await ctx.answerCbQuery('✅ Напоминания включены');
  await ctx.editMessageText(
    `✅ Напоминания включены!\n\n` +
    `⏰ Буду напоминать каждый день в ${hour}:00\n\n` +
    `Чтобы отключить, напиши /reminders`
  );
});
```

#### Шаг 3: Добавить scheduler

```javascript
// В конец твоего bot файла
const cron = require('node-cron');

// Функция отправки напоминаний
async function sendDailyReminders(hour) {
  console.log(`[Reminder] Checking for ${hour}:00 reminders...`);
  
  try {
    // Найти пользователей с напоминанием в этот час
    const { data: users } = await supabase
      .from('user_settings')
      .select(`
        telegram_id,
        user_id,
        user_daily_bonus!inner(last_claimed_date, current_streak)
      `)
      .eq('daily_reminder', true)
      .eq('reminder_time', `${hour}:00`)
      .neq('telegram_id', null);
    
    if (!users || users.length === 0) {
      console.log('[Reminder] No users to notify');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    let sentCount = 0;
    
    for (const user of users) {
      // Проверяем: НЕ получал сегодня
      if (user.user_daily_bonus.last_claimed_date !== today) {
        const streak = user.user_daily_bonus.current_streak;
        
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            `🔥 Твой streak ${streak} дней в опасности!\n\n` +
            `Не забудь забрать сегодняшний бонус 🎁\n\n` +
            `Открыть приложение: /start`
          );
          
          sentCount++;
          
          // Задержка чтобы не спамить Telegram API
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
          console.error(`[Reminder] Error sending to ${user.telegram_id}:`, err.message);
        }
      }
    }
    
    console.log(`[Reminder] Sent ${sentCount} reminders`);
  } catch (error) {
    console.error('[Reminder] Error:', error);
  }
}

// Запускать каждый час
cron.schedule('0 * * * *', async () => {
  const currentHour = new Date().getHours();
  await sendDailyReminders(currentHour);
});

console.log('✅ Daily reminder scheduler started');
```

#### Шаг 4: Деплой

```bash
# Если bot на твоем сервере
pm2 restart telegram-bot

# Если на Heroku/Railway
git push heroku main

# Проверить что работает
pm2 logs telegram-bot
```

---

## 🔧 ВАРИАНТ 2: Более умный (20 минут)

Добавляет:
- Разные времена для разных timezone
- Персонализированные сообщения
- Статистика отправок

### Шаг 2.1: Умный scheduler

```javascript
const cron = require('node-cron');

// База данных для времен по timezone (упрощенно)
const TIMEZONE_OFFSETS = {
  'Europe/Madrid': 1,    // UTC+1
  'Europe/Moscow': 3,    // UTC+3
  'America/New_York': -5 // UTC-5
};

async function sendSmartReminders() {
  const currentUTCHour = new Date().getUTCHours();
  
  console.log(`[SmartReminder] UTC Hour: ${currentUTCHour}`);
  
  try {
    // Найти пользователей которым "сейчас" нужное локальное время
    const { data: users } = await supabase
      .from('user_settings')
      .select(`
        telegram_id,
        user_id,
        reminder_time,
        profiles!inner(timezone),
        user_daily_bonus!inner(last_claimed_date, current_streak)
      `)
      .eq('daily_reminder', true)
      .neq('telegram_id', null);
    
    if (!users) return;
    
    const today = new Date().toISOString().split('T')[0];
    let sentCount = 0;
    
    for (const user of users) {
      // Вычисляем локальное время пользователя
      const timezone = user.profiles.timezone || 'Europe/Madrid';
      const offset = TIMEZONE_OFFSETS[timezone] || 1;
      const localHour = (currentUTCHour + offset + 24) % 24;
      
      // Парсим reminder_time
      const [reminderHour] = user.reminder_time.split(':').map(Number);
      
      // Совпадает ли время?
      if (localHour === reminderHour) {
        // НЕ получал сегодня?
        if (user.user_daily_bonus.last_claimed_date !== today) {
          const streak = user.user_daily_bonus.current_streak;
          
          // Персонализированное сообщение
          const message = generateReminderMessage(streak);
          
          try {
            await bot.telegram.sendMessage(user.telegram_id, message, {
              reply_markup: {
                inline_keyboard: [[
                  { text: '🎁 Получить бонус', url: 'https://t.me/your_bot?start=claim' }
                ]]
              }
            });
            
            sentCount++;
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (err) {
            console.error(`Error sending to ${user.telegram_id}:`, err.message);
          }
        }
      }
    }
    
    console.log(`[SmartReminder] Sent ${sentCount} reminders`);
    
    // Статистика
    if (sentCount > 0) {
      await supabase
        .from('reminder_stats')
        .insert({
          sent_at: new Date().toISOString(),
          count: sentCount
        });
    }
  } catch (error) {
    console.error('[SmartReminder] Error:', error);
  }
}

// Генерация персонализированных сообщений
function generateReminderMessage(streak) {
  if (streak >= 30) {
    return `🔥 ЛЕГЕНДА! ${streak} дней подряд!\n\n` +
           `Не прерывай свой невероятный streak! Забери бонус 💎`;
  }
  
  if (streak >= 7) {
    return `🔥 Твой streak ${streak} дней в опасности!\n\n` +
           `Ты так близко к следующему milestone! 🎯`;
  }
  
  if (streak >= 3) {
    return `🔥 Streak ${streak} дней — отличное начало!\n\n` +
           `Не потеряй прогресс, забери бонус 🎁`;
  }
  
  return `🎁 Твой ежедневный бонус ждет!\n\n` +
         `Начни свой streak сегодня 🔥`;
}

// Запускать каждый час
cron.schedule('0 * * * *', sendSmartReminders);

console.log('✅ Smart reminder scheduler started');
```

---

## 📊 МОНИТОРИНГ

### Таблица статистики (опционально)

```sql
CREATE TABLE IF NOT EXISTS public.reminder_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View для аналитики
CREATE VIEW reminder_effectiveness AS
SELECT
  DATE(sent_at) as date,
  SUM(count) as reminders_sent,
  -- Сколько пришли после напоминания
  (SELECT COUNT(*) FROM user_daily_bonus 
   WHERE DATE(last_claimed_date) = DATE(sent_at)
     AND EXTRACT(HOUR FROM updated_at) >= EXTRACT(HOUR FROM sent_at)
  ) as claims_after_reminder
FROM reminder_stats
GROUP BY DATE(sent_at);
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Шаг 1: Подписаться на напоминания

```
/reminders
> Выбрать время
```

### Шаг 2: Проверить настройки

```sql
SELECT * FROM user_settings 
WHERE daily_reminder = true;
```

### Шаг 3: Тест отправки (вручную)

```javascript
// В консоли bot сервера
// Или создать тестовую команду

bot.command('test_reminder', async (ctx) => {
  if (ctx.from.id !== YOUR_ADMIN_ID) {
    return ctx.reply('Admin only');
  }
  
  await sendDailyReminders(new Date().getHours());
  ctx.reply('✅ Test reminders sent');
});
```

---

## 💰 ЭКОНОМИЯ

**Было (Supabase Cron):**
- 6 запусков/день × 30 дней = 180 Edge calls/месяц
- Проверка 10,000 пользователей = CPU spike каждые 4 часа
- **Стоимость:** Нагрузка на Supabase

**Стало (Bot webhook):**
- 24 проверки/день (каждый час)
- Только подписанные пользователи (opt-in)
- **Стоимость:** 0₽ (Telegram API бесплатен)

---

## 🎯 ЧЕКЛИСТ

- [ ] Создана таблица `user_settings`
- [ ] Добавлена команда `/reminders` в bot
- [ ] Добавлен scheduler (cron)
- [ ] Протестирована отправка
- [ ] Бот задеплоен
- [ ] Мониторинг работает

---

## 📞 ПОДДЕРЖКА

**Если бота еще НЕТ:**

1. Создать минимальный Telegram bot:
```bash
npm init -y
npm install telegraf @supabase/supabase-js node-cron dotenv
```

2. Создать `bot.js`:
```javascript
require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Привет!'));

bot.launch();
console.log('Bot started');
```

3. Добавить код из **Варианта 1**

4. Запустить:
```bash
node bot.js
# Или через pm2
pm2 start bot.js --name telegram-bot
```

---

**🎉 ГОТОВО!**

Telegram Bot напоминания настроены **БЕЗ Supabase Cron** = **0₽ стоимость** 🚀



