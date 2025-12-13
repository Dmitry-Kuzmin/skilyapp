# 🎯 Что выбрать в Auth Hooks?

## ⚠️ Важное открытие

Из доступных Auth Hooks в Supabase **нет прямого hook для отслеживания изменений пароля/email**.

### Доступные Hooks (из скриншота):

1. **Send SMS hook** - для кастомизации отправки SMS
2. **Send Email hook** - для кастомизации отправки email
3. **Customize Access Token (JWT) Claims hook** - для добавления claims в JWT
4. **Before User Created hook** - вызывается ПЕРЕД созданием пользователя
5. **MFA Verification Attempt hook** - требует Team/Enterprise план
6. **Password Verification Attempt hook** - требует Team/Enterprise план

**Проблема:** Нет hook для `user.updated` или `password_changed` событий.

---

## ✅ Рекомендация: НЕ настраивать Auth Hooks

### Почему?

1. **Доступные hooks не подходят** для нашей задачи
2. **Вызовы из кода уже работают** через `useAuthEventListener`
3. **Это более гибко** и не зависит от ограничений Supabase

### Что уже работает:

✅ **useAuthEventListener** автоматически слушает Auth события:
- `PASSWORD_RECOVERY`
- `SIGNED_OUT`
- `TOKEN_REFRESHED`

✅ **sendAuthEvent()** можно вызывать вручную:
```typescript
// После смены пароля
await sendAuthEvent('password_changed', user.id);

// После смены email
await sendAuthEvent('email_changed', user.id, {
  old_value: oldEmail,
  new_value: newEmail,
});
```

---

## 🔄 Альтернатива: Database Webhooks

Если очень нужна полная автоматизация, можно использовать **Database Webhooks** на таблице `auth.users`:

1. **Откройте:** Dashboard → Database → Webhooks
2. **Создайте Webhook:**
   - **Table:** `auth.users`
   - **Events:** `UPDATE`
   - **Type:** `HTTP Request`
   - **URL:** `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/auth-event-handler`
   - **HTTP Method:** `POST`

**Но:** Database Webhooks на `auth.users` также могут быть ограничены.

---

## 🎯 Итоговая рекомендация

### ❌ НЕ настраивать Auth Hooks сейчас

**Причины:**
- Доступные hooks не подходят для нашей задачи
- Вызовы из кода уже работают и более гибкие
- Не нужно усложнять архитектуру

### ✅ Оставить как есть

**Текущее решение работает:**
- ✅ `useAuthEventListener` слушает события автоматически
- ✅ `sendAuthEvent()` можно вызывать вручную при изменении пароля/email
- ✅ Email уведомления работают через Supabase (после настройки в Security разделе)
- ✅ Telegram уведомления работают через `auth-event-handler`

---

## 📋 Что делать дальше

1. **Закройте Auth Hooks** - не нужно ничего настраивать
2. **Настройте Security уведомления** (если еще не сделали):
   - Dashboard → Authentication → Emails → Security
   - Включите переключатели
3. **Протестируйте** изменение пароля - должно работать через `useAuthEventListener`

---

## 💡 Если в будущем понадобится полная автоматизация

Можно будет:
1. Дождаться новых Auth Hooks от Supabase (например, `user.updated` hook)
2. Или использовать Database Webhooks (если станут доступны для `auth.users`)
3. Или использовать Supabase Realtime для отслеживания изменений

Но сейчас **вызовы из кода - оптимальное решение**.



