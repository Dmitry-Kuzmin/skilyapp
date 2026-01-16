# ✅ Применить флаг duels_enabled

**Статус:** Миграция Feature Flags применена  
**Что нужно:** Добавить флаг для дуэлей

---

## 📋 Шаги

### 1. Откройте Supabase Dashboard

1. Перейдите на: https://supabase.com/dashboard
2. Выберите проект: `yffjnqegeiorunyvcxkn`
3. Перейдите в **SQL Editor**

### 2. Примените SQL

Скопируйте и выполните:

```sql
INSERT INTO app_config (key, value, description) VALUES
  ('duels_enabled', 'true'::jsonb, 'Включить функцию Дуэли')
ON CONFLICT (key) DO NOTHING;
```

### 3. Проверка

Выполните:

```sql
SELECT * FROM app_config WHERE key = 'duels_enabled';
```

**Ожидаемый результат:**
- Должна быть запись с `key = 'duels_enabled'`
- `value = true`

---

## ✅ Готово!

После применения флага Feature Flags полностью настроены.

---

**Следующий шаг:** Протестировать работу через админку `/admin/feature-flags`

