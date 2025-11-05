# 🤖 Настройка Telegram Web App для локальной разработки

## 📋 Пошаговая инструкция

### Шаг 1: Установка ngrok

**macOS:**
```bash
brew install ngrok
```

**Или скачайте вручную:**
1. Перейдите на https://ngrok.com/download
2. Скачайте для macOS
3. Распакуйте и переместите в `/usr/local/bin/`:
   ```bash
   sudo mv ngrok /usr/local/bin/
   ```

**Важно:** Для постоянного URL нужна регистрация на ngrok.com (бесплатный план дает новый URL при каждом запуске).

---

### Шаг 2: Запуск dev сервера

Убедитесь, что dev сервер запущен:

```bash
cd /Users/dimka/.cursor/worktrees/sdadim-dgt-prep/gqCtX
npm run dev
```

Сервер должен работать на `http://localhost:8080`

---

### Шаг 3: Создание публичного URL через ngrok

В **новом терминале** запустите:

```bash
ngrok http 8080
```

Вы получите вывод вида:
```
ngrok by @inconshreveable

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:8080
Forwarding                    http://abc123def456.ngrok-free.app -> http://localhost:8080

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Скопируйте HTTPS URL** (например: `https://abc123def456.ngrok-free.app`)

⚠️ **Важно:** 
- Этот URL будет работать только пока ngrok запущен
- При каждом перезапуске ngrok URL меняется (на бесплатном плане)
- Для постоянного URL нужен платный план ngrok

---

### Шаг 4: Настройка Telegram бота

1. **Откройте [@BotFather](https://t.me/BotFather) в Telegram**

2. **Отправьте команду:**
   ```
   /setmenubutton
   ```

3. **Выберите вашего бота** (если у вас несколько ботов)

4. **Введите название кнопки** (например: "Открыть приложение" или "Start")

5. **Введите URL вашего приложения:**
   ```
   https://abc123def456.ngrok-free.app
   ```
   (Замените на ваш URL из ngrok)

6. **Готово!** BotFather подтвердит, что кнопка настроена

---

### Шаг 5: Тестирование

1. **Откройте вашего бота в Telegram**

2. **Нажмите на кнопку меню** (три горизонтальные линии внизу)

3. **Нажмите на вашу кнопку** (например, "Открыть приложение")

4. **Приложение должно открыться в Telegram Web App**

---

## 🔄 Автоматизация (опционально)

### Создайте скрипт для одновременного запуска

Создайте файл `start-with-ngrok.sh`:

```bash
#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Запуск dev сервера и ngrok..."

# Запуск dev сервера в фоне
npm run dev &
DEV_PID=$!

# Ждем запуска сервера
sleep 5

# Запуск ngrok
echo "🌐 Запуск ngrok..."
ngrok http 8080

# При остановке ngrok, остановим и dev сервер
kill $DEV_PID
```

Сделайте исполняемым:
```bash
chmod +x start-with-ngrok.sh
```

Использование:
```bash
./start-with-ngrok.sh
```

---

## ⚠️ Важные замечания

### 1. HTTPS обязателен

Telegram требует HTTPS для Web App. ngrok предоставляет HTTPS URL автоматически.

### 2. CORS настройки

Убедитесь, что Supabase CORS настроен правильно. Если возникнут проблемы с CORS, добавьте в Supabase Dashboard:
- URL вашего ngrok домена
- Или `*` для разработки (не для продакшена!)

### 3. Временный URL

На бесплатном плане ngrok:
- URL меняется при каждом перезапуске
- Нужно обновлять URL в BotFather после каждого перезапуска
- Для постоянного URL нужен платный план ngrok (от $8/месяц)

### 4. Альтернативы ngrok

Если не хотите использовать ngrok, можно использовать:
- **Cloudflare Tunnel** (бесплатно, постоянный URL)
- **localtunnel** (бесплатно, но менее стабильно)
- **serveo.net** (бесплатно, но ограниченно)

---

## 🛠️ Настройка Cloudflare Tunnel (альтернатива)

### Установка:
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Запуск:
```bash
cloudflared tunnel --url http://localhost:8080
```

Это даст вам постоянный URL (на бесплатном плане).

---

## 📝 Чек-лист

- [ ] ngrok установлен
- [ ] Dev сервер запущен на порту 8080
- [ ] ngrok создал публичный URL
- [ ] URL скопирован
- [ ] BotFather настроен с URL
- [ ] Бот открывается в Telegram

---

## 🐛 Решение проблем

### Проблема: "Connection refused"

**Решение:** Убедитесь, что dev сервер запущен на порту 8080:
```bash
lsof -ti:8080
```

### Проблема: URL не работает

**Решение:** 
1. Проверьте, что ngrok запущен
2. Убедитесь, что URL правильный (HTTPS, не HTTP)
3. Проверьте, что dev сервер работает

### Проблема: CORS ошибки

**Решение:** 
1. Добавьте ngrok URL в Supabase CORS настройки
2. Или используйте `*` для разработки (не для продакшена!)

---

**Готово! Теперь ваше локальное приложение доступно через Telegram бота! 🎉**

