# 🔧 Решение проблемы Puppeteer на Vercel

**Дата:** 5 декабря 2025  
**Проблема:** Puppeteer не может найти Chrome на Vercel

## 🔴 Проблема

```
Error: Could not find Chrome (ver. 143.0.7499.40)
```

**Причина:** Vercel не имеет Chrome установленного по умолчанию в нужном месте.

## ✅ Решения

### Вариант 1: Установить Chrome через @puppeteer/browsers (РЕКОМЕНДУЕТСЯ)

**Установка:**
```bash
npm install @puppeteer/browsers
```

**Использование в prerender.js:**
```javascript
import { install } from '@puppeteer/browsers';

// Устанавливаем Chrome перед запуском
if (process.env.VERCEL) {
  await install({
    browser: 'chrome',
    cacheDir: '/tmp/.cache/puppeteer',
  });
}
```

### Вариант 2: Использовать системный Chrome (текущий подход)

Пробуем найти Chrome в стандартных местах Vercel.

### Вариант 3: Запускать prerender локально

Запускать prerender перед деплоем и коммитить готовые HTML файлы.

### Вариант 4: Использовать альтернативный SSG

- Vite SSG плагин
- Другой инструмент для статической генерации

## 🎯 Текущее решение

Используем **Вариант 2** с улучшенной обработкой ошибок:
- Поиск Chrome в стандартных местах
- Правильные аргументы для Vercel
- Graceful degradation (не падаем, если Chrome не найден)

## 📝 Если не сработает

Нужно будет:
1. Установить `@puppeteer/browsers`
2. Добавить установку Chrome в build процесс
3. Или использовать альтернативный подход

