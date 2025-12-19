# 🔐 Добавление Upstash Secrets в Supabase

## ✅ Ваши учетные данные готовы

База данных Upstash создана успешно! Теперь нужно добавить секреты в Supabase.

---

## 📋 Пошаговая инструкция

### Шаг 1: Откройте Supabase Dashboard

1. Перейдите на https://supabase.com/dashboard
2. Выберите ваш проект (`yffjnqegeiorunyvcxkn` или другой)
3. В левом меню найдите **Settings** (⚙️)
4. Перейдите в **Edge Functions** → **Secrets**

### Шаг 2: Добавьте первый секрет

1. Нажмите кнопку **"Add new secret"** или **"New secret"**
2. Заполните:
   - **Name:** `UPSTASH_REDIS_REST_URL`
   - **Value:** `https://star-jaybird-35328.upstash.io`
3. Нажмите **"Save"** или **"Add"**

### Шаг 3: Добавьте второй секрет

1. Снова нажмите **"Add new secret"**
2. Заполните:
   - **Name:** `UPSTASH_REDIS_REST_TOKEN`
   - **Value:** `AYoAAAIncDE5NjZlN2Q0NzU4OWM0MDZkODE2ZWU2YWNiODZkYWIwOHAxMzUzMjg`
3. Нажмите **"Save"** или **"Add"**

### Шаг 4: Проверка

После добавления вы должны увидеть в списке:

```
✅ UPSTASH_REDIS_REST_URL
✅ UPSTASH_REDIS_REST_TOKEN
```

---

## ✅ Готово!

Теперь Rate Limiting будет работать в ваших Edge Functions.

---

## 🧪 Тестирование

После добавления секретов можно протестировать:

1. **Откройте любую Edge Function** (например, `duel-manager`)
2. **Добавьте rate limiting** (см. `EXAMPLE_RATE_LIMIT_USAGE.md`)
3. **Вызовите функцию** - должно работать без ошибок

---

## 🚨 Важно

- ✅ Токены добавлены в `.gitignore` - не попадут в Git
- ✅ Храните токены только в Supabase Secrets
- ✅ Не делитесь токенами публично

---

## 📝 Следующие шаги

1. ✅ Секреты добавлены в Supabase
2. ⏭️ Добавьте Rate Limiting в Edge Functions (см. `EXAMPLE_RATE_LIMIT_USAGE.md`)
3. ⏭️ Протестируйте работу

---

**Готово!** Rate limiting настроен и готов к использованию. 🚀

