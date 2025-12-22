---
description: как выполнить SQL в Supabase через Edge Function
---

# Выполнение SQL в Supabase

Этот workflow позволяет выполнять SQL запросы напрямую в production базе данных Supabase.

## Требования
- Ключ `SUPABASE_SERVICE_ROLE_KEY` должен быть в `.env.local`
- Edge Function `apply-sql` должна быть задеплоена

## Использование

// turbo-all
1. Загрузить переменные окружения:
```bash
source .env.local
```

2. Выполнить SQL через curl:
```bash
curl -X POST "https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/apply-sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1 as test"}'
```

## Примеры

### Проверить существование таблицы
```bash
curl -X POST "https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/apply-sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' LIMIT 5"}'
```

### Создать или обновить функцию
```bash
curl -X POST "https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/apply-sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "CREATE OR REPLACE FUNCTION test_fn() RETURNS text AS $$ BEGIN RETURN '\''ok'\''; END; $$ LANGUAGE plpgsql;"}'
```

## Безопасность

⚠️ **ВАЖНО**: 
- `SUPABASE_SERVICE_ROLE_KEY` НИКОГДА не должен попадать в git
- Файл `.env.local` уже в `.gitignore`
- Не выводить ключ в логи или консоль
