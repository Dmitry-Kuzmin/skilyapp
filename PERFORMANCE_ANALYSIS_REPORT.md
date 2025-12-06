# Полный отчет о производительности приложения Skilyapp

**Дата анализа:** 6 декабря 2025  
**URL:** https://skilyapp.com/  
**PageSpeed Insights (Mobile):** 66/100  
**PageSpeed Insights (Desktop):** 93/100

---

## 📊 Текущие метрики

### Mobile Performance
- **Performance Score:** 66/100 (оранжевый)
- **Accessibility:** 94/100 (зеленый) ✅
- **Best Practices:** 100/100 (зеленый) ✅
- **SEO:** 100/100 (зеленый) ✅

### Desktop Performance
- **Performance Score:** 93/100 (зеленый) ✅
- **Accessibility:** 94/100 (зеленый) ✅
- **Best Practices:** 100/100 (зеленый) ✅
- **SEO:** 100/100 (зеленый) ✅

---

## 🤔 Почему приложение "летает", но PSI показывает 66?

### 1. **Разница между реальным опытом и PSI**

PageSpeed Insights использует **синтетические тесты** в контролируемых условиях:
- **Медленная сеть:** 4G Slow (1.6 Mbps down, 750 Kbps up, 150ms RTT)
- **Слабый CPU:** 4x slowdown (имитация мобильного устройства)
- **Холодный старт:** Без кэша, без Service Worker
- **Первая загрузка:** Все ресурсы загружаются с нуля

**В реальности:**
- Пользователи часто имеют быстрый интернет (WiFi, 5G)
- Современные устройства имеют мощные CPU
- Service Worker кэширует ресурсы после первой загрузки
- Повторные визиты используют кэш

### 2. **SPA (Single Page Application) особенности**

React SPA имеет особенности, которые PSI "штрафует":
- **Большой initial bundle:** React, ReactDOM, Supabase, TanStack Query (~500KB+ gzipped)
- **JavaScript execution time:** Парсинг и выполнение JS блокирует main thread
- **Hydration:** React должен "оживить" статический HTML
- **Code splitting:** Chunks загружаются по требованию, но PSI проверяет только initial load

### 3. **Текущая архитектура**

**Что уже оптимизировано:**
- ✅ Code splitting (vendor, icons, router, toast, storage chunks)
- ✅ Lazy loading страниц (React.lazy)
- ✅ Service Worker для кэширования
- ✅ Preload критических ресурсов
- ✅ Оптимизация компонентов (React.memo, useMemo, useCallback)
- ✅ Inline critical CSS
- ✅ Оптимизация изображений (width/height, lazy loading)
- ✅ Cache-Control headers

**Что может быть улучшено:**
- ⚠️ Размер vendor.js все еще большой (~500KB+ gzipped)
- ⚠️ Много зависимостей (@radix-ui, framer-motion, lucide-react)
- ⚠️ Нет SSR/SSG для первого рендера
- ⚠️ Нет streaming для критического контента

---

## 📦 Анализ bundle size

### Основные chunks (примерные размеры после gzip):

