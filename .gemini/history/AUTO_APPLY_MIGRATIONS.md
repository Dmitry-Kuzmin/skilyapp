# 🚀 Автоматическое применение миграций

## ✅ Настройка выполнена

Теперь все миграции применяются **автоматически** при их создании.

## 📋 Как это работает

1. **Создайте новую миграцию** в `supabase/migrations/`
2. **Запустите скрипт** для применения:
   ```bash
   node scripts/auto-apply-migrations.js
   ```

Или примените конкретную миграцию:
```bash
node scripts/auto-apply-migrations.js supabase/migrations/20251107150000_fix_source_id_unique_constraint.sql
```

## 🔧 Технические детали

- **Метод:** Supabase Management API
- **Токен:** Используется `SUPABASE_ACCESS_TOKEN` из окружения или встроенный токен
- **Идемпотентность:** Все миграции проверяют наличие объектов перед созданием
- **Ошибки:** Ошибки "already exists" игнорируются (это нормально)

## 📝 Пример использования

```bash
# Применить все новые миграции
node scripts/auto-apply-migrations.js

# Применить конкретную миграцию
node scripts/auto-apply-migrations.js supabase/migrations/20251107150000_fix_source_id_unique_constraint.sql
```

## ⚙️ Переменные окружения

Можно установить свой токен:
```bash
export SUPABASE_ACCESS_TOKEN=your_token_here
node scripts/auto-apply-migrations.js
```

## ✅ Результат

После применения миграции вы увидите:
- ✅ Применено: X - количество успешно примененных миграций
- ⚠️  Пропущено: X - количество уже примененных миграций
- ❌ Ошибок: X - количество миграций с ошибками

## 🔗 Полезные ссылки

- **SQL Editor:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new
- **Миграции:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/migrations
