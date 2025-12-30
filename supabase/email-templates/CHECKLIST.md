# ✅ Email Templates — Чеклист установки

## 📦 Что создано

```
supabase/email-templates/
├── auth-confirm-en.html    ← Английский шаблон (production)
├── auth-confirm-es.html    ← Испанский шаблон (production)
├── preview-en.html         ← Превью для локального просмотра
└── README.md               ← Инструкции

public/email-assets/
└── skily-logo.png          ← Логотип (64x64px, PNG)
```

## 🚀 Шаги установки

### 1️⃣ Загрузить логотип на продакшн

**Вариант А: После деплоя проекта**
- Логотип уже в `/public/email-assets/skily-logo.png`
- После деплоя будет доступен автоматически
- URL: `https://your-domain.com/email-assets/skily-logo.png`

**Вариант Б: На CDN (быстрее)**
1. Загрузи `public/email-assets/skily-logo.png` на Cloudinary/ImgBB
2. Получи публичный URL
3. Замени в шаблонах `{{ .SiteURL }}/email-assets/skily-logo.png` на твой URL

### 2️⃣ Настроить Supabase

1. Открой **Supabase Dashboard**
2. Перейди в **Authentication** → **Email Templates**
3. Найди **"Confirm signup"** (или "Magic Link")
4. Скопируй содержимое:
   - `auth-confirm-en.html` для английского
   - `auth-confirm-es.html` для испанского
5. Вставь в редактор
6. **Важно**: Проверь, что в **Settings** → **URL Configuration** установлен правильный `Site URL`
7. Нажми **Save**

### 3️⃣ Тестирование

**Локально:**
```bash
# Открыть превью
open supabase/email-templates/preview-en.html
```

**В Supabase:**
```javascript
// В консоли или через тестовую регистрацию
const { error } = await supabase.auth.signInWithOtp({
  email: 'your-test@email.com'
})
```

### 4️⃣ Проверка на совместимость

Отправь тестовое письмо на:
- Gmail (приоритет 1)
- Outlook (приоритет 2)
- iPhone Mail (приоритет 3)

Проверь:
- ✅ Логотип загружается
- ✅ Кнопка кликабельна
- ✅ Текст читаемый
- ✅ Нет битых элементов в Outlook

## 🎨 Настройка под твой бренд

### Изменить Site URL в Supabase
```
Dashboard → Settings → URL Configuration → Site URL
Установи: https://skily-app.com (или твой домен)
```

### Изменить цвета (опционально)
Найди в шаблонах и замени:
- `#6366f1` → твой основной цвет
- `#8b5cf6` → твой акцентный цвет

### Добавить другие языки
Скопируй `auth-confirm-en.html` и переведи текст:
- Заголовок: `Sign in to Skily 🚀`
- Описание: `You requested a login link...`
- Кнопка: `Sign in now`
- Футер: `All rights reserved`

## ⚠️ Важные детали

### Логотип ОБЯЗАТЕЛЬНО должен быть hosted

❌ **НЕ РАБОТАЕТ:**
```html
<img src="file:///Users/dimka/..." />  <!-- Локальный путь -->
<img src="/logo.png" />                 <!-- Относительный путь -->
```

✅ **РАБОТАЕТ:**
```html
<img src="https://skily-app.com/email-assets/skily-logo.png" />
<img src="https://res.cloudinary.com/your-cloud/skily-logo.png" />
<img src="data:image/png;base64,iVBORw0KG..." />  <!-- Инлайн, но тяжёлое письмо -->
```

### Supabase переменные

В шаблонах используются:
- `{{ .ConfirmationURL }}` — ссылка подтверждения (**НЕ УДАЛЯЙ**)
- `{{ .SiteURL }}` — URL твоего сайта (берётся из настроек Supabase)
- `{{ .Email }}` — email пользователя (опционально)

### Outlook-совместимость

В шаблоне есть VML-fallback для Outlook:
```html
<!--[if mso]>
  <v:roundrect ...>
    <center>Sign in now</center>
  </v:roundrect>
<![endif]-->
```

**Не удаляй эти комментарии** — иначе кнопка сломается в Outlook!

## 🐛 Траблшутинг

### Логотип не загружается
1. Проверь URL в браузере напрямую
2. Убедись, что домен в `Site URL` правильный
3. Проверь CORS-настройки (если логотип на другом домене)

### Письмо не приходит
1. Проверь спам
2. Проверь лимиты в **Supabase → Settings → Rate Limits**
3. Проверь логи в **Supabase → Logs**

### Стили не применяются
- В email **ТОЛЬКО инлайн-стили** (`style="..."`)
- НЕ используй `<style>` блоки — они не поддерживаются

### Кнопка не кликабельна в Outlook
- Проверь, что есть VML-блок `<!--[if mso]>`
- Используй простые цвета (`#6366f1`, не `rgba()`)

## 📊 Метрики (опционально)

Для отслеживания открытий добавь перед `</body>`:

```html
<img src="{{ .SiteURL }}/api/track?event=email_open&user={{ .Email }}" 
     width="1" height="1" style="display:none;" alt=""/>
```

Реализуй endpoint в Edge Functions для логирования.

## 🎯 Следующие шаги

1. ✅ Задеплой проект (чтобы логотип стал доступен)
2. ✅ Настрой шаблоны в Supabase Dashboard
3. ✅ Протестируй регистрацию/вход
4. ✅ Проверь в разных почтовых клиентах
5. ✅ При необходимости подкрути цвета/текст

---

**Готово? 🚀**  
После деплоя твои пользователи будут получать премиум-письма вместо дефолтных Supabase-шаблонов!
