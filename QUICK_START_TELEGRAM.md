# ⚡ Быстрый старт для локальной разработки Telegram Web App

## 🚀 За 3 шага (Localtunnel - рекомендуется):

### 1. Установите токен бота (один раз)
```bash
export TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 2. Запустите всё одной командой
```bash
npm run dev:telegram:lt
```

### 3. Обновите URL в BotFather (если не обновилось автоматически)
После запуска вы увидите URL вида: `https://abc123.loca.lt`

Откройте [@BotFather](https://t.me/BotFather) → `/setmenubutton` → выберите бота → укажите URL

## ✅ Готово!

Теперь откройте бота в Telegram и нажмите кнопку меню — ваше локальное приложение откроется!

## 📝 Примечания

- URL меняется при каждом перезапуске tunnel — это нормально
- Изменения в коде видны сразу (как в браузере)
- Для остановки нажмите Ctrl+C

## 🔄 Альтернатива: Cloudflare Tunnel

Если Localtunnel не работает, используйте:
```bash
npm run dev:telegram
```

Подробная документация: 
- `docs/LOCALTUNNEL_SETUP.md` - Localtunnel
- `docs/LOCAL_TELEGRAM_DEV.md` - Cloudflare Tunnel
