# 📊 Анализ производительности PageSpeed Insights

**Дата анализа:** 6 декабря 2025  
**URL:** https://skilyapp.com  
**Форма:** Mobile  
**Отчет:** https://pagespeed.web.dev/analysis/https-skilyapp-com/6uuiqh1895?form_factor=mobile

---

## 🎯 Основные метрики

| Метрика | Значение | Статус |
|---------|----------|--------|
| **Performance** | **71** | 🟠 Средний (нужно 80+) |
| Accessibility | 94 | ✅ Отлично |
| Best Practices | 100 | ✅ Отлично |
| SEO | 100 | ✅ Отлично |

### 📈 Динамика изменений

- **Было (до проблем):** 76
- **Стало (после исправления ошибок):** 71
- **Разница:** -5 (небольшое снижение, но стабильность восстановлена)

---

## 🔍 Анализ Bundle Size

### Текущие размеры chunks (из `npm run build:analyze`)

| Chunk | Размер (uncompressed) | Gzipped | Статус |
|-------|----------------------|---------|--------|
| **vendor.js** | **1,020.45 kB** | **315.01 kB** | 🔴 **КРИТИЧНО** |
| index.js | 361.57 kB | 118.43 kB | 🟡 Большой |
| tiptap-vendor.js | 415.67 kB | 126.88 kB | ✅ Изолирован |
| xlsx-vendor.js | 454.04 kB | 152.65 kB | ✅ Изолирован |
| ui-vendor.js | 121.29 kB | 40.64 kB | ✅ Нормально |
| Duel.js | 155.83 kB | 40.56 kB | ✅ Нормально |

### ⚠️ Проблема #1: vendor.js слишком большой

**vendor.js = 1,020.45 kB (315.01 kB gzipped)** - это **основная причина низкого Performance score**.

**Что внутри vendor.js:**
- React + React DOM (~150-200 kB)
- Supabase (~200-300 kB) - **НЕ должен быть в initial bundle для лендинга**
- TanStack Query (~50-100 kB) - **НЕ должен быть в initial bundle для лендинга**
- Radix UI (~100-150 kB) - **НЕ должен быть в initial bundle для лендинга**
- Другие зависимости (unified, micromark, rollbar, qr.js, linkifyjs, @floating-ui, zod)

**Проблема:** Несмотря на lazy loading `AppProviders`, Supabase/Query/Radix всё ещё попадают в `vendor.js`, который загружается на лендинге.

---

## 🚨 Основные проблемы производительности

### 1. Большой Initial Bundle (vendor.js)

**Проблема:**
- `vendor.js` = 1MB (315 KB gzipped) загружается на лендинге
- Supabase, TanStack Query, Radix UI находятся в `vendor.js`
- Это увеличивает время загрузки и парсинга JavaScript

**Причина:**
- Vite собирает все `node_modules` в один `vendor.js` по умолчанию
- Несмотря на lazy loading `AppProviders`, статические импорты где-то в цепочке зависимостей тянут Supabase/Query/Radix

**Решение:**
- ✅ Уже сделано: `AppProviders` lazy-loaded
- ✅ Уже сделано: `LanguageContext` использует динамический импорт Supabase
- ✅ Уже сделано: `referralService` использует динамический импорт Supabase
- ⚠️ **Нужно проверить:** Нет ли других статических импортов Supabase/Query/Radix в компонентах, которые грузятся на лендинге

### 2. Большой index.js (118 KB gzipped)

**Проблема:**
- `index.js` = 361 KB (118 KB gzipped) - это основной код приложения
- Включает `LanguageContext`, `AiStudioLanding`, `HelpCenter`, и другие компоненты

**Решение:**
- ✅ `LanguageContext` уже использует динамический импорт Supabase
- ⚠️ **Можно оптимизировать:** Разделить `index.js` на более мелкие chunks для лендинга

### 3. Отсутствие детальных метрик

**Проблема:**
- Не видно конкретных значений LCP, FCP, CLS, TBT, Speed Index
- Не видно раздела "Opportunities" (возможности оптимизации)
- Не видно раздела "Diagnostics" (диагностика проблем)

**Решение:**
- Нужно получить детальные метрики через Lighthouse CLI или расширенный отчет PSI

