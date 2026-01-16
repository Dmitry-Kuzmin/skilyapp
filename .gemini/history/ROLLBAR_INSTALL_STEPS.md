# 🚀 Пошаговая инструкция: Установка Rollbar

## ✅ Что я уже сделал:

1. ✅ Создал утилиту `src/lib/rollbar.ts` для работы с Rollbar
2. ✅ Обновил `ErrorBoundary.tsx` - теперь отправляет ошибки в Rollbar
3. ✅ Обновил `main.tsx` - глобальная обработка ошибок с отправкой в Rollbar
4. ✅ Обновил `webVitals.ts` - отправка плохих метрик в Rollbar
5. ✅ Добавил `rollbar` в `package.json`

---

## 📋 Что нужно сделать ТЕБЕ (БЕЗ интеграции Vercel):

**🎉 Хорошие новости:** Интеграция Vercel не нужна! Настроим Rollbar напрямую - это даже проще.

---

### Шаг 1: Зарегистрироваться в Rollbar

1. Открой https://rollbar.com
2. Нажми **"Sign Up"** (или войди, если уже есть аккаунт)
3. Зарегистрируйся **бесплатно** (бесплатный план: 5,000 событий/месяц)

---

### Шаг 2: Создать проект в Rollbar

1. После входа нажми **"Create Project"** (или **"New Project"**)
2. Выбери тип проекта:
   - **"JavaScript"** → **"Browser"** (Client-side)
3. Заполни информацию:
   - **Project Name**: `sdadim-dgt-prep` (или любое название)
   - **Framework**: оставь пустым или выбери "React"
4. Нажми **"Create Project"** или **"Continue"**

---

### Шаг 3: Получить токен

После создания проекта ты увидишь страницу с инструкцией. Нужен токен:

1. На странице проекта найди раздел **"Client-side access token"**
2. Скопируй токен, который начинается с `post_client_...`
   - Или найди в **Settings** → **Project Access Tokens**
   - Нужен именно **Client-side** токен (не Server-side)

**Важно:** Сохрани этот токен - он понадобится в следующем шаге!

---

### Шаг 4: Добавить токен в Vercel Environment Variables

1. В Vercel открой проект **sdadim-dgt-prep** (ты уже там на странице Settings)
2. В левом боковом меню Settings найди **"Environment Variables"** (или прокрути вниз)
3. Нажми **"Add New"** или **"Add Variable"**
4. Заполни:
   - **Key**: `VITE_ROLLBAR_ACCESS_TOKEN`
   - **Value**: вставь токен из шага 3 (начинается с `post_client_...`)
   - **Environment**: выбери все три ✅:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
5. Нажми **"Save"**

**Готово!** Токен теперь сохранён в Vercel.

---

### Шаг 5: Установить npm пакет

В терминале выполни:

```bash
npm install
```

(Пакет `rollbar` уже добавлен в `package.json`, просто установи зависимости)

---

### Шаг 6: Готово! Скажи мне "готово"

После установки пакета скажи мне "готово" - я:
- ✅ Закоммичу изменения
- ✅ Запушу в GitHub
- ✅ После деплоя в Vercel всё заработает автоматически!

---

## ✅ Проверка работы (после деплоя)

После того, как Vercel задеплоит изменения:

1. Открой Rollbar Dashboard: https://rollbar.com
2. Перейди в твой проект (sdadim-dgt-prep)
3. В разделе **"Items"** (или **"Errors"**) должны появиться ошибки из production

**Тест:**
- Открой production версию сайта: https://skilyapp.com
- В консоли браузера (F12) выполни: `throw new Error('Test Rollbar')`
- Ошибка должна появиться в Rollbar в течение 1-2 секунд

---

## 🎯 Итого - твои действия:

1. ✅ Зарегистрироваться на https://rollbar.com (бесплатно)
2. ✅ Создать проект типа "JavaScript" → "Browser"
3. ✅ Скопировать Client-side токен (начинается с `post_client_...`)
4. ✅ В Vercel → Settings → Environment Variables → добавить:
   - Key: `VITE_ROLLBAR_ACCESS_TOKEN`
   - Value: токен из шага 3
   - Environment: все три (Production, Preview, Development)
5. ✅ Запустить `npm install` в терминале
6. ✅ Сказать мне "готово" - я закоммичу и запушу изменения

---

## 💡 Альтернатива: Если не нашёл токен

Если не можешь найти токен в Rollbar:

1. В Rollbar Dashboard перейди в **Settings** → **Project Access Tokens**
2. Нажми **"Create Access Token"**
3. Выбери **"Client-side (browser)"**
4. Нажми **"Create"**
5. Скопируй токен

---

**Всё готово к установке!** Следуй инструкциям выше. Если что-то непонятно - спрашивай! 🚀

