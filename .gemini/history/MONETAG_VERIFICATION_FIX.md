# 🔧 Исправление верификации Monetag

## Проблема:

Файл `sw.js` не работает для верификации, потому что **VitePWA плагин перезаписывает его** своим service worker.

Когда Monetag пытается проверить `https://skilyapp.com/sw.js`, он получает PWA service worker вместо файла верификации.

---

## ✅ Решение: Метод верификации через Meta Tag

Добавлены meta теги в `<head>` файла `index.html`:

```html
<!-- Monetag Website Verification -->
<meta name="monetag-site-verification" content="5gvci.com" />
<meta name="monetag-zone-id" content="10323310" />
```

---

## 📋 Что сделать дальше:

### Вариант 1: Использовать Meta Tag метод (если Monetag поддерживает)

1. В панели Monetag выбери **"Other options"** или **"Meta tag verification"**
2. Укажи, что используешь meta tag в `<head>`
3. После деплоя нажми "Verify"

### Вариант 2: Использовать альтернативный файл

Если Monetag требует именно файл:
1. Попроси поддержку Monetag об альтернативном имени файла (например, `monetag-verification.txt`)
2. Файл `monetag-verification.txt` уже добавлен в `public/`
3. После деплоя он будет доступен по `https://skilyapp.com/monetag-verification.txt`

---

## ⚠️ Почему `sw.js` не работает:

1. VitePWA генерирует свой `sw.js` для PWA функционала
2. При сборке он перезаписывает наш файл верификации
3. Monetag видит PWA service worker вместо файла верификации

---

## 📝 Дополнительные варианты:

### Вариант 3: Переименовать PWA Service Worker

Можно изменить имя PWA service worker в `vite.config.ts`:

```typescript
VitePWA({
  filename: 'pwa-sw.js', // Вместо sw.js
  // ...
})
```

Но это **НЕ рекомендуется**, так как может сломать PWA функционал.

---

## 🎯 Рекомендация:

**Связаться с поддержкой Monetag** и спросить:
1. Поддерживают ли они верификацию через meta tag?
2. Могут ли они использовать другой файл (например, `monetag-verification.txt`)?
3. Есть ли альтернативные методы верификации?

---

**Файлы готовы. После деплоя попробуй верификацию с meta tag или свяжись с поддержкой.**

