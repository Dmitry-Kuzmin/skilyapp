# 🔧 Исправление ошибки 403 для app_config

**Ошибка:** `Failed to load resource: the server responded with a status of 403`

**Причина:** RLS политика блокирует доступ к таблице `app_config`

---

## 🔍 Проблема

Таблица `app_config` имеет RLS включенный, но политика может быть неправильной или отсутствовать.

---

## ✅ Решение

### Вариант 1: Проверить и исправить политику (рекомендуется)

Выполните в SQL Editor:

```sql
-- Проверяем текущие политики
SELECT * FROM pg_policies WHERE tablename = 'app_config';

-- Если политики нет или неправильная, создаем/обновляем:
DROP POLICY IF EXISTS "Anyone can read app_config" ON app_config;

CREATE POLICY "Anyone can read app_config"
  ON app_config FOR SELECT
  USING (true);

-- Проверяем, что RLS включен
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
```

### Вариант 2: Временно отключить RLS (только для теста)

```sql
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;
```

**⚠️ Внимание:** Это отключит безопасность. Используйте только для проверки.

---

## ✅ Проверка

После исправления проверьте:

```sql
-- Должна быть политика
SELECT * FROM pg_policies WHERE tablename = 'app_config';

-- Должен быть доступ
SELECT * FROM app_config;
```

---

**После исправления:** Feature Flags будут работать без ошибок 403.

