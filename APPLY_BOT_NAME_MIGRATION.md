# Применить миграцию для добавления bot_name в duel_players

## Проблема
Edge Function `duel-manager` не может найти колонку `bot_name` в таблице `duel_players`, что вызывает ошибку при создании дуэли.

## Решение
Нужно добавить колонки `bot_name` и `name` в таблицу `duel_players`.

## Способ 1: Через SQL Editor (рекомендуется)

1. Откройте SQL Editor:
   ```
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
   ```

2. Скопируйте и выполните следующий SQL:

```sql
-- Add bot_name and name columns to duel_players table
-- These columns are used by the duel-manager Edge Function to store bot names

-- Add bot_name column (nullable, only for bots)
ALTER TABLE public.duel_players 
ADD COLUMN IF NOT EXISTS bot_name TEXT;

-- Add name column (nullable, for compatibility)
ALTER TABLE public.duel_players 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.duel_players.bot_name IS 'Name of the bot player (only set when is_bot = true)';
COMMENT ON COLUMN public.duel_players.name IS 'Display name of the player (for compatibility, can be used for both bots and users)';
```

3. Нажмите Run (или `Ctrl+Enter` / `Cmd+Enter`)

4. Проверьте результат - должно появиться "Success" ✅

## Способ 2: Через Edge Function apply-sql

Если у вас есть доступ к Edge Function `apply-sql`, можно использовать её:

```bash
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/apply-sql \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "ALTER TABLE public.duel_players ADD COLUMN IF NOT EXISTS bot_name TEXT; ALTER TABLE public.duel_players ADD COLUMN IF NOT EXISTS name TEXT;"
  }'
```

## Проверка

После применения миграции:
- ✅ Создание дуэли должно работать без ошибок
- ✅ Ошибка "Could not find the 'bot_name' column" должна исчезнуть
- ✅ Боты должны корректно создаваться с именами

