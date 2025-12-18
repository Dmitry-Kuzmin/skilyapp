# ✅ Проверка настройки оптимизации данных дуэлей

## Шаг 1: Проверка миграций в базе данных

1. Открой **Supabase Dashboard** → **SQL Editor**
2. Скопируй и выполни содержимое файла `scripts/check_duel_cleanup_setup.sql`
3. Проверь результаты — все проверки должны показывать ✅

### Ожидаемый результат:

```
✅ Колонка match_summary существует
✅ Функция delete_old_duel_data существует  
✅ Функция claim_technical_win обновлена с match_summary
✅ Индекс idx_duel_answers_created_at существует
✅ Индекс idx_duel_active_exploits_created_at существует
```

## Шаг 2: Проверка Edge Function

1. Перейди в **Supabase Dashboard** → **Edge Functions**
2. Найди функцию `duel-data-cleanup`
3. Проверь, что она **развернута** (зеленый статус)

### Если функция не найдена:

Разверни её командой:
```bash
supabase functions deploy duel-data-cleanup
```

Или через Dashboard:
- Edge Functions → Create function
- Импортируй код из `supabase/functions/duel-data-cleanup/index.ts`

## Шаг 3: Тестовая проверка функции очистки

### Вариант A: Через SQL (безопасно, только проверка структуры)

Выполни в SQL Editor:
```sql
-- Это НЕ удалит данные, только проверит что функция работает
SELECT * FROM public.delete_old_duel_data();
```

Должен вернуться результат с полями:
- `deleted_answers`
- `deleted_exploits`  
- `cleaned_duels`

### Вариант B: Через Edge Function

Вызови Edge Function через curl или Dashboard:
```bash
curl -X POST \
  "https://YOUR_PROJECT.supabase.co/functions/v1/duel-data-cleanup" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Или через Dashboard → Edge Functions → `duel-data-cleanup` → **Invoke**

## Шаг 4: Проверка индексов (опционально)

Проверь, что индексы действительно используются:
```sql
-- Проверка использования индексов
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    (tablename = 'duel_answers' AND indexname LIKE '%created_at%')
    OR (tablename = 'duel_active_exploits' AND indexname LIKE '%created_at%')
  );
```

## Шаг 5: Проверка GitHub Actions (если используешь)

1. Перейди в **GitHub** → твой репозиторий → **Actions**
2. Проверь, что workflow `Duel Data Cleanup` существует
3. Убедись, что секреты настроены:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## ⚠️ Частые проблемы

### Проблема: "Колонка match_summary не найдена"

**Решение:** Примени миграцию `20250121000000_optimize_duel_data_pruning.sql`

### Проблема: "Функция delete_old_duel_data не найдена"

**Решение:** Примени миграцию `20250121000000_optimize_duel_data_pruning.sql`

### Проблема: "Функция claim_technical_win не обновлена"

**Решение:** Примени миграцию `20250121000001_update_claim_technical_win_match_summary.sql`

### Проблема: "Edge Function не найдена"

**Решение:** Разверни функцию:
```bash
supabase functions deploy duel-data-cleanup
```

## ✅ Итоговая проверка

Если все шаги пройдены успешно, то:

1. ✅ Все миграции применены
2. ✅ Edge Function развернута
3. ✅ Индексы созданы
4. ✅ Функции обновлены
5. ✅ Система очистки готова к работе

**Следующий шаг:** Настрой автоматический запуск через GitHub Actions (см. `docs/DUEL_DATA_CLEANUP_SETUP.md`)




