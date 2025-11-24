# ✅ Проверка системы уведомлений после применения миграций

## 📋 Что было сделано:

1. ✅ **Миграции применены:**
   - Добавлен тип 'reminder' для уведомлений
   - Исправлена RLS политика для realtime подписки
   - Включен realtime для таблицы `duel_notifications`

2. ✅ **Edge Functions обновлены:**
   - Функция `createNotification` с шаблонами уведомлений
   - Логирование всех шагов создания уведомлений
   - Создание уведомлений при событиях дуэли

3. ✅ **Клиент обновлен:**
   - Хук `useNotifications` с realtime подпиской
   - Компонент `NotificationsPanel` с фильтрами
   - Логирование для отладки

## 🧪 Как протестировать:

### 1. Проверьте консоль браузера

Откройте консоль (F12) и проверьте наличие логов:

```
[useNotifications] Setting up notifications for profileId: ...
[Notifications] Realtime subscription status: SUBSCRIBED
[Notifications] ✅ Successfully subscribed to notifications
```

### 2. Создайте дуэль и присоединитесь

1. Создайте дуэль (один пользователь)
2. Присоединитесь к дуэли (другой пользователь)
3. **Ожидаемое:** Уведомление "🔥 [Имя] принял твой вызов!" должно появиться

### 3. Ответьте на вопросы

1. Один игрок отвечает на вопрос
2. **Ожидаемое:** Другой игрок получает уведомление о прогрессе

### 4. Проверьте логи сервера

Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions/duel-manager/logs

Проверьте наличие:
```
[submit_answer] Creating progress notification for opponent
[create_notification] Creating notification for duel: ...
[create_notification] Opponent found: ...
[create_notification] Notification created successfully: ...
```

### 5. Проверьте базу данных

Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/editor/duel_notifications

Проверьте, что записи создаются при событиях дуэли.

## 🔍 Что проверять:

### ✅ Если уведомления работают:

1. В консоли браузера видны логи:
   - `[Notifications] New notification received: ...`
   - `[Notifications] Notification details: ...`

2. Появляются toast уведомления при событиях дуэли

3. В панели уведомлений (иконка колокольчика) отображаются уведомления

4. В логах сервера видны сообщения о создании уведомлений

### ❌ Если уведомления не работают:

1. **Нет логов в консоли браузера:**
   - Проверьте, что `profileId` определен
   - Проверьте, что `useNotifications` вызывается

2. **Нет логов на сервере:**
   - Проверьте, что Edge Function `duel-manager` обновлена
   - Проверьте, что функция `createNotification` вызывается

3. **Уведомления создаются, но не доставляются:**
   - Проверьте RLS политики
   - Проверьте realtime подписку

## 📝 Следующие шаги:

1. Протестируйте систему уведомлений
2. Проверьте логи в консоли браузера и на сервере
3. Если что-то не работает, сообщите - помогу исправить

