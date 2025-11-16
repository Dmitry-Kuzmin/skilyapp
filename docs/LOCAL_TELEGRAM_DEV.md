# 🚀 Локальная разработка для Telegram Web App

## Быстрый старт

### Вариант 1: Автоматический запуск (рекомендуется)

```bash
# Установите токен бота (один раз)
export TELEGRAM_BOT_TOKEN=your_bot_token_here

# Запустите всё одной командой
npm run dev:telegram
```

Этот скрипт автоматически:
- ✅ Запустит dev сервер на порту 8080
- ✅ Запустит Cloudflare Tunnel
- ✅ Обновит Web App URL в Telegram Bot

### Вариант 2: Ручной запуск

#### Шаг 1: Запустите dev сервер

```bash
npm run dev
```

#### Шаг 2: В другом терминале запустите Cloudflare Tunnel

```bash
npm run tunnel:start
```

Или напрямую:
```bash
./scripts/start-cloudflare-tunnel.sh
```

#### Шаг 3: Обновите Web App URL в Telegram Bot

После запуска tunnel вы получите URL вида: `https://abc123.trycloudflare.com`

**Через скрипт (автоматически):**
```bash
TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js https://abc123.trycloudflare.com
```

**Или через BotFather (вручную):**
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/setmenubutton`
3. Выберите вашего бота
4. Укажите URL: `https://abc123.trycloudflare.com`

## 📋 Доступные команды

```bash
# Автоматический запуск (dev сервер + tunnel)
npm run dev:telegram

# Только Cloudflare Tunnel (если dev сервер уже запущен)
npm run tunnel:start

# Обновить Web App URL в Telegram Bot
npm run tunnel:set-url <URL>
```

## 🔧 Настройка

### 1. Установка Cloudflare Tunnel

```bash
brew install cloudflare/cloudflare/cloudflared
```

### 2. Настройка Telegram Bot Token

Создайте файл `.env.local` в корне проекта:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

Или экспортируйте переменную окружения:

```bash
export TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 3. Получение Bot Token

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` или выберите существующего бота
3. Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 🎯 Как это работает

1. **Dev сервер** запускается на `http://localhost:8080`
2. **Cloudflare Tunnel** создаёт публичный HTTPS URL, который проксирует запросы на localhost
3. **Telegram Bot** использует этот публичный URL для открытия Web App
4. При изменении кода, изменения сразу видны в Telegram (как в браузере)

## ⚠️ Важные моменты

- **URL меняется** при каждом перезапуске tunnel (это нормально для quick tunnel)
- **Обновляйте URL** в BotFather после каждого перезапуска tunnel
- **Токен бота** храните в `.env.local` (не коммитьте в Git!)
- **Tunnel работает** пока вы не остановите его (Ctrl+C)

## 🔗 Как получить текущий URL Tunnel

### Способ 1: Через скрипт (рекомендуется)

```bash
./scripts/get-tunnel-url.sh
```

### Способ 2: Из логов

```bash
grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /tmp/cloudflared-tunnel.log | tail -1
```

### Способ 3: Из файла (если использовали скрипт с сохранением)

```bash
cat /tmp/cloudflare-tunnel-url.txt
```

### Способ 4: В терминале, где запущен tunnel

URL отображается сразу после запуска в строке вида:
```
https://abc123.trycloudflare.com
```

## 💡 Постоянный URL (опционально)

Если нужен постоянный URL, который не меняется, можно использовать **named tunnel**:

1. Зарегистрируйтесь на [Cloudflare](https://dash.cloudflare.com/)
2. Создайте named tunnel через веб-интерфейс
3. Используйте команду: `cloudflared tunnel run <tunnel-name>`

Но для локальной разработки quick tunnel (с меняющимся URL) обычно достаточно.

## 🔍 Проверка работы

1. Запустите `npm run dev:telegram`
2. Дождитесь появления URL (например: `https://abc123.trycloudflare.com`)
3. Обновите URL в BotFather
4. Откройте бота в Telegram
5. Нажмите кнопку меню — должно открыться ваше локальное приложение

## 🐛 Решение проблем

### Tunnel не запускается

```bash
# Проверьте, что cloudflared установлен
cloudflared --version

# Проверьте, что dev сервер запущен
lsof -i :8080
```

### URL не обновляется автоматически

```bash
# Проверьте токен
echo $TELEGRAM_BOT_TOKEN

# Обновите вручную через скрипт
node scripts/set-telegram-webapp-url.js <URL> <TOKEN>
```

### Telegram показывает ошибку при открытии

- Убедитесь, что tunnel URL начинается с `https://`
- Проверьте, что dev сервер запущен на порту 8080
- Проверьте логи tunnel на наличие ошибок

## 📚 Дополнительная информация

- [Cloudflare Tunnel документация](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Telegram Bot API - Web Apps](https://core.telegram.org/bots/webapps)