1. **vendor.js** (~500KB gzipped)
   - React + ReactDOM
   - @supabase/supabase-js
   - @tanstack/react-query
   - @radix-ui/* (много компонентов)
   - zustand
   - Другие зависимости

2. **index.js** (~150KB gzipped)
   - Основной код приложения
   - Роутинг
   - Утилиты

3. **icons-vendor.js** (~100KB gzipped)
   - lucide-react (иконки)

4. **router-vendor.js** (~50KB gzipped)
   - react-router-dom

5. **toast-vendor.js** (~20KB gzipped)
   - sonner

6. **storage-vendor.js** (~10KB gzipped)
   - idb-keyval

**Итого initial load:** ~830KB gzipped JavaScript

### Проблема:
- PSI рекомендует < 200KB для initial JavaScript
- У нас ~830KB (в 4 раза больше)
- Это основной фактор низкого Performance Score

---

## 🎯 Core Web Vitals (ожидаемые значения)

### Mobile (4G Slow):
- **FCP (First Contentful Paint):** < 1.8s (хорошо), < 3.0s (нужно улучшить)
- **LCP (Largest Contentful Paint):** < 2.5s (хорошо), < 4.0s (нужно улучшить)
- **TBT (Total Blocking Time):** < 200ms (хорошо), < 600ms (нужно улучшить)
- **CLS (Cumulative Layout Shift):** < 0.1 (хорошо), < 0.25 (нужно улучшить)
- **TTI (Time to Interactive):** < 3.8s (хорошо), < 7.3s (нужно улучшить)

### Desktop:
- Все метрики обычно лучше из-за более мощного CPU и быстрой сети

---

## 🔍 Возможные причины расхождения

### 1. **Service Worker кэширование**
- После первой загрузки SW кэширует все ресурсы
- Повторные визиты загружаются мгновенно
- PSI всегда тестирует "холодный старт"

### 2. **Сетевая скорость**
- PSI: 4G Slow (1.6 Mbps)
- Реальность: WiFi (50-100 Mbps) или 5G (100+ Mbps)
- Разница в 30-60 раз!

### 3. **CPU мощность**
- PSI: 4x slowdown (имитация слабого мобильного)
- Реальность: Современные устройства (iPhone 12+, Android 10+)
- Разница в 4-8 раз

### 4. **Кэш браузера**
- PSI: Без кэша
- Реальность: Браузер кэширует статические ресурсы
- Повторные визиты загружаются из кэша

### 5. **Интерактивность vs метрики**
- PSI измеряет **initial load** (первые 3-5 секунд)
- Пользователи оценивают **интерактивность** (после загрузки)
- После загрузки приложение действительно "летает"

---

## 💡 Рекомендации для улучшения PSI Score

### Критичные (высокий приоритет):

1. **Уменьшить размер vendor.js**
   - Рассмотреть замену тяжелых библиотек на более легкие альтернативы
   - Tree-shaking для @radix-ui (использовать только нужные компоненты)
   - Динамический импорт для framer-motion (используется не везде)
   - Рассмотреть замену lucide-react на более легкую библиотеку иконок

2. **SSR/SSG для первого рендера**
   - Использовать Next.js или Remix для SSR
   - Или добавить SSG для статических страниц (dashboard, landing)
   - Это даст мгновенный FCP и LCP

3. **Streaming для критического контента**
   - Отправлять HTML с критическим контентом сразу
   - Загружать JavaScript асинхронно
   - Использовать Suspense boundaries для progressive rendering

### Средний приоритет:

4. **Оптимизация изображений**
   - Конвертировать все изображения в WebP/AVIF
   - Использовать responsive images (srcset)
   - Lazy loading для всех изображений ниже fold

5. **Оптимизация шрифтов**
   - Использовать system fonts (уже используется)
   - Или preload критических шрифтов
   - font-display: swap (уже настроено)

6. **Дополнительное code splitting**
   - Разделить vendor.js на более мелкие chunks
   - Lazy load неиспользуемые библиотеки
   - Динамический импорт для тяжелых компонентов

### Низкий приоритет:

7. **Оптимизация CSS**
   - Удалить unused CSS (Tailwind уже делает это)
   - Critical CSS inline (уже сделано)
   - Разделить CSS на chunks

8. **Оптимизация API запросов**
   - Кэширование на уровне React Query (уже настроено)
   - Prefetch критических данных
   - Оптимизация Supabase запросов

---

## 🚀 Стратегия улучшения

### Вариант 1: Минимальные изменения (быстро)
- Улучшить code splitting
- Оптимизировать изображения
- Уменьшить размер vendor.js через tree-shaking
- **Ожидаемый результат:** 70-75 PSI Score

### Вариант 2: Средние изменения (1-2 недели)
- Добавить SSR/SSG для критических страниц
- Заменить тяжелые библиотеки на легкие альтернативы
- Streaming для критического контента
- **Ожидаемый результат:** 80-85 PSI Score

### Вариант 3: Полная оптимизация (1-2 месяца)
- Миграция на Next.js или Remix
- Полная переработка bundle structure
- Оптимизация всех зависимостей
- **Ожидаемый результат:** 90+ PSI Score

---

## 📝 Выводы

### Текущая ситуация:
- ✅ **Desktop Performance:** 93/100 (отлично!)
- ⚠️ **Mobile Performance:** 66/100 (нужно улучшить)
- ✅ **Accessibility, Best Practices, SEO:** Все 90+

### Почему приложение "летает":
1. **Service Worker кэширование** - повторные визиты мгновенные
2. **Быстрая сеть** - реальные пользователи имеют WiFi/5G
3. **Мощные устройства** - современные смартфоны быстрые
4. **Оптимизированный код** - после загрузки все работает быстро

### Почему PSI показывает 66:
1. **Большой initial bundle** - ~830KB gzipped JavaScript
2. **Медленная сеть в тесте** - 4G Slow (1.6 Mbps)
3. **Слабый CPU в тесте** - 4x slowdown
4. **Холодный старт** - без кэша, без SW

### Рекомендация:
**Если приложение действительно "летает" для пользователей**, то:
- PSI Score 66 - это нормально для SPA с большим bundle
- Desktop 93 - отличный результат
- Можно продолжить оптимизацию, но это не критично

**Если хотите улучшить PSI Score:**
- Начать с уменьшения vendor.js
- Рассмотреть SSR/SSG для критических страниц
- Оптимизировать изображения и шрифты

---

## 🔗 Полезные ссылки

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Web Vitals](https://web.dev/vitals/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

---

**Автор:** AI Assistant  
**Дата:** 6 декабря 2025  
**Версия:** 1.0

