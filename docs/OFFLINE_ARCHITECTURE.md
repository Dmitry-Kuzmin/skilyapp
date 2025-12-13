# Offline-First Architecture

## 📋 Общая концепция

Приложение использует **двухуровневое кэширование** для максимальной производительности и offline-режима:

1. **Service Worker (Workbox)** - кэширует статические ресурсы
2. **React Query + IndexedDB** - кэширует данные API

**КРИТИЧНО:** Эти два слоя **НЕ пересекаются**, чтобы избежать конфликтов и устаревших данных.

---

## 🔧 Service Worker (Workbox)

### Ответственность: ТОЛЬКО статика

- ✅ JS/CSS/HTML (app shell)
- ✅ Images (Supabase Storage `/storage/v1/object/public/...`, локальные)
- ✅ Fonts (`.woff`, `.woff2`, `.ttf`, `.eot`, `.otf`)
- ❌ **НЕ** кэширует Supabase REST API (`/rest/v1/...`)
- ❌ **НЕ** кэширует Supabase Functions (`/functions/v1/...`)

### Стратегии кэширования

| Тип ресурса | Стратегия | TTL | Причина |
|-------------|-----------|-----|---------|
| **Navigation** (app shell) | `NetworkFirst` (3s timeout) | 7 дней | Обновления shell, но офлайн fallback |
| **JS/CSS** | `CacheFirst` | 30 дней | Скорость загрузки, версионирование через hash |
| **Supabase Storage** (images) | `CacheFirst` | 30 дней | Экономия трафика, обновление через URL версионирование |
| **Fonts** | `CacheFirst` | 1 год | Редко меняются |
| **Images** (локальные) | `CacheFirst` | 30 дней | Экономия трафика |

### Precaching

- **117 файлов** (~5.7 МБ) кэшируются при первом запуске
- Максимальный размер файла: **10 МБ** (для vendor chunks)
- Автоматическое обновление при новом деплое (`autoUpdate`)

---

## 💾 React Query + IndexedDB

### Ответственность: ВСЕ данные API

- ✅ Supabase REST API (`/rest/v1/...`)
- ✅ Supabase Functions (`/functions/v1/...`)
- ✅ RPC calls
- ✅ Auth состояние (через UserContext)

### Настройки кэша

```typescript
{
  staleTime: 5 * 60 * 1000,        // 5 минут
  gcTime: 7 * 24 * 60 * 60 * 1000, // 7 дней
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: true,
}
```

### Хранилище

- **IndexedDB** через `idb-keyval`
- Ключ: `SDADIM_REACT_QUERY_OFFLINE_CACHE`
- Максимальный возраст кэша: **7 дней**
- **Graceful fallback:** если IndexedDB недоступен (iOS WebView) - работаем в memory-only режиме

---

## 🚀 Первый запуск

### С интернетом ✅

1. Service Worker регистрируется
2. 117 файлов precache загружаются
3. React Query начинает кэшировать API ответы
4. Приложение готово к работе offline

### Без интернета ❌

1. Детектируется отсутствие кэша + `navigator.onLine === false`
2. Показывается экран:
   - "Welcome to Sdadim"
   - "Please connect to the internet for the first launch"
   - Кнопка "Retry"

---

## 📱 Offline-режим (после первого запуска)

### Что работает

- ✅ UI полностью функционален
- ✅ Навигация между страницами
- ✅ Все кэшированные данные (до 7 дней)
- ✅ Изображения из Supabase Storage
- ✅ OfflineBanner показывает статус

### Что не работает

- ❌ Новые данные с сервера
- ❌ Мутации (создание/обновление/удаление)
- ❌ Auth (если токен истёк)

### Восстановление соединения

- React Query автоматически:
  - Обновляет все stale данные
  - Выполняет отложенные мутации (если настроено)
- OfflineBanner показывает "Connected" (3 секунды)

---

## 🐛 Отладка

### Проверка Service Worker

```javascript
// В DevTools Console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW active:', reg?.active);
  console.log('SW scope:', reg?.scope);
});
```

### Проверка кэша

```javascript
// В DevTools Console
caches.keys().then(keys => console.log('Cache keys:', keys));

// Проверка IndexedDB
import('idb-keyval').then(({ get }) => {
  get('SDADIM_REACT_QUERY_OFFLINE_CACHE').then(cache => {
    console.log('React Query cache:', cache);
  });
});
```

### Логи

Service Worker регистрация:
```
[PWA] Starting Service Worker registration...
[PWA] ✅ Service Worker registered successfully
[PWA] ✅ App ready to work offline!
```

React Query persistence:
```
[Persister] ✅ Cache restored from IndexedDB
[Persister] ✅ Cache saved to IndexedDB
```

---

## ⚠️ Важные замечания

### 1. Не кэшировать API в Service Worker

**Плохо:**
```javascript
// ❌ Двойной кэш - конфликты!
{
  urlPattern: /supabase\.co\/rest/,
  handler: 'NetworkFirst',
  options: { cacheName: 'api' }
}
```

**Хорошо:**
```javascript
// ✅ Только React Query управляет API
// Service Worker не трогает /rest/ и /functions/
```

### 2. Версионирование изображений

Если нужно форсировать обновление изображения:

```typescript
// Добавить версию к URL
const imageUrl = `${baseUrl}?v=${Date.now()}`;
```

### 3. Очистка кэша

При критических багах:

```javascript
// Очистить Service Worker cache
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});

// Очистить React Query cache
import('idb-keyval').then(({ del }) => {
  del('SDADIM_REACT_QUERY_OFFLINE_CACHE');
});

// Перезагрузить
window.location.reload();
```

---

## 📊 Метрики

### Размеры кэша

- **Service Worker:** ~5.7 МБ (117 файлов)
- **React Query:** зависит от использования (~1-3 МБ обычно)
- **Итого:** ~7-9 МБ для полного offline режима

### Производительность

- **First Load (online):** ~2-3 секунды
- **Repeat Load (cache):** ~500-800 мс
- **Offline Load:** ~500-800 мс (только кэш)

---

## 🔄 Обновление архитектуры

### Добавление нового типа ресурсов

1. Определить тип: статика или данные
2. Если статика → добавить в `vite.config.ts` (Workbox)
3. Если данные → React Query автоматически справится

### Изменение TTL

В `vite.config.ts`:
```typescript
expiration: {
  maxEntries: 300,
  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
}
```

---

## 📚 Ссылки

- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [React Query Persistence](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
- [IndexedDB (idb-keyval)](https://github.com/jakearchibald/idb-keyval)




























