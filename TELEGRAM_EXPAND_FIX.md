# 🔧 Инструкция по исправлению проблемы "шторки" в Telegram Mini App

## ✅ Что уже исправлено в коде:

1. ✅ Добавлен "атомный" скрипт `expand()` в `index.html` (выполняется ДО загрузки React)
2. ✅ Улучшен viewport мета-тег с `user-scalable=no`
3. ✅ Добавлены CSS стили для минимальной высоты (`min-height: 100vh`)
4. ✅ Скрипт вызывает `expand()` несколько раз для надежности
5. ✅ Добавлены fallback обработчики для разных событий

## 🔍 КРИТИЧНО: Проверьте тип кнопки в боте!

**Самая частая причина проблемы** - кнопка открывает приложение как обычный сайт (`url`), а не как Mini App (`web_app`).

### ❌ Неправильно (откроется как сайт, expand() НЕ сработает):

```python
# Python (aiogram) - НЕПРАВИЛЬНО
InlineKeyboardButton(text="⚔️ В БОЙ", url="https://skilyapp.com")
```

### ✅ Правильно (Mini App, expand() сработает):

```python
# Python (aiogram) - ПРАВИЛЬНО
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(
        text="⚔️ В БОЙ", 
        web_app=WebAppInfo(url="https://skilyapp.com")
    )]
])
```

### Для Node.js (telegraf):

```javascript
// ❌ НЕПРАВИЛЬНО
Markup.button.webApp('⚔️ В БОЙ', 'https://skilyapp.com') // Это тоже неправильно!

// ✅ ПРАВИЛЬНО
Markup.button.webApp('⚔️ В БОЙ', { url: 'https://skilyapp.com' })
// или
{
  text: '⚔️ В БОЙ',
  web_app: { url: 'https://skilyapp.com' }
}
```

## 🛠 Дополнительные шаги для решения проблемы:

### 1. Сброс кэша Telegram через BotFather

1. Откройте **@BotFather** в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите **Bot Settings** → **Menu Button** (или где у вас настроена ссылка)
5. Измените ссылку, добавив параметр версии:
   - Было: `https://skilyapp.com`
   - Стало: `https://skilyapp.com?v=expand_fix_v2`
6. Сохраните изменения
7. **Перезагрузите Telegram** на телефоне (закройте и откройте заново)

### 2. Проверка в консоли браузера

Откройте приложение в Telegram и проверьте консоль (через Eruda или через Desktop версию Telegram):

Должны увидеть:
```
[Telegram Expand] 🚀 Script version: v2.0-expand-fix loaded at ...
[Telegram Expand] ✅ expand() called (attempt 1) in index.html
[Telegram Expand] ✅ ready() called in index.html
```

Если видите эти сообщения, но приложение все равно открывается шторкой - проблема в типе кнопки или кэше.

### 3. Проверка типа кнопки

Если вы используете библиотеку для отправки кнопок, проверьте код:

**Python (aiogram):**
```python
# Найдите в коде где создается кнопка
# Должно быть:
web_app=WebAppInfo(url="...")
# НЕ должно быть:
url="..."
```

**Node.js (telegraf):**
```javascript
// Найдите в коде где создается кнопка
// Должно быть:
web_app: { url: '...' }
// НЕ должно быть:
url: '...'
```

## 📋 Чеклист для проверки:

- [ ] Кнопка использует `web_app`, а не `url`
- [ ] Ссылка в BotFather обновлена с параметром версии (`?v=...`)
- [ ] Telegram перезагружен на телефоне
- [ ] В консоли видны сообщения `[Telegram Expand] ✅`
- [ ] CSS содержит `min-height: 100vh` для `html`, `body`, `#root`
- [ ] Viewport мета-тег содержит `user-scalable=no`

## 🚨 Если ничего не помогает:

1. Проверьте, что приложение открывается через **Menu Button** или **Inline Button с web_app**
2. Попробуйте открыть приложение через прямой URL в Telegram Desktop (там можно посмотреть консоль)
3. Убедитесь, что используете последнюю версию Telegram
4. Попробуйте открыть приложение в другом Telegram аккаунте (для проверки кэша)

## 📝 Примечание:

Скрипт в `index.html` - это "ядерное оружие". Если он не сработал, значит:
- Либо загружается старая версия файла (кэш Telegram)
- Либо кнопка настроена как обычная ссылка (`url`), а не Mini App (`web_app`)









