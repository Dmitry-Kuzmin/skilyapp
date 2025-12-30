# 🚀 Quick Start — Билингвальный Email шаблон

## ⚡ За 2 минуты

### 1. Открой Supabase Dashboard
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID
```

### 2. Перейди в Email Templates
```
Authentication → Email Templates → Confirm signup
```

### 3. Скопируй и вставь
Открой `auth-confirm-bilingual.html`, скопируй **весь** код, вставь в Supabase.

### 4. Проверь Site URL
```
Settings → URL Configuration → Site URL
Должно быть: https://your-domain.com
```

### 5. Save ✅

---

## 📋 Что дальше?

### После деплоя:
1. Логотип будет доступен по:
   ```
   https://your-domain.com/email-assets/skily-logo.png
   ```
2. Если домена еще нет → используй временный (Vercel/Netlify preview)

### Тестирование:
```javascript
// В консоли браузера или через API
const { error } = await supabase.auth.signInWithOtp({
  email: 'your-email@test.com'
})
```

Проверь:
- ✅ Письмо приходит
- ✅ Логотип загружается
- ✅ Кнопка работает
- ✅ Оба языка видны

---

## 🎨 Что улучшено vs стандартный Supabase:

| Feature | Supabase Default | Skily Bilingual |
|---------|------------------|-----------------|
| **Дизайн** | Текст + ссылка | Premium dark theme с градиентами |
| **Логотип** | ❌ Нет | ✅ 80×80 PNG с тенью |
| **Языки** | 1 | 2 (EN + ES) |
| **Security Info** | В тексте | 🔒 Отдельный блок |
| **Fallback Link** | ❌ Нет | ✅ Copy-paste опция |
| **Outlook Support** | ⚠️ Базовый | ✅ VML-fallback |
| **Mobile-friendly** | ⚠️ Средне | ✅ Responsive |

---

## 🔧 Если логотип не загружается:

### Вариант А (CDN — быстро):
1. Загрузи `public/email-assets/skily-logo.png` на [ImgBB](https://imgbb.com)
2. Получи прямую ссылку
3. Замени в шаблоне:
   ```html
   <img src="https://i.ibb.co/XXXXXXX/skily-logo.png" .../>
   ```

### Вариант Б (Base64 — offline):
```bash
base64 -i public/email-assets/skily-logo.png | pbcopy
```
Замени:
```html
<img src="data:image/png;base64,iVBORw0KG..." .../>
```

---

## 📱 Preview локально

```bash
open supabase/email-templates/preview-bilingual.html
```

Или перетащи файл в браузер.

---

## ✅ Готово!

Теперь твои пользователи получают **премиум-письма** вместо дефолтных Supabase.

**Выглядит как стартап на $10M, работает из коробки. 🚀**
