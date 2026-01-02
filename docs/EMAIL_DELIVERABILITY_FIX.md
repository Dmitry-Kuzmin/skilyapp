# 📧 Email Deliverability Fix: Gmail "Dangerous" Warning

Чтобы Gmail перестал помечать письма как спам/опасные, необходимо выполнить три шага: настроить свой домен отправки (Custom SMTP), прописать DNS-записи и обновить шаблон.

**Важно:** Использовать встроенный SMTP от Supabase в продакшене нельзя — у него общая репутация, и Gmail часто блокирует такие письма.

---

## 🏗 Шаг 1: Подключение Custom SMTP (Рекомендуется Resend)

Лучший способ для Skily — использовать **Resend** (партнер Supabase, отличная проходимость).
1. Зарегистрируйтесь на [resend.com](https://resend.com).
2. Добавьте домен `skily.app`.
3. Получите API Key.
4. В Supabase Dashboard перейдите: **Project Settings -> Auth -> SMTP Settings**.
   - **Sender Email:** `noreply@skily.app` (или `auth@skily.app`)
   - **Sender Name:** `Skily AI`
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (Secure)
   - **User:** `resend`
   - **Password:** `re_12345...` (ваш API Key)

---

## 🌐 Шаг 2: DNS-записи для домена skily.app

Добавьте эти записи в панели управления доменом (Cloudflare, GoDaddy, Reg.ru и т.д.).
*(Значения приведены для Resend. Если используете другой сервис, они будут отличаться)*.

### 1. SPF (Разрешаем серверу отправлять почту)
*Тип:* `TXT`
*Имя:* `@`
*Значение:*
```text
v=spf1 include:resend.com ~all
```
*(Если у вас уже есть SPF, просто добавьте `include:resend.com` перед `~all`)*.

### 2. DKIM (Цифровая подпись писем)
*Тип:* `MX`
*Имя:* `bounces` (или то, что выдаст Resend)
*Значение:* `feedback.resend.com`

*Тип:* `TXT`
*Имя:* `resend._domainkey`
*Значение:* (Скопируйте длинный ключ из панели Resend)

### 3. DMARC (Политика безопасности)
Это критически важно для Gmail с 2024 года.
*Тип:* `TXT`
*Имя:* `_dmarc`
*Значение:*
```text
v=DMARC1; p=none; rua=mailto:dmarc@skily.app
```
*(Начните с `p=none`. Через неделю, если все хорошо, поменяйте на `p=quarantine`)*.

---

## 🎨 Шаг 3: Обновление шаблона письма

В проекте создан новый файл: `supabase/email-templates/reset-password-premium.html`.

1. Скопируйте содержимое этого файла.
2. В Supabase Dashboard: **Authentication -> Email Templates -> Reset Password**.
3. Вставьте HTML код.
4. Убедитесь, что `Subject` письма: `Сброс пароля в Skily`.

---

## 🔗 Шаг 4: Custom Domain Tracking (Брендирование ссылок)

Чтобы ссылки начинались с `auth.skily.app` (а не `supabase.co`):

1. В DNS добавьте запись:
   - *Тип:* `CNAME`
   - *Имя:* `auth` (или `id`)
   - *Значение:* `ваш-ref-id.supabase.co` (найдите в настройках Supabase).
2. В Supabase: **Settings -> Custom Domains**.
   - Укажите `auth.skily.app`.
   - Дождитесь верификации TXT записей.
3. После этого все ссылки `{{ .ConfirmationURL }}` в письмах будут вести на ваш домен, что резко повысит доверие Gmail.
