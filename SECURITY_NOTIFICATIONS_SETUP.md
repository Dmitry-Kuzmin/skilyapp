# 🔐 Настройка уведомлений о безопасности

## Два канала уведомлений

У вас есть **два независимых канала** для уведомлений о критичных Auth событиях:

### 1. 📧 Email уведомления (Supabase встроенные)
- **Автоматические** - Supabase отправляет сам
- **Настраиваются** в Dashboard → Authentication → Emails → Security
- **Работают** только для пользователей с email

### 2. 📱 Telegram уведомления (наша система)
- **Требуют вызова** функции `auth-event-handler`
- **Настраиваются** через шаблоны в БД
- **Работают** для пользователей с `telegram_id`

---

## 📋 Пошаговая настройка

### Шаг 1: Настройка Email уведомлений в Supabase Dashboard

1. **Откройте:** Supabase Dashboard → Authentication → Emails → Security

2. **Включите переключатели** для нужных событий:
   - ✅ **Password changed** - обязательно
   - ✅ **Email address changed** - обязательно
   - ✅ **Phone number changed** - опционально
   - ✅ **Identity linked** - опционально
   - ✅ **Identity unlinked** - обязательно
   - ✅ **Multi-factor authentication method added** - опционально
   - ✅ **Multi-factor authentication method removed** - обязательно

3. **Настройте SMTP** (для production):
   - Перейдите на вкладку **"SMTP Settings"**
   - Настройте свой SMTP сервер (SendGrid, Mailgun, AWS SES и т.д.)
   - Или используйте встроенный сервис Supabase (только для dev)

4. **Нажмите "Save changes"**

**Результат:** Supabase будет автоматически отправлять email при этих событиях.

---

### Шаг 2: Настройка Telegram уведомлений

#### 2.1. Применить миграцию

```bash
# Через SQL Editor в Supabase Dashboard
# Или через CLI:
supabase db push
```

Миграция создаст шаблоны в таблице `notification_templates`.

#### 2.2. Задеплоить Edge Function

```bash
supabase functions deploy auth-event-handler
```

#### 2.3. Интегрировать вызовы в код

**Вариант A: Вызов из приложения**

При изменении пароля/email в коде:

```typescript
// После успешной смены пароля
import { supabase } from '@/integrations/supabase/client';

async function handlePasswordChange() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Вызываем auth-event-handler для Telegram уведомления
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-event-handler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        event_type: 'password_changed',
        user_id: user.id,
      }),
    });
  }
}
```

**Вариант B: Database Webhook (автоматически)**

Настроить Database Webhook на таблице `auth.users`, который будет вызывать `auth-event-handler` при изменениях.

---

## 🎯 Рекомендуемая конфигурация

### Для Production:

1. **Email уведомления:**
   - ✅ Включить все критичные события
   - ✅ Настроить свой SMTP сервер
   - ✅ Настроить кастомные email шаблоны (опционально)

2. **Telegram уведомления:**
   - ✅ Применить миграцию
   - ✅ Задеплоить `auth-event-handler`
   - ✅ Интегрировать вызовы в код или настроить Webhooks

### Для Development:

- Можно использовать встроенный email сервис Supabase
- Telegram уведомления работают так же

---

## 📊 Сравнение каналов

| Параметр | Email (Supabase) | Telegram (Наша система) |
|----------|------------------|-------------------------|
| **Автоматизация** | ✅ Полностью автоматические | ⚠️ Требуют вызова функции |
| **Настройка** | Dashboard UI | БД шаблоны + код |
| **Кастомизация** | Ограниченная | Полная (AI, персонализация) |
| **Доступность** | Только для email | Только для telegram_id |
| **Production ready** | ✅ Да (с SMTP) | ✅ Да |

---

## 🔧 Проверка работы

### Проверка Email уведомлений:

1. Измените пароль в приложении
2. Проверьте почту пользователя
3. Должно прийти письмо от Supabase

### Проверка Telegram уведомлений:

1. Вызовите `auth-event-handler` с тестовым событием
2. Проверьте логи функции
3. Проверьте Telegram бота - должно прийти уведомление

---

## ⚠️ Важные замечания

1. **Email уведомления** работают автоматически только для событий, которые Supabase обрабатывает сам (смена пароля через Supabase Auth API)

2. **Telegram уведомления** нужно вызывать вручную или через Webhooks

3. **Оба канала** можно использовать одновременно - они не конфликтуют

4. **SMTP настройка** обязательна для production - встроенный сервис имеет лимиты

---

## 📝 Примеры событий

### Password Changed
```typescript
// Email: Автоматически от Supabase
// Telegram: Нужно вызвать
await fetch('/functions/v1/auth-event-handler', {
  method: 'POST',
  body: JSON.stringify({
    event_type: 'password_changed',
    user_id: user.id,
  }),
});
```

### Email Changed
```typescript
// Email: Автоматически от Supabase
// Telegram: Нужно вызвать
await fetch('/functions/v1/auth-event-handler', {
  method: 'POST',
  body: JSON.stringify({
    event_type: 'email_changed',
    user_id: user.id,
    old_value: oldEmail,
    new_value: newEmail,
  }),
});
```

### MFA Enrolled
```typescript
// Email: Автоматически от Supabase (если включено)
// Telegram: Нужно вызвать
await fetch('/functions/v1/auth-event-handler', {
  method: 'POST',
  body: JSON.stringify({
    event_type: 'mfa_enrolled',
    user_id: user.id,
  }),
});
```

---

## 🆘 Troubleshooting

### Email не приходят:
- Проверьте SMTP настройки
- Проверьте спам папку
- Проверьте, что событие включено в Dashboard

### Telegram уведомления не приходят:
- Проверьте, что функция задеплоена
- Проверьте логи `auth-event-handler`
- Проверьте, что у пользователя есть `telegram_id`
- Проверьте, что шаблон существует в БД

---

## ✅ Чеклист настройки

- [ ] Включить security события в Supabase Dashboard
- [ ] Настроить SMTP (для production)
- [ ] Применить миграцию с шаблонами
- [ ] Задеплоить `auth-event-handler`
- [ ] Интегрировать вызовы в код приложения
- [ ] Протестировать оба канала уведомлений




