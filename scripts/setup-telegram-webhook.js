#!/usr/bin/env node

/**
 * Скрипт для настройки Telegram Bot Webhook
 * 
 * Использование:
 * 1. Установить переменные окружения TELEGRAM_BOT_TOKEN и SUPABASE_URL
 * 2. Запустить: node scripts/setup-telegram-webhook.js
 * 
 * Или передать токен как аргумент:
 * node scripts/setup-telegram-webhook.js <BOT_TOKEN>
 */

const BOT_TOKEN = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN || '8065301889:AAHiLExEVl-KJFZxcUzaDwbFsUOJNBb_Vaw';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yffjnqegeiorunyvcxkn.supabase.co';

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/telegram-bot`;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

console.log('🤖 Настройка Telegram Bot Webhook');
console.log('=====================================\n');
console.log('📍 Webhook URL:', WEBHOOK_URL);
console.log('🔑 Bot Token:', BOT_TOKEN.substring(0, 20) + '...');
console.log();

async function setWebhook() {
  try {
    console.log('⏳ Установка webhook...');
    
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true // Очистить старые обновления
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Webhook установлен успешно!');
      console.log();
      
      // Проверяем информацию о webhook
      await getWebhookInfo();
      
      // Получаем информацию о боте
      await getBotInfo();
      
      console.log('\n🎉 Готово! Бот настроен и готов к работе.');
      console.log('\n📝 Следующие шаги:');
      console.log('1. Откройте бота в Telegram');
      console.log('2. Отправьте команду /start');
      console.log('3. Проверьте, что бот отвечает');
      
    } else {
      console.error('❌ Ошибка установки webhook:', result.description);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

async function getWebhookInfo() {
  try {
    console.log('📊 Получение информации о webhook...');
    
    const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const result = await response.json();

    if (result.ok) {
      const info = result.result;
      console.log('\n✅ Информация о webhook:');
      console.log('   URL:', info.url);
      console.log('   Pending updates:', info.pending_update_count);
      console.log('   Max connections:', info.max_connections);
      
      if (info.last_error_date) {
        const errorDate = new Date(info.last_error_date * 1000);
        console.log('   ⚠️  Последняя ошибка:', errorDate.toLocaleString());
        console.log('   Сообщение:', info.last_error_message);
      } else {
        console.log('   ✅ Ошибок нет');
      }
    }
  } catch (error) {
    console.error('⚠️  Не удалось получить информацию о webhook:', error.message);
  }
}

async function getBotInfo() {
  try {
    console.log('\n🤖 Получение информации о боте...');
    
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const result = await response.json();

    if (result.ok) {
      const bot = result.result;
      console.log('\n✅ Информация о боте:');
      console.log('   Имя:', bot.first_name);
      console.log('   Username:', `@${bot.username}`);
      console.log('   ID:', bot.id);
      console.log('   Can join groups:', bot.can_join_groups ? 'Да' : 'Нет');
      console.log('   Can read messages:', bot.can_read_all_group_messages ? 'Да' : 'Нет');
      
      console.log('\n🔗 Ссылка на бота: https://t.me/' + bot.username);
    }
  } catch (error) {
    console.error('⚠️  Не удалось получить информацию о боте:', error.message);
  }
}

async function deleteWebhook() {
  try {
    console.log('🗑️  Удаление webhook...');
    
    const response = await fetch(`${TELEGRAM_API}/deleteWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        drop_pending_updates: true
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Webhook удалён');
    } else {
      console.error('❌ Ошибка удаления webhook:', result.description);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Проверяем аргументы командной строки
const command = process.argv[3];

if (command === '--delete' || command === '-d') {
  deleteWebhook();
} else if (command === '--info' || command === '-i') {
  getWebhookInfo().then(() => getBotInfo());
} else {
  setWebhook();
}

