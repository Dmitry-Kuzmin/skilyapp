# 🔧 Быстрое исправление ошибки 403 для app_config

**Ошибка:** `Failed to load resource: the server responded with a status of 403`

**Причина:** RLS политика блокирует доступ к таблице `app_config`

---

## ✅ Решение (2 минуты)

### 1. Откройте Supabase Dashboard

1. Перейдите на: https://supabase.com/dashboard
2. Выберите проект: `yffjnqegeiorunyvcxkn`
3. Перейдите в **SQL Editor**

### 2. Выполните SQL

Скопируйте и выполните:

```sql
-- Удаляем старую политику если есть
DROP POLICY IF EXISTS "Anyone can read app_config" ON app_config;

-- Создаем правильную политику (все могут читать)
CREATE POLICY "Anyone can read app_config"
  ON app_config FOR SELECT
  USING (true);

-- Убеждаемся, что RLS включен
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
```

### 3. Проверка

Выполните:

```sql
-- Проверяем политику
SELECT * FROM pg_policies WHERE tablename = 'app_config';

-- Проверяем доступ
SELECT * FROM app_config;
```

**Ожидаемый результат:**
- Должна быть политика "Anyone can read app_config"
- Запрос `SELECT * FROM app_config` должен вернуть данные без ошибок

---

## ✅ Готово!

После выполнения SQL ошибка 403 исчезнет, и Feature Flags будут работать.

---

**Файл миграции:** `supabase/migrations/20250101000003_fix_app_config_rls.sql`








