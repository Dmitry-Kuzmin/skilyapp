# 📧 Настройка Zoho Mail после подтверждения домена

## ✅ Шаг 1: Домен подтвержден

Домен `skilyapp.com` успешно подтвержден в Zoho Mail!

---

## 🔧 Шаг 2: Настроить MX записи в DNS (Vercel)

Ваш домен использует **Vercel DNS**, поэтому настройка происходит в Vercel Dashboard.

### Пошаговая инструкция для Vercel:

1. **Откройте Vercel Dashboard:**
   - Перейдите на [vercel.com](https://vercel.com)
   - Войдите в аккаунт
   - Выберите проект с доменом `skilyapp.com`

2. **Откройте настройки DNS:**
   - Перейдите в **Settings** → **Domains**
   - Найдите домен `skilyapp.com`
   - Нажмите на него, чтобы открыть настройки
   - Перейдите на вкладку **DNS Records**

3. **Добавьте MX записи:**

   **⚠️ ВАЖНО:** Не удаляйте существующие DNS записи Vercel (ALIAS, CAA и др.)!
   Они нужны для работы сайта. Просто добавьте новые MX записи для Zoho Mail:

   | Тип | Имя | Значение | Приоритет |
   |-----|-----|----------|-----------|
   | MX | @ | `mx.zoho.eu` | 10 |
   | MX | @ | `mx2.zoho.eu` | 20 |
   | MX | @ | `mx3.zoho.eu` | 50 |

   **Как добавить в Vercel:**
   - Нажмите **"Add Record"**
   - Выберите тип **MX**
   - Имя: `@` (или оставьте пустым)
   - Значение: `mx.zoho.eu`
   - Приоритет: `10`
   - Сохраните
   - Повторите для `mx2.zoho.eu` (приоритет 20) и `mx3.zoho.eu` (приоритет 50)

4. **Добавьте SPF запись (TXT):**

   | Тип | Имя | Значение |
   |-----|-----|----------|
   | TXT | @ | `v=spf1 include:zohomail.eu ~all` |

   **Как добавить в Vercel:**
   - Нажмите **"Add Record"**
   - Выберите тип **TXT**
   - Имя: `@` (или оставьте пустым)
   - Значение: `v=spf1 include:zohomail.eu ~all`
   - Сохраните

5. **Добавьте DKIM запись (TXT):**

   | Тип | Имя | Значение |
   |-----|-----|----------|
   | TXT | `zmail._domainkey` | `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCLjfvqPfLmepDjD2O6YXSSnfCcBVQ6eO36bafn5qPTBp03Cn4KMPkGNZVBRWJa+G2yNxjLkwIWZ9bEDZsCzV90CSO5ZNYtpeyeLaSaN0q/jFVaHqiPEAfH/vMp9O8GGJPeaOsClTeQbF0QzdCCHGs9un3csRsRA4CulAtE+ZW9GwIDAQAB` |

   **Как добавить в Vercel:**
   - Нажмите **"Add Record"**
   - Выберите тип **TXT**
   - Имя: `zmail._domainkey`
   - Значение: `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCLjfvqPfLmepDjD2O6YXSSnfCcBVQ6eO36bafn5qPTBp03Cn4KMPkGNZVBRWJa+G2yNxjLkwIWZ9bEDZsCzV90CSO5ZNYtpeyeLaSaN0q/jFVaHqiPEAfH/vMp9O8GGJPeaOsClTeQbF0QzdCCHGs9un3csRsRA4CulAtE+ZW9GwIDAQAB`
   - Сохраните

6. **Проверьте записи:**
   - Убедитесь, что все записи добавлены правильно
   - В Vercel должны отображаться 3 MX записи и 2 TXT записи

7. **Подождите распространения DNS:**
   - Минимум: 30 минут
   - Максимум: до 24 часов (в зависимости от TTL)
   - Проверить можно здесь: [mxtoolbox.com](https://mxtoolbox.com/SuperTool.aspx?action=mx%3askilyapp.com)

### ⚠️ Важно:
- Укажите минимальный TTL (Time To Live) в настройках DNS
- Изменения могут вступить в силу от 30 минут до 1 дня
- Не удаляйте другие важные DNS записи (A, CNAME для Vercel)

---

## 📝 Шаг 3: Создать почтовые ящики

### У вас уже есть:
- ✅ `support@skilyapp.com` (создан)

### Рекомендуемые ящики для проекта:

1. **support@skilyapp.com** ✅ (уже есть)
   - Для поддержки пользователей

2. **info@skilyapp.com**
   - Для общей информации

3. **noreply@skilyapp.com**
   - Для автоматических уведомлений

4. **admin@skilyapp.com**
   - Для административных целей

### Как создать новый ящик:

1. В Zoho Mail → Настройка пользователей
2. Нажмите "+ Добавить"
3. Заполните:
   - Имя пользователя (например: `info`)
   - Email: `info@skilyapp.com`
   - Пароль
4. Сохраните

---

## 🔐 Шаг 4: Настроить отправку писем

### Вариант 1: Через веб-интерфейс Zoho

1. Войдите в [mail.zoho.eu](https://mail.zoho.eu)
2. Используйте веб-интерфейс для отправки/получения писем

### Вариант 2: Через почтовые клиенты (если нужен IMAP/POP)

**⚠️ ВАЖНО:** В бесплатном плане Zoho Mail нет IMAP/POP.

Для использования почтовых клиентов (Outlook, Apple Mail, Gmail) нужно:
- Перейти на платный план (Mail Lite: €0.90/месяц)
- Или использовать только веб-интерфейс

### Настройки для почтовых клиентов (если используете платный план):

**IMAP:**
- Сервер: `imap.zoho.eu` (или `imap.zoho.com`)
- Порт: 993
- SSL: Да

**SMTP:**
- Сервер: `smtp.zoho.eu` (или `smtp.zoho.com`)
- Порт: 465
- SSL: Да

---

## 📧 Шаг 5: Настроить переадресацию (опционально)

Если хотите переадресовывать письма на ваш личный Gmail:

1. В Zoho Mail → Настройки → Пересылка
2. Добавьте адрес для переадресации
3. Включите переадресацию

---

## 🔔 Шаг 6: Использовать почту в приложении

### Для отправки писем из приложения:

Можно использовать:
1. **Zoho Mail API** — для интеграции в код
2. **SMTP через Edge Functions** — для отправки уведомлений
3. **Сторонние сервисы** (SendGrid, Mailgun) — если нужна большая гибкость

### Пример интеграции SMTP в Edge Function:

```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ZOHO_SMTP_HOST = "smtp.zoho.eu";
const ZOHO_SMTP_PORT = 465;
const ZOHO_EMAIL = "support@skilyapp.com";
const ZOHO_PASSWORD = Deno.env.get("ZOHO_EMAIL_PASSWORD");

// ... код отправки через SMTP
```

---

## ✅ Чеклист настройки

- [x] Домен подтвержден
- [ ] MX записи добавлены в DNS
- [ ] SPF запись добавлена
- [ ] DKIM записи добавлены (из Zoho панели)
- [ ] Почтовые ящики созданы
- [ ] Проверена отправка/получение писем
- [ ] Настроена переадресация (если нужно)
- [ ] Интеграция в приложение (если нужно)

---

## 🎯 Следующие шаги

1. **Добавьте MX записи в DNS** (самое важное!)
2. **Подождите 5-30 минут** для распространения DNS
3. **Проверьте отправку/получение** писем
4. **Создайте дополнительные ящики** (если нужно)
5. **Настройте интеграцию** в приложение (если нужно)

---

## 📚 Полезные ссылки

- [Zoho Mail Admin Console](https://mailadmin.zoho.eu)
- [Zoho Mail Settings](https://mail.zoho.eu)
- [Zoho Mail API Documentation](https://www.zoho.com/mail/help/api/)

---

**Готово!** После настройки MX записей почта начнет работать. 🎉

