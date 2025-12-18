# 🔍 Проверка миграций ПДД России

## ⚙️ Настройка

Перед запуском проверки убедись, что в `.env` есть:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Где взять ключи:**
- Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_KEY` = `service_role` key (секретный!)

## 🚀 Запуск проверки

```bash
npm run check:pdd-migrations
```

## 📊 Что проверяет скрипт

1. **Таблицы:**
   - `countries` - таблица стран
   - `pdd_russia_questions` - вопросы
   - `pdd_russia_answers` - ответы
   - `pdd_russia_signs` - знаки
   - `pdd_russia_penalties` - штрафы

2. **Storage bucket:**
   - `pdd_russia` - bucket для изображений

3. **Функции:**
   - `get_pdd_russia_ticket()` - получение билета
   - `get_pdd_russia_question_by_source()` - получение вопроса

4. **Seed данные:**
   - Проверка наличия стран в таблице `countries`

## ✅ Ожидаемый результат

Если все миграции применены:
```
✅ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО!
```

Если что-то не применено:
```
⚠️  НЕ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ
Нужно применить следующие миграции:
  - 20251218000001_create_countries_table.sql
  - 20251218000002_create_pdd_russia_tables.sql
  - 20251218000003_create_pdd_russia_storage_bucket.sql
```

## 🔧 Если миграции не применены

1. Открой Supabase Dashboard → SQL Editor
2. Скопируй содержимое миграции из `supabase/migrations/`
3. Вставь в редактор
4. Нажми Run
5. Повтори для всех миграций

