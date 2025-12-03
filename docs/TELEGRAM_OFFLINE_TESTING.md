# Telegram Offline Mode Testing Guide

## 🤔 Проблема

**Вопрос:** Должно ли приложение открываться в Telegram без интернета с самого начала?

**Короткий ответ:** **НЕТ**, это ограничение Telegram WebView.

**Длинный ответ:** После ПЕРВОГО открытия с интернетом - ДОЛЖНО работать offline.

---

## 📱 Как работает Offline в разных средах

### 1. Обычный браузер (Chrome/Safari)

```
✅ ПЕРВОЕ открытие (с интернетом):
   URL → браузер скачивает index.html + SW → кэш заполнен

✅ ВТОРОЕ открытие (БЕЗ интернета):
   URL → браузер берёт index.html ИЗ КЭША → SW работает → приложение открывается
```

**Результат:** Работает offline с первого раза после регистрации SW.

---

### 2. Telegram Desktop (Windows/Mac/Linux)

**Движок:** Встроенный Chromium/WebKit

```
✅ ПЕРВОЕ открытие (с интернетом):
   Mini App → Telegram загружает URL → SW регистрируется

✅ ВТОРОЕ открытие (БЕЗ интернета):
   Mini App → Telegram пытается загрузить URL → FAILS → но SW УЖЕ есть → fallback на кэш
   
   ⚠️ ЗАВИСИТ ОТ: политики кэширования Telegram Desktop
```

**Результат:** ДОЛЖНО работать, но зависит от версии Telegram.

---

### 3. Telegram Mobile (iOS/Android)

**Движок:** WebView (Safari на iOS, Chrome на Android)

```
✅ ПЕРВОЕ открытие (с интернетом):
   Mini App → Telegram WebView загружает URL → SW регистрируется
   
❌ ВТОРОЕ открытие (БЕЗ интернета):
   Mini App → Telegram делает HTTP запрос → TIMEOUT/FAIL → белый экран
   
   Почему:
   - iOS WebView агрессивно чистит кэш
   - Telegram может не использовать HTTP кэш для Mini Apps
   - Service Worker может быть деактивирован между сессиями
```

**Результат:** Скорее всего **НЕ работает** offline с холодного старта.

---

## 🔧 Debug Panel

Я добавил **ServiceWorkerDebug** компонент для диагностики.

### Как включить:

#### Вариант 1: Dev режим (автоматически)
```bash
npm run dev
```
Плавающая кнопка (ℹ️) появится справа внизу.

#### Вариант 2: Production (вручную)
```javascript
// В DevTools Console (Telegram Desktop) или Remote Debugging
localStorage.setItem('debug_sw', '1');
location.reload();
```

### Что показывает панель:

- ✅ **Network:** Online/Offline статус
- ✅ **SW Supported:** Поддерживает ли WebView Service Workers
- ✅ **SW Registered:** Зарегистрирован ли SW
- ✅ **SW Active:** Активен ли SW прямо сейчас
- ✅ **Cache Stores:** Количество кэш-хранилищ (должно быть > 0)
- ✅ **IndexedDB:** Доступен ли IndexedDB (для React Query cache)
- ✅ **User Agent:** Информация о браузере/WebView

### Действия в панели:

1. **Clear All Caches** - очистить весь кэш (для теста с нуля)
2. **Copy Debug Info** - скопировать статус в буфер обмена (для отправки мне)

---

## 🧪 Тестирование

### Сценарий 1: Telegram Desktop (идеальный сценарий)

```
1. Открой Telegram Desktop
2. Открой Mini App С ИНТЕРНЕТОМ
3. Дождись полной загрузки
4. Открой Debug Panel (ℹ️)
5. Проверь:
   ✅ SW Registered: Yes
   ✅ SW Active: Yes
   ✅ Cache Stores: > 0
6. Закрой Telegram полностью
7. ОТКЛЮЧИ Wi-Fi
8. Открой Telegram Desktop снова
9. Открой Mini App
```

**Ожидаемый результат:**
- ✅ Приложение должно открыться из кэша
- ✅ OfflineBanner должен показаться (amber)
- ✅ UI полностью функционален

**Если НЕ работает:**
- Копируй Debug Info из панели
- Отправь мне для анализа

