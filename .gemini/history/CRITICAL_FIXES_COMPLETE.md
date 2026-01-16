# Критические исправления - Полное решение

## ✅ Мина №1: Service Worker и Access Token - РЕШЕНО

### Проблема
Service Worker не имеет доступа к localStorage, где Supabase хранит токен. Токен может протухнуть пока приложение закрыто.

### Решение

**1. Дублирование токена в IndexedDB** (`src/utils/authTokenStorage.ts`):
- Токен сохраняется в IndexedDB при каждом обновлении
- Service Worker имеет доступ к IndexedDB
- Автоматическое сохранение при `onAuthStateChange`

**2. Обработка протухшего токена**:
- При 401 ошибке - событие НЕ удаляется
- Событие откладывается до открытия приложения
- Когда приложение откроется - токен обновится и события отправятся

**3. Безопасная стратегия**:
- Если токен протух в SW - откладываем отправку
- Когда приложение откроется - токен обновится автоматически
- События отправятся при следующем открытии

### Реализация

**Сохранение токена** (`src/contexts/UserContext.tsx`):
```typescript
supabase.auth.onAuthStateChange(async (event, newSession) => {
  if (newSession?.access_token) {
    const { saveAuthToken } = await import('@/utils/authTokenStorage');
    await saveAuthToken(newSession.access_token, expiresIn);
  }
});
```

**Обработка 401** (`src/utils/analyticsQueue.ts`):
```typescript
if (error.message === 'TOKEN_EXPIRED') {
  // НЕ удаляем событие, откладываем до открытия приложения
  return Promise.resolve();
}
```

---

## ✅ Мина №2: Дедупликация (Идемпотентность) - РЕШЕНО

### Проблема
При обрыве связи может быть отправлен дубль события. Нужна проверка на сервере.

### Решение

**1. Уникальный event_id на клиенте**:
- ✅ Уже генерируется: `event.id = ${Date.now()}-${Math.random()...}`
- ✅ Отправляется на сервер: `event_id: event.id`

**2. Дедупликация на сервере**:
- ✅ Создана таблица `analytics_events_log` с уникальным `event_id`
- ✅ Проверка перед обработкой: если `event_id` уже есть - пропускаем
- ✅ Идемпотентность: повторная отправка безопасна

**3. Миграция**:
- `supabase/migrations/20250120000000_create_analytics_events_table.sql`
- Таблица с уникальным индексом на `event_id`

### Реализация

**Клиент** (`src/utils/analyticsQueue.ts`):
```typescript
body: {
  event_id: event.id, // Уникальный ID для дедупликации
  user_id: event.user_id,
  event_type: event.event_type,
  ...
}
```

**Сервер** (`supabase/functions/user-event-dispatcher/index.ts`):
```typescript
// Проверка дубликата
const { data: existingEvent } = await supabase
  .from('analytics_events_log')
  .select('id, processed')
  .eq('event_id', event_id)
  .maybeSingle();

if (existingEvent?.processed) {
  return { success: true, skipped: true, reason: 'already_processed' };
}
```

---

## ✅ Мина №3: iOS beforeunload - РЕШЕНО

### Проблема
Apple не рекомендует `beforeunload` для iOS. Нужно использовать `pagehide`.

### Решение

**Заменили `beforeunload` на `pagehide`**:
- ✅ Используется `pagehide` с проверкой `persisted`
- ✅ `persisted = false` → страница закрывается → отправляем критичные события
- ✅ `persisted = true` → страница в кэше → не отправляем

### Реализация

```typescript
document.addEventListener('pagehide', (event) => {
  if (!event.persisted && isOnline()) {
    // Страница закрывается - отправляем только HIGH приоритет события
    sendCriticalEventsOnly();
  }
});
```

---

## ✅ Защита HIGH приоритета - ПРОВЕРЕНО

### Статус
✅ **Уже реализовано и работает правильно**

**Проверка**:
- HIGH события НИКОГДА не удаляются при переполнении очереди
- LOW события удаляются первыми
- MEDIUM удаляются только если нет LOW

**Код** (`src/utils/analyticsQueue.ts`):
```typescript
if (event.priority === 'high') {
  console.warn(`Queue full, but protecting high priority event`);
  continue; // НЕ удаляем
}
```

---

## 📋 Итоговая таблица исправлений

| Проблема | Статус | Решение |
|----------|--------|---------|
| 1. SW и Access Token | ✅ Решено | Токен в IndexedDB + отложить при 401 |
| 2. Дедупликация | ✅ Решено | Таблица + проверка event_id |
| 3. iOS beforeunload | ✅ Решено | Заменено на pagehide |
| 4. HIGH приоритет | ✅ Проверено | Защита работает |

---

## 🚀 Что сделано

1. ✅ **Токен в IndexedDB**: `src/utils/authTokenStorage.ts`
2. ✅ **Автосохранение токена**: `src/contexts/UserContext.tsx`
3. ✅ **Обработка 401**: Отложить до открытия приложения
4. ✅ **Дедупликация**: Таблица + проверка на сервере
5. ✅ **iOS pagehide**: Заменено на надежный вариант
6. ✅ **Разные retry**: 400 не ретраим, 500 ретраим
7. ✅ **HIGH защита**: Проверено, работает

---

**Все критические проблемы решены!** ✅

