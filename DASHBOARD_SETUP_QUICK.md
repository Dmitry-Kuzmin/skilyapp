# ⚡ Быстрая настройка Dashboard (2 минуты)

## 🎯 Шаг 1: Security Email уведомления (1 минута)

### 1. Откройте Dashboard
👉 **Ссылка:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/auth/emails

Или через меню:
- **Authentication** → **Emails** → вкладка **"Security"**

### 2. Включите переключатели

**Обязательно включить:**
- ✅ **Password changed** - уведомление при смене пароля
- ✅ **Email address changed** - уведомление при смене email
- ✅ **Identity unlinked** - уведомление при отвязке аккаунта
- ✅ **Multi-factor authentication method removed** - уведомление при отключении MFA

**Опционально:**
- ⚪ **Phone number changed** - если используете телефонную аутентификацию
- ⚪ **Identity linked** - если хотите уведомлять о привязке аккаунтов
- ⚪ **Multi-factor authentication method added** - если хотите уведомлять о включении MFA

### 3. Нажмите "Save changes"
Кнопка внизу справа.

**Готово!** ✅ Email уведомления теперь работают автоматически.

---

## 🎯 Шаг 2: SMTP настройка (1 минута) - ТОЛЬКО для Production

### ⚠️ ВАЖНО: Это нужно только для production!

Для **development** можно использовать встроенный сервис Supabase (но есть лимиты).

### Для Production:

1. **Перейдите на вкладку "SMTP Settings"**
   (рядом с "Templates" в том же разделе)

2. **Настройте SMTP сервер:**
   - **Host:** ваш SMTP сервер (например, smtp.sendgrid.net)
   - **Port:** 587 (TLS) или 465 (SSL)
   - **Username:** ваш SMTP username
   - **Password:** ваш SMTP password
   - **Sender email:** ваш email для отправки
   - **Sender name:** "Skily" или ваше название

3. **Популярные SMTP провайдеры:**
   - **SendGrid:** smtp.sendgrid.net:587
   - **Mailgun:** smtp.mailgun.org:587
   - **AWS SES:** email-smtp.us-east-1.amazonaws.com:587
   - **Postmark:** smtp.postmarkapp.com:587

4. **Нажмите "Save"**

---

## ✅ Проверка работы

### Тест Email уведомлений:

1. **Измените пароль** в приложении
2. **Проверьте почту** - должно прийти письмо от Supabase
3. **Проверьте спам папку** - иногда письма попадают туда

### Тест Telegram уведомлений:

1. **Измените пароль** в приложении
2. **Проверьте Telegram бота** - должно прийти уведомление
3. **Проверьте логи** `auth-event-handler`: 
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/auth-event-handler/logs

---

## 🎨 Дополнительно: Кастомизация Email шаблонов

Если хотите кастомизировать email шаблоны:

1. **Перейдите на вкладку "Templates"**
2. **Выберите шаблон** (например, "Password changed")
3. **Отредактируйте** текст, добавьте свой HTML
4. **Используйте переменные:** `{{ .Email }}`, `{{ .SiteURL }}` и т.д.

**Или используйте нашу функцию `email-template-generator`:**
```typescript
const response = await fetch('/functions/v1/email-template-generator', {
  method: 'POST',
  body: JSON.stringify({
    template_type: 'password_changed',
    title: '🔐 Пароль изменён',
    message: 'Ваш пароль был успешно изменён...',
  }),
});
```

---

## 📋 Чеклист

- [ ] Открыл Dashboard → Authentication → Emails → Security
- [ ] Включил переключатели для критичных событий
- [ ] Нажал "Save changes"
- [ ] (Опционально) Настроил SMTP для production
- [ ] Протестировал изменение пароля
- [ ] Проверил получение email и Telegram уведомлений

---

## ⏱️ Время выполнения

- **Минимальная настройка:** 1 минута (только переключатели)
- **С SMTP:** 2 минуты (если SMTP данные готовы)
- **С кастомизацией:** 5-10 минут (если нужно редактировать шаблоны)

---

## 🆘 Troubleshooting

### Email не приходят:
- Проверьте спам папку
- Проверьте SMTP настройки (если используете свой SMTP)
- Проверьте лимиты встроенного сервиса Supabase (100 emails/день)

### Telegram уведомления не приходят:
- Проверьте, что у пользователя есть `telegram_id` в `profiles`
- Проверьте логи `auth-event-handler`
- Проверьте, что `auth-event-handler` вызывается из кода

### Ошибки в Dashboard:
- Обновите страницу (F5)
- Проверьте права доступа к проекту
- Убедитесь, что используете правильный project ID




