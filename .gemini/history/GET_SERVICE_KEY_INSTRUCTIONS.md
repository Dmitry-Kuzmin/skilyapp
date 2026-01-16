# 🔑 Получение Service Role Key

## ⚠️ ВАЖНО: Временная функция - удалить после использования!

Эта функция создана для одноразового получения Service Role Key. **УДАЛИТЬ НЕМЕДЛЕННО** после получения ключа!

---

## 📋 Шаг 1: Задеплоить функцию

### Вариант А: Через Supabase Dashboard (рекомендуется)

1. Откройте **Supabase Dashboard**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
2. Найдите функцию **get-service-key** (если она есть)
3. Если нет - создайте новую функцию:
   - Нажмите **"New Function"**
   - Название: `get-service-key`
   - Скопируйте код из `supabase/functions/get-service-key/index.ts`
   - Нажмите **"Deploy"**

### Вариант Б: Через Supabase CLI (если установлен)

```bash
supabase functions deploy get-service-key
```

---

## 📋 Шаг 2: Получить Service Role Key

1. Откройте в браузере:
   ```
   https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/get-service-key
   ```

2. Скопируйте значение `service_role_key` из JSON-ответа

3. Сохраните ключ в безопасном месте:
   ```bash
   # В .env.local или .env
   SUPABASE_SERVICE_ROLE_KEY="ваш-ключ-здесь"
   ```

---

## 📋 Шаг 3: УДАЛИТЬ функцию (КРИТИЧЕСКИ ВАЖНО!)

### Через Supabase Dashboard:

1. Откройте **Edge Functions**: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
2. Найдите функцию **get-service-key**
3. Нажмите **три точки** (⋮) рядом с функцией
4. Выберите **Delete**
5. Подтвердите удаление

### Или удалить файлы:

```bash
# Удалить папку функции
rm -rf supabase/functions/get-service-key/

# Удалить секцию из config.toml
# Удалите строки:
# [functions.get-service-key]
# verify_jwt = false
```

---

## ✅ После получения ключа

Теперь вы можете использовать Service Role Key для:

1. **Автоматического применения миграций** через скрипты
2. **Программного управления Supabase** через API
3. **Других административных задач**

---

## ⚠️ БЕЗОПАСНОСТЬ

- **НЕ** коммитьте Service Role Key в Git
- **НЕ** делитесь ключом публично
- **НЕ** используйте ключ в клиентском коде
- **Храните** ключ только в `.env.local` или переменных окружения
- **УДАЛИТЕ** функцию сразу после получения ключа

---

## 🔧 Использование ключа

После получения ключа:

```bash
# Установить переменную окружения
export SUPABASE_SERVICE_ROLE_KEY="ваш-ключ"

# Затем можно применить миграции
node scripts/apply-urgent-fix-direct.js
```

Или в `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=ваш-ключ
```


