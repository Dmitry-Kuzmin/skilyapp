# 🔍 Где проверить SSG (Static Site Generation)

## ✅ Быстрая проверка (30 секунд)

### Вариант 1: View Source (самый простой)
1. Открой `https://skilyapp.com/` в браузере
2. **Правый клик** → **"Просмотреть исходный код страницы"**
   - Mac: `Cmd+U`
   - Windows: `Ctrl+U`
3. Найди `<div id="root">` в HTML
   - ✅ **Если внутри есть контент** (текст, элементы) → SSG работает!
   - ❌ **Если пусто** `<div id="root"></div>` → SSG не работает

### Вариант 2: DevTools (более детально)
1. Открой `https://skilyapp.com/` в Safari/Chrome
2. Открой DevTools:
   - Mac: `Cmd+Option+I`
   - Windows: `F12`
3. Вкладка **"Источники" (Sources)** → `skilyapp.com` → `index.html`
4. Проверь контент в `<div id="root">`

## 📊 Что искать в HTML

### ✅ Признаки работающего SSG:
```html
<div id="root">
  <div>...</div>  <!-- Есть контент! -->
  <h1>Сдай теорию DGT</h1>
  <!-- И т.д. -->
</div>
```

### ❌ Признаки НЕ работающего SSG:
```html
<div id="root"></div>  <!-- Пусто! -->
```

## 🎯 Дополнительные проверки

### Проверка мета-тегов (SEO)
В View Source найди в `<head>`:
- ✅ `<title>Skilyapp — Подготовка...</title>` (заполнен)
- ✅ `<meta name="description" content="...">` (заполнен)
- ✅ `<link rel="preload" as="image" href="...noise.svg">` (есть preload)
- ✅ `<script type="application/ld+json">` (есть structured data)

Если все это есть → SSG работает отлично!

### Проверка других страниц
- `https://skilyapp.com/blog` → должен быть `blog.html` с контентом
- `https://skilyapp.com/article/novye-voprosy-dgt-2025` → должен быть HTML с контентом

## 🚨 Если SSG не работает

1. Проверь `vercel.json` rewrites
2. Убедись, что `npm run build:prerender` выполнился локально
3. Проверь, что `vercel build --prod` использовал готовый `dist/`
4. Проверь логи деплоя на Vercel

