# 🔒 Security Fix для Партнерской Программы

> **Дата:** 2 декабря 2025  
> **Приоритет:** ВЫСОКИЙ (Security)  
> **Время на fix:** 5 минут

---

## 🚨 Обнаруженные Проблемы

### 1. Function Search Path Mutable (35 функций)
**Проблема:** Функции с `SECURITY DEFINER` не имеют фиксированного `search_path`  
**Риск:** SQL Injection через подмену схем  
**Критичность:** ⚠️ WARN (Medium)

### 2. Leaked Password Protection Disabled
**Проблема:** Не включена защита от скомпрометированных паролей  
**Риск:** Пользователи могут использовать утекшие пароли  
**Критичность:** ⚠️ WARN (Medium)

---

## ✅ Решение

### Шаг 1: Применить Security Patch Миграцию

```sql
-- В Supabase Dashboard → SQL Editor
-- Скопировать и выполнить:

supabase/migrations/20251202100006_fix_function_search_path.sql
```

**Что делает миграция:**
- ✅ Обновляет 4 функции (пересоздает с `SET search_path = public`)
- ✅ Для остальных 31 функции применяет `ALTER FUNCTION ... SET search_path = public`
- ✅ Выводит напоминание про Leaked Password Protection

---

### Шаг 2: Включить Leaked Password Protection

#### Вариант А: Через Dashboard (рекомендовано)

1. Открыть [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбрать проект
3. **Authentication** → **Providers** → **Email**
4. Прокрутить до **Password Protection**
5. Включить переключатель **"Enable"**
6. Нажать **Save**

#### Вариант Б: Через CLI

```bash
supabase secrets set AUTH_BREACH_PROTECT_ENABLED=true
```

#### Вариант В: Через SQL

```sql
-- Выполнить в SQL Editor
UPDATE auth.config
SET config = jsonb_set(config, '{password}', '{"breach_protection": true}')
WHERE name = 'password_strength';
```

---

## 🧪 Проверка

### 1. Проверить Search Path Fix:

```sql
-- Выполнить в SQL Editor
SELECT 
  routine_name,
  routine_schema,
  prosrc
FROM information_schema.routines
LEFT JOIN pg_proc ON proname = routine_name
WHERE routine_schema = 'public'
AND routine_name LIKE '%partner%'
AND routine_type = 'FUNCTION'
LIMIT 5;

-- Должны увидеть: SET search_path = public в определениях функций
```

### 2. Проверить Password Protection:

```sql
-- Попробовать создать пользователя с известным утекшим паролем
-- Должно вернуть ошибку: "Password is too weak"
```

---

## 📊 Что Изменится

### До Fix:
```sql
CREATE OR REPLACE FUNCTION grant_partner_premium(...)
RETURNS TABLE(...)
LANGUAGE plpgsql 
SECURITY DEFINER  -- ⚠️ Опасно без search_path!
AS $$
...
$$;
```

### После Fix:
```sql
CREATE OR REPLACE FUNCTION grant_partner_premium(...)
RETURNS TABLE(...)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public  -- ✅ Безопасно!
AS $$
...
$$;
```

---

## 🔍 Почему Это Важно

### Search Path Vulnerability:

**Сценарий атаки:**
1. Злоумышленник создает схему `malicious`
2. В ней создает таблицу `partners` с вредоносными триггерами
3. Изменяет свой `search_path` на `malicious, public`
4. Вызывает функцию `grant_partner_premium()`
5. Функция использует **его** таблицу `partners` вместо `public.partners`
6. Выполняется вредоносный код с привилегиями владельца функции

**С фиксированным search_path:**
- Функция **всегда** использует `public.partners`
- Атака невозможна

### Leaked Password Protection:

**Проблема:**
- Пользователь использует пароль `password123`
- Этот пароль есть в базе HaveIBeenPwned (утек в прошлых взломах)
- Без защиты - пароль принимается
- С защитой - пароль отклоняется

**Преимущества:**
- ✅ Защита от credential stuffing атак
- ✅ Соответствие best practices безопасности
- ✅ Меньше взломанных аккаунтов

---

## 🎯 Чеклист

После применения fix:

- [ ] Применена миграция `20251202100006_fix_function_search_path.sql`
- [ ] Включена Leaked Password Protection в Dashboard
- [ ] Проверка: функции имеют `SET search_path = public`
- [ ] Проверка: слабые пароли отклоняются при регистрации
- [ ] Линтер Supabase больше не показывает эти warnings

---

## 📚 Документация

- [Supabase Function Search Path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)

---

## 💡 Дополнительные Рекомендации

### 1. Регулярный Audit Функций

```sql
-- Найти все SECURITY DEFINER функции без search_path
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  CASE 
    WHEN p.proconfig IS NULL THEN 'NO search_path'
    WHEN 'search_path' = ANY(p.proconfig) THEN 'Has search_path'
    ELSE 'NO search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true  -- SECURITY DEFINER
AND n.nspname = 'public'
ORDER BY p.proname;
```

### 2. Автоматический Мониторинг

Добавить в CI/CD проверку линтера Supabase:

```bash
# В GitHub Actions или другой CI
supabase db lint --level warning
```

---

**Следующий шаг:** Примени миграцию и включи Password Protection! 🔒

**Документ создан:** 2 декабря 2025  
**Автор:** AI Assistant  
**Статус:** ✅ Готово к применению













