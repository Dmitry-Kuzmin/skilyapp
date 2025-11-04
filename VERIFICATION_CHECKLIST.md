# ✅ Чеклист проверки системы уведомлений

## 🎯 Edge Function задеплоена ✅

Edge Function `duel-manager` успешно задеплоена и работает без ошибок.

## 📋 Что нужно проверить дальше:

### 1. Проверьте создание уведомлений в базе данных

**Откройте:** https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/editor/duel_notifications

**Проверьте:**
- Создаются ли записи при событиях дуэли?
- Правильно ли заполнены поля (`user_id`, `duel_id`, `type`, `title`, `message`, `icon`)?

### 2. Проверьте консоль браузера

**Откройте консоль (F12)** и проверьте наличие логов:

✅ **Должны быть видны:**
```
[useNotifications] Setting up notifications for profileId: ...
[Notifications] Realtime subscription status: SUBSCRIBED
[Notifications] ✅ Successfully subscribed to notifications
```

❌ **Если НЕТ этих логов:**
- Проверьте, что `profileId` определен в `UserContext`
- Проверьте, что компонент `NotificationsPanel` монтируется

### 3. Протестируйте создание дуэли

**Шаги:**
1. Создайте дуэль (один пользователь)
2. Присоединитесь к дуэли (другой пользователь)

**Ожидаемое:**
- У первого игрока должно появиться уведомление: "🔥 [Имя] принял твой вызов!"
- Уведомление должно появиться в консоли: `[Notifications] New notification received: ...`
- Toast уведомление должно появиться на экране

### 4. Протестируйте ответы на вопросы

**Шаги:**
1. Один игрок отвечает на вопрос
2. Проверьте, что другой игрок получает уведомление

**Ожидаемое:**
- Уведомление типа 'progress' должно быть создано
- Уведомление должно появиться в консоли
- Toast уведомление должно появиться на экране

### 5. Проверьте панель уведомлений

**Шаги:**
1. Нажмите на иконку колокольчика 🔔 в верхнем правом углу
2. Проверьте, что уведомления отображаются в панели

**Ожидаемое:**
- Уведомления должны быть видны в панели
- Должны быть фильтры (Все / Дуэли / Напоминания / Системные)
- Непрочитанные уведомления должны быть подсвечены

## 🔍 Если уведомления не работают:

### Проблема: Нет логов в консоли браузера

**Решение:**
1. Проверьте, что `profileId` определен:
   - Откройте консоль и проверьте: `[UserContext] Loaded profile ID for ...`
2. Проверьте, что компонент `NotificationsPanel` монтируется
3. Проверьте, что нет ошибок в консоли

### Проблема: Уведомления создаются, но не доставляются

**Решение:**
1. Проверьте RLS политики:
   - Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/database/policies
   - Проверьте политику "Users can view their own notifications"
2. Проверьте realtime подписку:
   - В консоли должно быть: `[Notifications] Realtime subscription status: SUBSCRIBED`
   - Если статус не `SUBSCRIBED`, проверьте RLS политики

### Проблема: Уведомления создаются, но не отображаются в UI

**Решение:**
1. Проверьте, что `useNotifications` вызывается в `NotificationsPanel`
2. Проверьте, что `notifications` и `unreadCount` обновляются
3. Проверьте, что нет ошибок в консоли

## 📊 Логи для проверки:

### На сервере (Supabase Dashboard):
```
[submit_answer] Creating progress notification for opponent
[create_notification] Creating notification for duel: ...
[create_notification] Opponent found: ...
[create_notification] Notification created successfully: ...
```

### В консоли браузера:
```
[useNotifications] Setting up notifications for profileId: ...
[Notifications] Realtime subscription status: SUBSCRIBED
[Notifications] ✅ Successfully subscribed to notifications
[Notifications] New notification received: ...
[Notifications] Notification details: ...
```

## ✅ Если всё работает:

1. ✅ Уведомления создаются в базе данных
2. ✅ Realtime подписка работает
3. ✅ Уведомления доставляются в реальном времени
4. ✅ Toast уведомления появляются на экране
5. ✅ Уведомления отображаются в панели уведомлений

Поздравляю! 🎉 Система уведомлений работает!