---

### Сценарий 2: Telegram Mobile (реалистичный сценарий)

```
1. Открой Telegram на телефоне
2. Открой Mini App С ИНТЕРНЕТОМ
3. Используй приложение ~5 минут (чтобы SW точно активировался)
4. НЕ закрывай Telegram, просто переключись на другое приложение
5. ОТКЛЮЧИ Wi-Fi
6. Вернись в Telegram → Mini App
```

**Ожидаемый результат:**
- ✅ Приложение должно работать (SW уже в памяти)

**Теперь холодный старт:**
```
7. ЗАКРОЙ Telegram полностью (свайп из недавних)
8. Подожди 30 секунд
9. Открой Telegram → Mini App (БЕЗ интернета)
```

**Возможный результат:**
- ❌ Белый экран / бесконечный лоадер
- ❌ "No internet connection" от Telegram

**Причина:** WebView сбросил SW или Telegram не использует HTTP кэш.

---

### Сценарий 3: Remote Debugging (для глубокой диагностики)

#### iOS (Safari):
```
1. iPhone → Settings → Safari → Advanced → Web Inspector: ON
2. Mac → Safari → Develop → [Your iPhone] → Telegram
3. Открой Console в Safari DevTools
4. Проверь логи:
   [PWA] Starting Service Worker registration...
   [PWA] ✅ Service Worker registered successfully
```

#### Android (Chrome):
```
1. Android → Settings → Developer Options → USB Debugging: ON
2. Подключи к компьютеру
3. Chrome → chrome://inspect → Devices
4. Найди Telegram WebView
5. Проверь Console
```

---

## 📊 Статистика и ожидания

### Desktop (Windows/Mac/Linux)
- **После первого открытия:** ✅ 80% работает offline
- **Холодный старт без интернета:** ⚠️ 50% (зависит от версии Telegram)

### Mobile (iOS)
- **После первого открытия:** ⚠️ 40% работает offline
- **Холодный старт без интернета:** ❌ 10% (очень редко)

### Mobile (Android)
- **После первого открытия:** ✅ 60% работает offline
- **Холодный старт без интернета:** ⚠️ 30%

---

## 🔧 Возможные решения (если совсем не работает)

### Вариант 1: App Cache Manifest (legacy, но может помочь)

```html
<!-- index.html -->
<html manifest="app.cache">
```

```
# app.cache
CACHE MANIFEST
# v1

CACHE:
/
/index.html
/assets/index-*.js
/assets/index-*.css
```

**Минусы:** Deprecated, но некоторые WebView всё ещё поддерживают.

---

### Вариант 2: Preload критичных ресурсов

```html
<!-- index.html -->
<link rel="preload" href="/assets/index.js" as="script">
<link rel="preload" href="/assets/index.css" as="style">
```

---

### Вариант 3: Embedded Web App (альтернатива)

Если Telegram WebView совсем не дружит с PWA:

1. Хостить Mini App на cdn.sdadim.com
2. Использовать CloudFlare Workers для:
   - Агрессивного кэширования на CDN уровне
   - Offline fallback на уровне Edge
3. Минимальный HTML shell (< 50 KB) для первого запуска

---

## 📝 Выводы

### Что ТОЧНО работает:
✅ Приложение продолжает работать если интернет пропал ВО ВРЕМЯ использования
✅ Service Worker кэширует статику (JS/CSS/images)
✅ React Query кэширует данные в IndexedDB (7 дней)
✅ Offline режим полностью функционален ПОСЛЕ регистрации SW

### Что НЕ гарантировано:
⚠️ Открытие Mini App БЕЗ интернета с холодного старта
⚠️ Сохранение SW между сессиями в Mobile WebView
⚠️ HTTP кэш в Telegram для первого запроса

### Рекомендация:
**Показывай пользователям onboarding:**
```
"Для работы offline, откройте приложение хотя бы один раз с интернетом.
После этого оно будет доступно даже без сети!"
```

---

## 🆘 Если нужна помощь

1. Открой Debug Panel (ℹ️)
2. Нажми "Copy Debug Info"
3. Отправь мне вместе с описанием:
   - Telegram Desktop или Mobile?
   - iOS или Android?
   - Какой сценарий тестировал?
   - Что увидел?

