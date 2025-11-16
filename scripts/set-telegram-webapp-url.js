#!/usr/bin/env node

/**
 * Скрипт для обновления Web App URL в Telegram Bot
 * 
 * Использование:
 * node scripts/set-telegram-webapp-url.js <WEB_APP_URL> [BOT_TOKEN]
 * 
 * Пример:
 * node scripts/set-telegram-webapp-url.js https://abc123.trycloudflare.com
 */

const WEB_APP_URL = process.argv[2];
const BOT_TOKEN = process.argv[3] || process.env.TELEGRAM_BOT_TOKEN;

if (!WEB_APP_URL) {
  console.error('❌ Ошибка: Укажите Web App URL');
  console.log('\nИспользование:');
  console.log('  node scripts/set-telegram-webapp-url.js <WEB_APP_URL> [BOT_TOKEN]');
  console.log('\nПример:');
  console.log('  node scripts/set-telegram-webapp-url.js https://abc123.trycloudflare.com');
  console.log('\nИли установите переменную окружения:');
  console.log('  export TELEGRAM_BOT_TOKEN=your_token');
  process.exit(1);
}

if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не указан');
  console.log('\nУкажите токен как аргумент или установите переменную окружения:');
  console.log('  export TELEGRAM_BOT_TOKEN=your_token');
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function setWebAppUrl() {
  try {
    console.log('🤖 Обновление Web App URL в Telegram Bot');
    console.log('========================================\n');
    console.log('📍 URL:', WEB_APP_URL);
    console.log('🔑 Bot Token:', BOT_TOKEN.substring(0, 20) + '...');
    console.log('');

    // Получаем информацию о боте
    const botInfoResponse = await fetch(`${TELEGRAM_API}/getMe`);
    const botInfo = await botInfoResponse.json();

    if (!botInfo.ok) {
      console.error('❌ Ошибка получения информации о боте:', botInfo.description);
      process.exit(1);
    }

    console.log('✅ Бот найден:', `@${botInfo.result.username}`);
    console.log('');

    // Устанавливаем Web App URL через setChatMenuButton
    console.log('⏳ Установка Web App URL...');
    
    const response = await fetch(`${TELEGRAM_API}/setChatMenuButton`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Открыть приложение',
          web_app: {
            url: WEB_APP_URL
          }
        }
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Web App URL успешно обновлён!');
      console.log('');
      console.log('📱 Теперь откройте бота в Telegram и нажмите кнопку меню');
      console.log('🔗 Ссылка на бота: https://t.me/' + botInfo.result.username);
      console.log('');
    } else {
      console.error('❌ Ошибка установки Web App URL:', result.description);
      console.log('');
      console.log('💡 Попробуйте установить URL вручную через BotFather:');
      console.log('   1. Откройте @BotFather в Telegram');
      console.log('   2. Отправьте /setmenubutton');
      console.log('   3. Выберите вашего бота');
      console.log('   4. Укажите URL:', WEB_APP_URL);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

setWebAppUrl();

