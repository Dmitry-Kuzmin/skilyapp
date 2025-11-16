# 🚀 Быстрый старт с Localtunnel

Localtunnel проще и быстрее чем Cloudflare Tunnel. Используйте его для локальной разработки.

## Установка

```bash
npm install -g localtunnel
```

Или используйте через `npx` (установится автоматически).

## Быстрый запуск

### Вариант 1: Автоматический (рекомендуется)

```bash
# Установите токен бота
export TELEGRAM_BOT_TOKEN=your_bot_token_here

# Запустите всё одной командой
npm run dev:telegram:lt
```

### Вариант 2: Ручной запуск

**Терминал 1:**
```bash
npm run dev
```

**Терминал 2:**
```bash
npm run tunnel:start:lt
```

После запуска вы получите URL вида: `https://abc123.loca.lt`

## Обновление Web App URL

После получения URL обновите его в BotFather:

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/setmenubutton`
3. Выберите вашего бота
4. Укажите URL: `https://abc123.loca.lt`

Или используйте скрипт:
```bash
TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js https://abc123.loca.lt
```

## Преимущества Localtunnel

- ✅ Быстрее запускается
- ✅ Проще в использовании
- ✅ Стабильнее соединение
- ✅ Не требует аккаунта
- ✅ Бесплатно

## Решение проблем

### Tunnel не запускается
```bash
# Проверьте, что dev сервер запущен
lsof -i :8080

# Переустановите localtunnel
npm install -g localtunnel
```

### URL не обновляется
- Проверьте токен бота
- Убедитесь, что URL начинается с `https://`
- Попробуйте обновить вручную через BotFather