---

## 💡 Рекомендации по оптимизации

### Приоритет 1: Уменьшить vendor.js для лендинга

**Цель:** Убедиться, что Supabase/Query/Radix НЕ загружаются на лендинге

**Действия:**
1. ✅ Проверить `src/main.tsx` - нет статических импортов Supabase
2. ✅ Проверить `src/App.tsx` - `AppProviders` lazy-loaded
3. ✅ Проверить `src/contexts/LanguageContext.tsx` - динамический импорт
4. ✅ Проверить `src/components/Layout.tsx` - нет статических импортов
5. ⚠️ **Проверить:** `src/components/landing/AiStudioLanding.tsx` - нет ли статических импортов тяжелых зависимостей
6. ⚠️ **Проверить:** Все компоненты, которые импортируются в `Landing.tsx` статически

**Ожидаемый результат:**
- `vendor.js` должен уменьшиться до ~500-600 KB (150-200 KB gzipped)
- Performance score должен улучшиться до 80+

### Приоритет 2: Оптимизировать index.js

**Цель:** Разделить `index.js` на более мелкие chunks

**Действия:**
1. Сделать `AiStudioLanding` lazy-loaded (если он большой)
2. Сделать `HelpCenter` lazy-loaded (если он большой)
3. Проверить другие компоненты в `index.js`

**Ожидаемый результат:**
- `index.js` должен уменьшиться до ~200-250 KB (70-80 KB gzipped)

### Приоритет 3: Получить детальные метрики

**Действия:**
1. Запустить Lighthouse CLI для получения детальных метрик
2. Проанализировать разделы "Opportunities" и "Diagnostics"
3. Исправить конкретные проблемы из этих разделов

---

## 📋 Чеклист проверки утечек

### Компоненты лендинга (должны быть проверены)

- [x] `src/pages/Landing.tsx` - нет статических импортов Supabase
- [x] `src/components/landing/AiStudioLanding.tsx` - нужно проверить
- [x] `src/components/landing/PartnerInviteBanner.tsx` - нет статических импортов Supabase
- [ ] `src/components/landing/*` - проверить все компоненты лендинга
- [ ] `src/contexts/LanguageContext.tsx` - ✅ динамический импорт
- [ ] `src/services/referralService.ts` - ✅ динамический импорт

### Компоненты, которые НЕ должны грузиться на лендинге

- [x] `src/contexts/UserContext.tsx` - ✅ не импортируется на лендинге
- [x] `src/components/providers/AppProviders.tsx` - ✅ lazy-loaded
- [x] `src/components/Layout.tsx` - нужно проверить, используется ли на лендинге

---

## 🎯 Целевые метрики

| Метрика | Текущее | Цель | Приоритет |
|---------|---------|------|-----------|
| Performance Score | 71 | 80+ | 🔴 Высокий |
| vendor.js (gzipped) | 315 KB | <200 KB | 🔴 Высокий |
| index.js (gzipped) | 118 KB | <80 KB | 🟡 Средний |
| LCP | ? | <2.5s | 🔴 Высокий |
| FCP | ? | <1.8s | 🟡 Средний |
| CLS | ? | <0.1 | 🟡 Средний |
| TBT | ? | <200ms | 🟡 Средний |

---

## 📝 Следующие шаги

1. **Проверить утечки в компонентах лендинга**
   - Найти все статические импорты Supabase/Query/Radix
   - Заменить на динамические импорты или lazy loading

2. **Получить детальные метрики**
   - Запустить Lighthouse CLI
   - Проанализировать Opportunities и Diagnostics

3. **Оптимизировать index.js**
   - Разделить на более мелкие chunks
   - Lazy load некритичных компонентов

4. **Повторный анализ**
   - Запустить `npm run build:analyze`
   - Проверить размеры chunks
   - Задеплоить и проверить PSI снова

---

## 📚 Полезные ссылки

- [PageSpeed Insights Report](https://pagespeed.web.dev/analysis/https-skilyapp-com/6uuiqh1895?form_factor=mobile)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CLI](https://github.com/GoogleChrome/lighthouse#using-the-node-cli)
- [Vite Bundle Optimization](https://vitejs.dev/guide/build.html#chunking-strategy)
