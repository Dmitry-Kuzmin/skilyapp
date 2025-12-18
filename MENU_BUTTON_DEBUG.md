# 🔍 Диагностика Menu Button WebApp

## Что проверить

### 1. Проверьте логи бота

После отправки `/start` боту, проверьте логи в Supabase:

1. Откройте **Supabase Dashboard** → **Edge Functions** → **telegram-bot** → **Logs**
2. Найдите логи с префиксом `[setupMenuButtonForUser]` и `[handleStart]`
3. Должны увидеть:

```
[handleStart] 🚀 Обработка команды /start для пользователя 123456, чат 123456
[setupMenuButtonForUser] 🚀 Начинаю установку Menu Button для чата 123456
[setupMenuButtonForUser] 📋 URL: https://skilyapp.com
[setupMenuButtonForUser] 📤 Отправляю запрос: {...}
[setupMenuButtonForUser] 📥 Ответ от Telegram API (status 200): {...}
```

### 2. Возможные ошибки

#### Ошибка: "Bad Request: chat not found"
- **Причина:** Неправильный `chat_id`
- **Решение:** Убедитесь, что используется `message.chat.id`, а не `message.from.id`

#### Ошибка: "Bad Request: button type is invalid"
- **Причина:** Неправильный формат `menu_button`
- **Решение:** Проверьте, что используется `type: 'web_app'` (не `'webapp'` или другое)

#### Ошибка: "Bad Request: web_app.url is invalid"
- **Причина:** URL не валидный или не HTTPS
- **Решение:** Убедитесь, что URL начинается с `https://` и доступен

#### Ошибка: "Forbidden: bot is not a member of the chat"
- **Причина:** Бот не добавлен в группу/канал
- **Решение:** Это нормально для личных чатов, но для групп нужно добавить бота

### 3. Ручная проверка через API

Проверьте, работает ли API напрямую:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": <YOUR_CHAT_ID>,
    "menu_button": {
      "type": "web_app",
      "text": "🚀 В БОЙ",
      "web_app": {
        "url": "https://skilyapp.com"
      }
    }
  }'
```

Замените:
- `<YOUR_BOT_TOKEN>` на токен вашего бота
- `<YOUR_CHAT_ID>` на ваш Telegram ID (можно узнать через @userinfobot)

### 4. Проверка через Bot API

Также можно проверить текущее состояние кнопки:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getChatMenuButton?chat_id=<YOUR_CHAT_ID>"
```

### 5. Что делать если не работает

1. **Проверьте логи** - должны быть детальные сообщения о том, что происходит
2. **Проверьте токен бота** - убедитесь, что `TELEGRAM_BOT_TOKEN` установлен правильно
3. **Проверьте URL** - убедитесь, что `MINI_APP_URL` или дефолтный `https://skilyapp.com` доступен
4. **Проверьте права бота** - бот должен иметь возможность отправлять сообщения пользователю
5. **Попробуйте ручной вызов API** - используйте curl команду выше

### 6. Альтернативное решение

Если программная установка не работает, можно установить кнопку глобально для всех пользователей через BotFather:

1. Откройте @BotFather
2. `/mybots` → Ваш бот → **Bot Settings** → **Menu Button**
3. Вставьте URL: `https://skilyapp.com`
4. **НО:** Это создаст кнопку типа `url`, а не `web_app`, поэтому fullscreen может не работать

**Лучше использовать программную установку через код.**

## 📋 Чеклист

- [ ] Логи показывают, что функция вызывается
- [ ] Логи показывают успешный ответ от Telegram API
- [ ] Кнопка появилась слева от поля ввода
- [ ] При нажатии приложение открывается на весь экран
- [ ] В BotFather → Main App включен Fullscreen режим

