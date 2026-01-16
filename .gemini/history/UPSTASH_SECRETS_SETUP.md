# 🔐 Настройка Upstash Secrets в Supabase

## ✅ Ваши учетные данные

**База данных создана успешно!**

- **URL:** `https://star-jaybird-35328.upstash.io`
- **Token:** `AYoAAAIncDE5NjZlN2Q0NzU4OWM0MDZkODE2ZWU2YWNiODZkYWIwOHAxMzUzMjg`

---

## 📋 Шаги для добавления в Supabase

### 1. Откройте Supabase Dashboard

1. Перейдите на https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в **Settings** → **Edge Functions** → **Secrets**

### 2. Добавьте секреты

Нажмите **"Add new secret"** и добавьте два секрета:

#### Секрет 1:
- **Name:** `UPSTASH_REDIS_REST_URL`
- **Value:** `https://star-jaybird-35328.upstash.io`

#### Секрет 2:
- **Name:** `UPSTASH_REDIS_REST_TOKEN`
- **Value:** `AYoAAAIncDE5NjZlN2Q0NzU4OWM0MDZkODE2ZWU2YWNiODZkYWIwOHAxMzUzMjg`

### 3. Сохраните

Нажмите **"Save"** для каждого секрета.

---

## ✅ Проверка

После добавления секретов:

1. **Проверьте в списке:**
   - Должны быть видны оба секрета
   - Имена должны быть точно как указано выше

2. **Тест в Edge Function:**
   - Создайте тестовую функцию или используйте существующую
   - Rate limiting должен работать

---

## 🚨 Важно

- **Не коммитьте токены в Git!**
- Токены уже добавлены в `.gitignore` (если есть `.env` файл)
- Храните токены только в Supabase Secrets

---

## 📝 Следующие шаги

После добавления секретов:

1. ✅ Добавьте Rate Limiting в Edge Functions (см. `EXAMPLE_RATE_LIMIT_USAGE.md`)
2. ✅ Протестируйте работу rate limiting
3. ✅ Проверьте логи в Upstash Dashboard

---

**Готово!** Rate limiting теперь настроен и готов к использованию.

