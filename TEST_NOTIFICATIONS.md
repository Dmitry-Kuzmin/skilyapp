# Тестирование системы уведомлений

## Шаги для проверки уведомлений:

### 1. Применить миграцию RLS
```sql
-- Выполнить в Supabase SQL Editor
-- Файл: supabase/migrations/20251104000001_fix_notification_rls_final.sql
```

### 2. Проверить логи в консоли браузера

**Клиентская сторона:**
- `[useNotifications] ✅ Setting up notifications for profileId:` - инициализация
- `[useNotifications] Creating Realtime channel for profileId:` - создание канала
- `[Notifications] ✅ Successfully subscribed to notifications` - успешная подписка
- `[Notifications] ✅ New notification received via Realtime:` - получение уведомления

**Если не подписывается:**
- `[Notifications] ❌ Channel error` - проблема с RLS политикой
- `[Notifications] ❌ Subscription timed out` - проблема с подключением

### 3. Проверить логи Edge Function

**В Supabase Dashboard → Edge Functions → duel-manager → Logs:**
- `[create_notification] Creating notification for duel:` - создание уведомления
- `[create_notification] ✅ Notification created successfully:` - успешное создание
- `[create_notification] 📤 Notification ready for Realtime delivery:` - готово к доставке

**При отправке ответа:**
- `[submit_answer] Creating progress notification for opponent`
- `[submit_answer] ✅ Progress notification created successfully`

### 4. Проверить базу данных

```sql
-- Проверить, что уведомления создаются
SELECT * FROM duel_notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Проверить, что таблица в Realtime publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'duel_notifications';
```

### 5. Возможные проблемы:

1. **RLS политика блокирует чтение:**
   - Проверить миграцию `20251104000001_fix_notification_rls_final.sql`
   - Убедиться, что политика применена

2. **Realtime не включен для таблицы:**
   - Выполнить: `ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;`

3. **Уведомления не создаются:**
   - Проверить логи Edge Function
   - Проверить, что `opponentId` найден правильно

4. **Подписка не работает:**
   - Проверить, что `profileId` правильный
   - Проверить, что RLS политика разрешает SELECT
