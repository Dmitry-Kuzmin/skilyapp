# ✅ Применить миграцию Feature Flags

**Статус:** Таблица уже частично создана, нужно применить безопасную версию

---

## 📋 Шаги

### 1. Откройте Supabase Dashboard

1. Перейдите на: https://supabase.com/dashboard
2. Выберите проект: `yffjnqegeiorunyvcxkn`
3. Перейдите в **SQL Editor**

### 2. Примените безопасную миграцию

1. Откройте файл: `supabase/migrations/20250101000001_app_config_feature_flags_safe.sql`
2. Скопируйте **весь** SQL код
3. Вставьте в SQL Editor
4. Нажмите **Run** (или `Ctrl+Enter` / `Cmd+Enter`)

### 3. Проверка

Выполните в SQL Editor:

```sql
SELECT * FROM app_config;
```

**Ожидаемый результат:**
Должны быть 4 записи:
- `realtime_enabled` = true
- `notifications_realtime` = false
- `duel_realtime` = true
- `ai_chat_enabled` = true

---

## ✅ Готово!

После применения миграции Feature Flags будут работать.

---

**Следующий шаг:** Отключить Spend Cap (см. `DEPLOYMENT_SUCCESS.md`)

