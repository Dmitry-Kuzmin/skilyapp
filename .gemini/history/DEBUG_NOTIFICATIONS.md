# 🐛 ОТЛАДКА: Уведомления не отображаются

**Проблема:** Уведомления перестали отображаться в панели

---

## 🔍 ЧТО ПРОВЕРИТЬ:

### 1. Открой консоль браузера (F12)

Ищи логи:
```
[NotificationsPanel] Component mounted, profileId: ...
[NotificationsPanel] Notifications: X Unread: Y
[NotificationsPanel] Total notifications: X
[NotificationsPanel] Notification types: [...]
[NotificationsPanel] After filtering progress: X
[NotificationsPanel] Filter: all
[NotificationsPanel] After filter category: X
```

### 2. Проверь, что показывают логи:

#### Если `Total notifications: 0`:
- Уведомления не загружаются из базы
- Проверь `useNotifications` хук
- Проверь, что `profileId` правильный

#### Если `Total notifications: X`, но `After filtering progress: 0`:
- Все уведомления имеют тип из `PROGRESS_NOTIFICATION_TYPES`
- Типы: `['start', 'progress', 'boost', 'opponent_ahead', 'opponent_behind', 'reminder']`
- **Решение:** Нужно создать уведомления типа `finish` или `timeout`

#### Если `After filtering progress: X`, но `After filter category: 0`:
- Фильтр по категориям скрывает все уведомления
- Проверь, какой фильтр активен (`all`, `duels`, `reminders`, `system`)

---

## 🛠️ ВРЕМЕННОЕ РЕШЕНИЕ (для теста):

Если нужно быстро увидеть все уведомления, можно временно отключить фильтрацию:

```typescript
// В NotificationsPanel.tsx, строка 215:
const filteredNotifications = useMemo(() => {
  // ВРЕМЕННО: показываем все уведомления для отладки
  return notifications; // ← Вместо фильтрации
  
  // Оригинальный код:
  // const notificationsWithoutProgress = notifications.filter(n => !PROGRESS_NOTIFICATION_TYPES.includes(n.type));
  // ...
}, [notifications, filter]);
```

**⚠️ ВАЖНО:** Это только для отладки! После проверки верни фильтрацию.

---

## 📊 ЧТО ДОЛЖНО БЫТЬ В КОНСОЛИ:

### Хороший результат:
```
[NotificationsPanel] Component mounted, profileId: 532aae3f-...
[NotificationsPanel] Notifications: 5 Unread: 2
[NotificationsPanel] Total notifications: 5
[NotificationsPanel] Notification types: ['finish', 'timeout', 'finish', 'finish', 'timeout']
[NotificationsPanel] After filtering progress: 5
[NotificationsPanel] Filter: all
[NotificationsPanel] After filter category: 5
```

### Плохой результат (все скрыто):
```
[NotificationsPanel] Total notifications: 5
[NotificationsPanel] Notification types: ['start', 'progress', 'boost', 'start', 'progress']
[NotificationsPanel] After filtering progress: 0  ← ВСЕ СКРЫТО!
```

---

## 🎯 РЕШЕНИЕ:

### Если все уведомления типа `start`, `progress`, `boost`:
1. Создай тестовые уведомления типа `finish` или `timeout`
2. Или временно отключи фильтрацию (см. выше)

### Если уведомления не загружаются:
1. Проверь, что `profileId` правильный
2. Проверь, что `useNotifications` хук работает
3. Проверь консоль на ошибки

---

## 📝 SQL для создания тестовых уведомлений:

```sql
-- Создай уведомления типа 'finish' (они будут видны)
INSERT INTO duel_notifications (user_id, type, title, message, icon, created_at)
SELECT 
  '532aae3f-0282-469a-be1c-a073ef6c870b'::uuid,  -- Замени на свой profileId
  'finish',
  'Тестовое уведомление ' || generate_series,
  'Это тестовое уведомление типа finish - оно будет видно в панели.',
  'trophy',
  NOW() - (generate_series || ' minutes')::interval
FROM generate_series(1, 5);
```

---

**Открой консоль (F12) и пришли логи! Это поможет понять, в чем проблема.** 🔍

