# 🧹 Как очистить Service Worker и кэш

Если у тебя возникают проблемы с устаревшим кодом (например, ошибки `ERR_CONNECTION_REFUSED` к `127.0.0.1:7242`), нужно очистить Service Worker и кэш браузера.

## 📋 Способы очистки

### 1. Через DevTools (Chrome/Edge/Brave)

1. Открой DevTools (`F12` или `Cmd+Option+I` на Mac)
2. Перейди на вкладку **Application** (или **Приложение**)
3. В левом меню найди раздел **Service Workers**
4. Найди зарегистрированный Service Worker (обычно `pwa-sw.js`)
5. Нажми кнопку **Unregister** (или **Отменить регистрацию**)
6. Перейди в раздел **Cache Storage**
7. Удали все кэши (правый клик → **Delete**)
8. Перезагрузи страницу (`Ctrl+Shift+R` или `Cmd+Shift+R` для жесткой перезагрузки)

### 2. Через DevTools (Firefox)

1. Открой DevTools (`F12`)
2. Перейди на вкладку **Application** (или **Приложение**)
3. В левом меню найди раздел **Service Workers**
4. Нажми **Unregister** для каждого Service Worker
5. Перейди в раздел **Cache Storage** и удали все кэши
6. Перезагрузи страницу

### 3. Через настройки приложения (встроенная кнопка)

1. Открой страницу **Настройки** в приложении
2. Найди раздел **Разработка** (или **Developer Tools**)
3. Нажми кнопку **Очистить Service Worker и кэш**
4. Подтверди действие
5. Страница перезагрузится автоматически

### 4. Программно (через консоль браузера)

Открой консоль браузера (`F12` → Console) и выполни:

```javascript
// Удалить все Service Workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('Service Workers удалены');
});

// Очистить все кэши
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
  console.log('Кэши очищены');
});

// Перезагрузить страницу
location.reload();
```

### 5. Полная очистка через настройки браузера

#### Chrome/Edge/Brave:
1. `Ctrl+Shift+Delete` (или `Cmd+Shift+Delete` на Mac)
2. Выбери **За все время** (All time)
3. Отметь **Кэшированные изображения и файлы** (Cached images and files)
4. Нажми **Очистить данные** (Clear data)

#### Firefox:
1. `Ctrl+Shift+Delete` (или `Cmd+Shift+Delete` на Mac)
2. Выбери **Все** (Everything)
3. Отметь **Кэш** (Cache)
4. Нажми **Очистить сейчас** (Clear Now)

## 🔍 Проверка после очистки

После очистки проверь:

1. Открой DevTools → **Application** → **Service Workers**
2. Убедись, что нет зарегистрированных Service Workers
3. Проверь консоль на наличие ошибок `ERR_CONNECTION_REFUSED`
4. Если ошибки остались, возможно они из других источников (Rollbar, другие аналитические библиотеки)

## ⚠️ Важно

- После очистки Service Worker приложение будет работать без offline-кэша до следующей регистрации
- При следующем открытии приложения Service Worker зарегистрируется заново с актуальным кодом
- Если проблемы остаются, попробуй открыть приложение в режиме инкогнито (там нет кэша)

## 🛠️ Для разработчиков

Если нужно программно очистить Service Worker из кода:

```typescript
import { clearServiceWorkerAndCache } from '@/utils/clearServiceWorker';

// Очистить все
await clearServiceWorkerAndCache();

// Или по отдельности
import { unregisterServiceWorkers, clearAllCaches } from '@/utils/clearServiceWorker';
await unregisterServiceWorkers();
await clearAllCaches();
```

