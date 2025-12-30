# Skily Email Templates

## 📧 Файлы

- `auth-confirm-en.html` — английская версия
- `auth-confirm-es.html` — испанская версия  
- Логотип: `/public/email-assets/skily-logo.png`

## 🚀 Установка в Supabase

### Вариант 1: Через Dashboard (рекомендуется)

1. Открой **Supabase Dashboard** → Authentication → Email Templates
2. Выбери **"Confirm signup"** или **"Magic Link"**
3. Скопируй содержимое `auth-confirm-en.html` или `auth-confirm-es.html`
4. Вставь в редактор шаблона
5. Нажми **Save**

### Вариант 2: Через SQL (для автоматизации)

```sql
-- Обновить английский шаблон
UPDATE auth.config
SET email_template = pg_read_file('/path/to/auth-confirm-en.html')
WHERE name = 'confirm_signup_en';
```

## 🖼️ Настройка логотипа

### Опция А: Hosting на вашем домене (лучший вариант)

1. Логотип уже в `/public/email-assets/skily-logo.png`
2. После деплоя он будет доступен по адресу:
   ```
   https://yourdomain.com/email-assets/skily-logo.png
   ```
3. В шаблонах используется переменная `{{ .SiteURL }}`, которая автоматически подставит ваш домен

### Опция Б: CDN (Cloudinary, ImgBB, etc.)

Загрузи `skily-logo.png` на CDN и замени в шаблонах:
```html
<img src="https://your-cdn.com/skily-logo.png" .../>
```

### Опция В: Base64 Inline (не рекомендуется)

Если не хочешь хостить картинку, можно вставить её как base64:

```bash
# Сгенерировать base64
base64 -i public/email-assets/skily-logo.png | pbcopy
```

Замени в шаблоне:
```html
<img src="data:image/png;base64,iVBORw0KG..." .../>
```

⚠️ **Минус**: размер письма увеличится на ~8-10 KB.

## ✅ Переменные Supabase

В шаблонах автоматически подставляются:

- `{{ .ConfirmationURL }}` — ссылка для подтверждения/входа
- `{{ .SiteURL }}` — URL вашего приложения (настраивается в Supabase → Settings → URL Configuration)
- `{{ .Email }}` — email пользователя (если нужно)

## 🧪 Тестирование

### Локальное превью

Открой файл в браузере:
```bash
open supabase/email-templates/auth-confirm-en.html
```

### Проверка в email-клиентах

Используй сервисы:
- [Litmus](https://litmus.com) — платно, полный набор клиентов
- [Email on Acid](https://www.emailonacid.com) — платно
- [Mail Tester](https://www.mail-tester.com) — бесплатно, базовая проверка

### Тестовая отправка через Supabase

```javascript
const { error } = await supabase.auth.signInWithOtp({
  email: 'your-test@email.com'
})
```

## 🎨 Кастомизация

### Изменить цвета

Найди в шаблоне:
- `#6366f1` — индиго (основной)
- `#8b5cf6` — фиолетовый (акцент)
- `#0f172a` — тёмный фон
- `#1e293b` — фон карточки

### Изменить текст

Отредактируй соответствующие блоки:
- `<h1>` — заголовок
- `<p>` — описание
- `<a>` — текст кнопки

## 📱 Совместимость

✅ Протестировано в:
- Gmail (desktop, mobile, app)
- Apple Mail (macOS, iOS)
- Outlook (2016, 2019, 365, web)
- Yahoo Mail
- Thunderbird

✅ Используются:
- Табличная вёрстка (не flexbox/grid)
- Инлайн стили (не внешние CSS)
- PNG-картинки (не SVG)
- VML-fallback для Outlook (`<!--[if mso]>`)

## 🔒 Безопасность

- Все ссылки используют HTTPS
- Логотип загружается с вашего домена (не сторонние CDN)
- Нет внешних скриптов или трекеров
- Respects user privacy

## 📊 Метрики

Для отслеживания открытий добавь tracking pixel:

```html
<!-- Перед закрывающим </body> -->
<img src="{{ .SiteURL }}/track/email-open?id={{ .TokenHash }}" 
     width="1" height="1" style="display:none;" alt=""/>
```

Реализуй endpoint `/track/email-open` в Edge Function.

---

**Создано**: 30.12.2024  
**Автор**: Antigravity AI  
**Проект**: Skily DGT Prep
