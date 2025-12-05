# 🔧 План исправления SSG

**Дата:** 5 декабря 2025  
**Проблема:** SSG не работает - FCP 4.5s

## 🔴 Найденные проблемы

### 1. View Source показал пустой root
```html
<div id="root"></div>
```
**Диагноз:** SSG не работает, Vercel отдает SPA index.html

### 2. vercel.json перехватывает все запросы
Последнее правило `"source": "/(.*)"` перехватывает `/` и отдает SPA вместо SSG

### 3. Prerender может не запускаться при деплое
Нужно проверить, запускается ли `prerender` при деплое на Vercel

## ✅ Исправления

### 1. Исправлен vercel.json ✅
- Добавлено явное правило для `/` → `/index.html` (SSG версия)
- Изменено catch-all правило, чтобы не перехватывать статические файлы
- Порядок: статика → SSG → SPA fallback

### 2. Исправлен build процесс ✅
- `npm run build` теперь автоматически запускает `prerender`
- Используется `npm run prerender` вместо прямого вызова
- SSG файлы генерируются при каждой сборке

### 3. Проверено:
- ✅ Prerender запускается при build
- ✅ SSG файлы сохраняются в `dist/`
- ✅ Порядок rewrites правильный

## 🎯 Следующие шаги

1. ✅ Исправить vercel.json
2. ⏳ Проверить, запускается ли prerender при деплое
3. ⏳ Добавить prerender в build процесс (если нужно)
4. ⏳ Перепроверить View Source после деплоя
5. ⏳ Проверить метрики PageSpeed

## 📝 Технические детали

### vercel.json изменения:
```json
{
  "rewrites": [
    // Статические файлы
    { "source": "/assets/:path*", "destination": "/assets/:path*" },
    { "source": "/:file\\.(js|css|...)", "destination": "/:file.$1" },
    
    // SSG файлы (ПЕРВЫМИ!)
    { "source": "/blog", "destination": "/blog.html" },
    { "source": "/article/:slug", "destination": "/article/:slug.html" },
    { "source": "/", "destination": "/index.html" }, // SSG версия
    
    // SPA fallback (последним, с исключениями)
    { "source": "/((?!assets|favicon|manifest|sw\\.js|workbox-.*\\.js).*)", "destination": "/index.html" }
  ]
}
```

### Build процесс:
- `npm run build` - собирает проект
- `npm run prerender` - генерирует SSG файлы
- Нужно убедиться, что Vercel запускает оба

