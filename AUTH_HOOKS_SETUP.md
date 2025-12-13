# 🔗 Настройка Supabase Auth Hooks (Альтернатива триггерам)

## ⚠️ Важно: Триггеры на auth.users закомментированы

В миграции `20251220000001_add_auth_event_triggers.sql` триггеры **намеренно закомментированы**, потому что:

1. **Прямые триггеры на `auth.users` могут быть ограничены** в Supabase
2. **Supabase Auth Hooks (BETA)** - более надежный способ
3. **Вызовы из кода** уже работают через `useAuthEventListener`

---

## 🎯 Рекомендуемый подход: Supabase Auth Hooks

### Шаг 1: Откройте Auth Hooks в Dashboard

👉 **Ссылка:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/auth/hooks

Или через меню:
- **Authentication** → **Auth Hooks** (BETA)

### Шаг 2: Создайте новый Hook

1. **Нажмите "Create new hook"**

2. **Настройте Hook:**
   - **Hook name:** `auth-event-handler`
   - **Hook URL:** `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/auth-event-handler`
   - **HTTP Method:** `POST`
   - **Events:** Выберите события:
     - ✅ `user.updated` - для email/phone changes
     - ✅ `user.password_changed` - для password changes (если доступно)
     - ✅ `user.email_changed` - для email changes (если доступно)

3. **Headers (опционально):**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_SERVICE_ROLE_KEY
   ```

4. **Нажмите "Save"**

---

## 🔄 Как это работает

1. **Пользователь меняет пароль/email** через Supabase Auth
2. **Supabase автоматически вызывает** ваш Hook URL
3. **auth-event-handler получает событие** и отправляет Telegram уведомление

**Преимущества:**
- ✅ Полностью автоматически
- ✅ Не требует вызовов из кода
- ✅ Работает для всех Auth событий
- ✅ Надежнее чем триггеры на auth.users

---

## 📋 Альтернатива: Вызовы из кода (уже работает)

Если не хотите настраивать Auth Hooks, можно использовать вызовы из кода:

### Вариант A: Автоматически через useAuthEventListener

Уже интегрировано в `AppProviders.tsx`:
```typescript
useAuthEventListener(); // Автоматически слушает события
```

### Вариант B: Вручную при изменении пароля/email

```typescript
import { sendAuthEvent } from '@/hooks/useAuthEventListener';

// После смены пароля
await supabase.auth.updateUser({ password: newPassword });
await sendAuthEvent('password_changed', user.id);

// После смены email
await supabase.auth.updateUser({ email: newEmail });
await sendAuthEvent('email_changed', user.id, {
  old_value: oldEmail,
  new_value: newEmail,
});
```

---

## ✅ Рекомендация

**Для MVP:** Используйте вызовы из кода (уже работает)

**Для Production:** Настройте Auth Hooks для полной автоматизации

---

## 🧪 Тестирование

### Тест Auth Hooks:

1. **Настройте Hook** в Dashboard
2. **Измените пароль** в приложении
3. **Проверьте логи** `auth-event-handler`:
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/auth-event-handler/logs
4. **Проверьте Telegram** - должно прийти уведомление

### Тест вызовов из кода:

1. **Измените пароль** в приложении
2. **Проверьте консоль браузера** - должны быть логи `[AuthEventListener]`
3. **Проверьте Telegram** - должно прийти уведомление

---

## 📊 Сравнение подходов

| Параметр | Auth Hooks | Вызовы из кода |
|----------|------------|----------------|
| **Автоматизация** | ✅ Полная | ⚠️ Частичная |
| **Надежность** | ✅ Высокая | ✅ Высокая |
| **Настройка** | ⚠️ Требует Dashboard | ✅ Уже работает |
| **Гибкость** | ⚠️ Ограничена | ✅ Полная |

---

## 🎯 Итог

**Текущий статус:**
- ✅ Миграции применены
- ✅ Edge Functions задеплоены
- ✅ Frontend интеграция работает
- ⚠️ Auth Hooks - опционально (для полной автоматизации)

**Можно использовать оба подхода одновременно** - они не конфликтуют.




