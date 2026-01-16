# 🔧 Исправление политик Storage для импорта

## Проблема

При импорте изображений возникает ошибка "Bucket not found", хотя bucket существует. Это происходит из-за политик RLS, которые блокируют запись через service_role.

## Решение

Нужно обновить политики Storage, чтобы разрешить запись через service_role.

### Вариант 1: Через SQL (рекомендуется)

Выполни в Supabase Dashboard → SQL Editor:

```sql
-- Разрешаем service_role загружать изображения
CREATE POLICY "Service role can upload PDD Russia images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdd_russia');

-- Или обновить существующую политику
DROP POLICY IF EXISTS "Authenticated users can upload PDD Russia images" ON storage.objects;

CREATE POLICY "Authenticated users can upload PDD Russia images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdd_russia'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);
```

### Вариант 2: Временно отключить RLS (только для импорта)

```sql
-- ВНИМАНИЕ: Только для импорта! Потом вернуть обратно
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- После импорта вернуть:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## После исправления

Запусти импорт снова:
```bash
npm run import:pdd-russia /tmp/pdd_russia
```


