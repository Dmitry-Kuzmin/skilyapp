# 📝 Ручное применение миграций

## Проблема
Команда `supabase db push` зависает из-за проблем с подключением через pooler.

## Решение: Применить миграции через SQL Editor

### Шаг 1: Откройте SQL Editor
👉 https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

### Шаг 2: Примените миграции по порядку

Все миграции находятся в папке `supabase/migrations/` и должны применяться в порядке даты в имени файла.

**Список миграций (53 шт.):**
1. 20251025190138_853a08b0-ea77-4dc3-a778-d1c9551865e5.sql
2. 20251026075231_e3f57da0-3c46-4c81-acdd-220644d9d330.sql
3. 20251026093842_402cedb4-10b4-4cc3-8632-35c3e979c2b2.sql
... (и так далее)

### Шаг 3: Автоматизация через скрипт

Я создам скрипт, который выведет все миграции для копирования в SQL Editor.

---

## Альтернатива: Использовать psql напрямую

Если у вас установлен PostgreSQL клиент:

```bash
# Получите connection string из Dashboard
# Settings → Database → Connection string (URI mode)
# Затем:
psql "postgresql://postgres.yffjnqegeiorunyvcxkn:345556Ff@?@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/20251025190138_853a08b0-ea77-4dc3-a778-d1c9551865e5.sql
```

---

## Быстрое решение

Создам скрипт, который объединит все миграции в один SQL файл для применения в SQL Editor.
