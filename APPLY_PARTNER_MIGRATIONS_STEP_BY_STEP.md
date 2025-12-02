# Пошаговое применение миграций партнёров

## Текущая ситуация
В базе применена только миграция `20250125000000_add_dashboard_stats_function`.
Нужно применить еще 3 миграции для партнёрской системы.

## Шаг 1: Применить миграцию партнёрских ссылок

1. Откройте Supabase SQL Editor: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
2. Откройте файл `APPLY_PARTNER_LINKS_MIGRATION.sql` в проекте
3. Скопируйте **ВСЁ** содержимое файла
4. Вставьте в SQL Editor
5. Нажмите **Run**
6. Дождитесь завершения (может занять 1-2 минуты)

**Что делает эта миграция:**
- Добавляет `partner_code` в таблицу `partners`
- Создает таблицу `partner_link_activations`
- Создает функции `activate_partner_premium`, `send_partner_webhook`, `get_partner_link_stats`
- Генерирует коды для существующих партнёров

## Шаг 2: Обновить функцию get_partner_dashboard

1. Откройте новый запрос в SQL Editor
2. Откройте файл `APPLY_PARTNER_DASHBOARD_UPDATE_FIXED.sql`
3. Скопируйте **ВСЁ** содержимое
4. Вставьте в SQL Editor
5. Нажмите **Run**

**Что делает эта миграция:**
- Обновляет функцию `get_partner_dashboard` для поддержки статистики по ссылкам
- Добавляет `total_link_activations`, `monthly_link_activations`, `daily_link_activations` в статистику

## Шаг 3: Добавить публичное чтение партнёров

1. Откройте новый запрос в SQL Editor
2. Откройте файл `supabase/migrations/20250125000008_fix_partners_public_read.sql`
3. Скопируйте **ВСЁ** содержимое
4. Вставьте в SQL Editor
5. Нажмите **Run**

**Что делает эта миграция:**
- Добавляет RLS политику для публичного чтения партнёров по `partner_code`
- Необходимо для отображения баннера партнёра на посадочной странице

## Шаг 4: Проверка

После применения всех миграций выполните:

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20250125%'
ORDER BY version;
```

Должны быть видны:
- ✅ 20250125000000_add_dashboard_stats_function (уже есть)
- ✅ 20250125000006_add_partner_links_system (должна появиться)
- ✅ 20250125000007_update_partner_dashboard_function (должна появиться)
- ✅ 20250125000008_fix_partners_public_read (должна появиться)

## Если миграция зависла

1. Отмените выполнение (кнопка Stop)
2. Проверьте блокировки с помощью `FIX_MIGRATION_BLOCKING.sql`
3. Если есть блокирующие запросы - прервите их
4. Попробуйте выполнить миграцию снова

## Важно

- ⚠️ Выполняйте миграции **по порядку** (1 → 2 → 3)
- ⚠️ Не прерывайте выполнение миграции
- ⚠️ Если миграция зависла более 5 минут - отмените и попробуйте снова





