# 🔗 Правильная настройка URL для AdsGram

## ❌ Почему ошибки в форме?

AdsGram показывает две ошибки:
1. **"Enter a valid direct link"** (Telegram direct link)
2. **"Links to t.me are not allowed"** (Web app url)

Это потому что:
- **Web app url** должен быть **реальным веб-URL** (Vercel, домен), а не `t.me` ссылкой
- **Telegram direct link** должна быть ссылкой на Web App в боте, а не просто на бота

---

## ✅ Правильные значения для формы

### 1. Web app url

**Это URL, где хостится ваше приложение в интернете.**

Варианты:

**A) Если используете Vercel (рекомендуется):**
```
https://skily-app.vercel.app
```
или
```
https://skilyapp.com  (если есть кастомный домен)
```

**B) Если еще не задеплоено:**
1. Задеплойте на Vercel:
   ```bash
   npm run build
   vercel deploy --prod
   ```
2. Получите URL от Vercel (например: `https://sdadim-dgt-prep.vercel.app`)
3. Используйте этот URL в форме

**C) Для тестирования (временно):**
- Можно использовать Cloudflare Tunnel URL (но он меняется)
- Для продакшена лучше Vercel

### 2. Telegram direct link

**Это ссылка на ваш Web App в Telegram боте.**

**Как получить правильную ссылку:**

1. **Через BotFather:**
   - Откройте @BotFather в Telegram
   - Отправьте `/setmenubutton`
   - Выберите вашего бота
   - Нажмите "Set menu button"
   - Введите текст кнопки (например: "Открыть приложение")
   - Введите URL: `https://your-webapp-url.com` (тот же, что в Web app url)
   - BotFather автоматически создаст ссылку вида: `https://t.me/botname/webapp`

2. **Используйте эту ссылку в форме:**
   ```
   https://t.me/skilyapp_bot/webapp
   ```
   (замените `skilyapp_bot` на имя вашего бота)

**Если Menu Button уже настроен:**
- Откройте бота в Telegram
- Нажмите на Menu Button (кнопка внизу экрана)
- Скопируйте ссылку из адресной строки браузера
- Или просто используйте формат: `https://t.me/BOTNAME/webapp`

### 3. Bot ID

**Это числовой ID вашего Telegram бота.**

**Как получить:**
1. Откройте @userinfobot в Telegram
2. Отправьте ему команду `/start`
3. Бот покажет ID (число вида `123456789`)
4. Или используйте API: `https://api.telegram.org/bot<TOKEN>/getMe`

---

## 📝 Пример заполненной формы

```
App name: Skily
Telegram direct link: https://t.me/skilyapp_bot/webapp
Web app url: https://skily-app.vercel.app
Bot ID: 123456789
Test platform: ✓ (поставьте галочку для тестирования)
```

---

## 🚀 Что делать если еще не задеплоено?

1. **Задеплойте на Vercel:**
   ```bash
   npm run build
   vercel deploy --prod
   ```

2. **Или используйте Vercel CLI:**
   ```bash
   vercel --prod
   ```

3. **Получите URL** от Vercel

4. **Настройте Menu Button** в BotFather с этим URL

5. **Заполните форму** AdsGram с полученными данными

---

## ⚠️ Важно

- **Web app url** должен быть **публично доступен** (AdsGram проверяет его)
- **Web app url** должен быть **HTTPS** (обязательно!)
- **Web app url** **НЕ должен** быть `t.me` ссылкой
- **Telegram direct link** должна открывать Web App через Telegram

---

## 🔍 Проверка

После заполнения формы проверьте:

1. **Web app url открывается в браузере:**
   - Откройте `https://your-url.com` в браузере
   - Должна открыться ваша страница

2. **Telegram direct link работает:**
   - Откройте `https://t.me/botname/webapp` в браузере
   - Должен открыться Telegram и запуститься ваше приложение

Если оба URL работают - форма должна пройти валидацию! ✅

