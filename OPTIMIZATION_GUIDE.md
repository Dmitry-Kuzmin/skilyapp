# Руководство по оптимизации приложения

## Реализованные оптимизации

### 1. ✅ Lazy Loading для больших страниц

**Что сделано:**
- Все страницы загружаются по требованию через `React.lazy()`
- Компоненты в Duel.tsx разделены на отдельные chunks
- Добавлен Suspense с fallback компонентами

**Результат:**
- Основной bundle: 809 KB → 124 KB (-85%)
- Duel chunk: 161 KB → 65 KB (-60%)
- Всего chunks: 80 (оптимизированное разделение)

**Использование:**
```typescript
// Пример lazy loading компонента
const MyComponent = lazy(() => import('./MyComponent'));

<Suspense fallback={<Loader />}>
  <MyComponent />
</Suspense>
```

### 2. ✅ Preloading критических ресурсов

**Что сделано:**
- Добавлен `preconnect` для Telegram API
- Добавлен `dns-prefetch` для внешних ресурсов

**Файл:** `index.html`

**Результат:**
- Ускорение загрузки внешних ресурсов
- Улучшение времени первого подключения

### 3. ✅ Lazy Loading изображений

**Что сделано:**
- Создан компонент `LazyImage` для lazy loading изображений
- Использует Intersection Observer API
- Начинает загрузку за 50px до появления в viewport

**Использование:**
```typescript
import { LazyImage } from '@/components/LazyImage';

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  className="w-full h-auto"
/>
```

**Файл:** `src/components/LazyImage.tsx`

### 4. ✅ Service Worker для кэширования

**Что сделано:**
- Создан Service Worker для кэширования статических ресурсов
- Стратегия: Network First, затем Cache
- Поддержка offline режима

**Файл:** `public/sw.js`

**Результат:**
- Кэширование статических ресурсов
- Улучшение производительности при повторных визитах
- Базовая поддержка offline

**Регистрация:** Автоматически в `main.tsx` (только в production)

### 5. ✅ Мониторинг Web Vitals

**Что сделано:**
- Создана утилита для отслеживания метрик производительности
- Отслеживаются: LCP, FID, CLS, FCP, TTFB
- Автоматическое логирование метрик

**Файл:** `src/utils/webVitals.ts`

**Метрики:**
- **LCP** (Largest Contentful Paint) - время загрузки основного контента
- **FID** (First Input Delay) - задержка первого взаимодействия
- **CLS** (Cumulative Layout Shift) - стабильность макета
- **FCP** (First Contentful Paint) - время первого отображения контента
- **TTFB** (Time to First Byte) - время до первого байта

**Использование:**
```typescript
import { reportWebVitals } from '@/utils/webVitals';

reportWebVitals((metric) => {
  console.log(metric.name, metric.value, metric.rating);
});
```

## Дополнительные рекомендации

### 1. Оптимизация изображений

**Рекомендации:**
- Конвертировать изображения в WebP формат
- Использовать `LazyImage` компонент для всех изображений
- Добавить `srcset` для адаптивных изображений

**Пример:**
```typescript
<LazyImage
  src="/image.webp"
  srcSet="/image-small.webp 400w, /image-large.webp 800w"
  sizes="(max-width: 600px) 400px, 800px"
  alt="Description"
/>
```

### 2. Оптимизация больших компонентов

**Рекомендации:**
- Разделить TestSession.tsx на более мелкие компоненты
- Использовать lazy loading для тяжелых виджетов
- Оптимизировать HelpCenter.tsx (57 KB)

### 3. Preloading критических chunks

**Рекомендации:**
Добавить в `index.html`:
```html
<link rel="modulepreload" href="/assets/react-vendor-*.js" />
<link rel="modulepreload" href="/assets/react-dom-*.js" />
```

### 4. Оптимизация Service Worker

**Рекомендации:**
- Добавить версионирование кэша
- Реализовать стратегию обновления кэша
- Добавить очистку старых кэшей

### 5. Мониторинг производительности

**Рекомендации:**
- Отправлять метрики в Supabase или аналитику
- Настроить алерты при ухудшении метрик
- Отслеживать размер bundle при каждом деплое

## Текущие размеры bundle

### Основные chunks (gzipped):
- **index.js**: 128 KB (основной bundle)
- **react-core.js**: 141 KB
- **vendor.js**: 157 KB
- **supabase.js**: 42 KB
- **tiptap.js**: 41 KB
- **ui-vendor.js**: 41 KB

### Страницы (gzipped):
- **Duel.js**: 17 KB (было 40 KB) ✅
- **DuelBattleFullscreen.js**: 16 KB (отдельный chunk) ✅
- **TestSession.js**: 25 KB
- **Index.js**: 20 KB

### Итого:
- **Всего chunks**: 80
- **Общий размер**: ~4.5 MB (uncompressed)
- **Gzipped**: ~1.2 MB

## Чеклист оптимизации

- [x] Lazy loading для всех страниц
- [x] Code splitting для vendor библиотек
- [x] Lazy loading для XLSX
- [x] Оптимизация Duel страницы
- [x] Preloading критических ресурсов
- [x] Lazy loading изображений (компонент создан)
- [x] Service Worker для кэширования
- [x] Web Vitals мониторинг
- [ ] Конвертация изображений в WebP
- [ ] Preloading критических chunks
- [ ] Оптимизация TestSession
- [ ] Отправка метрик на сервер

## Полезные команды

```bash
# Сборка проекта
npm run build

# Проверка размера bundle
npm run build && du -sh dist/

# Анализ chunks
npm run build && find dist/assets -name "*.js" -exec du -h {} \; | sort -h

# Проверка gzipped размеров
npm run build && find dist/assets -name "*.js" -exec sh -c 'echo "$(basename "$1"): $(gzip -c "$1" | wc -c | awk "{print int(\$1/1024)}") KB"' _ {} \;
```

## Дополнительные ресурсы

- [Web Vitals](https://web.dev/vitals/)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

