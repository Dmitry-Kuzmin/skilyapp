# 📋 Как посмотреть логи Edge Function sync-google-sheets

## 🔗 Прямая ссылка на логи

**Логи функции sync-google-sheets:**
```
https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs
```

## 📍 Как найти логи через Dashboard

### Способ 1: Через Edge Functions

1. **Откройте Edge Functions:**
   - В левом меню нажмите на **"Edge Functions"**
   - Или перейдите по ссылке:
     ```
     https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
     ```

2. **Выберите функцию `sync-google-sheets`:**
   - Найдите функцию в списке
   - Нажмите на неё

3. **Откройте вкладку "Logs":**
   - В верхней части страницы функции найдите вкладку **"Logs"**
   - Нажмите на неё

### Способ 2: Через Logs & Analytics (общие логи)

1. **Откройте Logs & Analytics:**
   - В левом меню нажмите на **"Logs"** или **"Logs & Analytics"**
   - Или перейдите по ссылке:
     ```
     https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/logs
     ```

2. **Выберите Edge Functions:**
   - В левом меню в разделе "COLLECTIONS" найдите **"Edge Functions"**
   - Нажмите на него

3. **Выберите функцию `sync-google-sheets`:**
   - Найдите функцию в списке
   - Нажмите на неё

## 🔍 Что искать в логах

### После обновления функции (с детальным логированием):

1. **Логи первых 3 строк:**
   - `Row 1 first 3 columns:` - показывает первые 3 колонки для первой строки
   - `Row 2 first 3 columns:` - показывает первые 3 колонки для второй строки
   - `Row 3 first 3 columns:` - показывает первые 3 колонки для третьей строки

2. **Информация о парсинге:**
   - `Parsed X columns for row Y` - показывает, сколько колонок распознано

3. **Ошибки с детальной информацией:**
   - `Missing source_id for row X:` - детальная информация о проблемной строке
   - Показывает: `col0`, `col0_trimmed`, `col0_length`, `columnsCount`

4. **Общая информация:**
   - `Found X questions` - сколько строк найдено в CSV
   - `Sync completed:` - итоговый результат синхронизации

### Примеры сообщений в логах:

**Успешный парсинг:**
```
Row 1 first 3 columns: { col0: "GS-1", col1: "1", col2: "medium", col0_trimmed: "GS-1", col0_length: 4, ... }
Parsed 32 columns for row 1
```

**Проблема с source_id:**
```
Missing source_id for row 2: { rowNumber: 2, columnsCount: 32, firstColumn: "", firstColumnTrimmed: "", firstColumnLength: 0, ... }
```

**Проблема с парсингом:**
```
Parsed 0 columns for row 5
```

## 📊 Фильтры в логах

1. **По времени:**
   - "Last hour" - последний час
   - "Last 3 hours" - последние 3 часа
   - "Last 24 hours" - последние 24 часа

2. **По уровню:**
   - "All" - все логи
   - "Error" - только ошибки
   - "Warning" - только предупреждения
   - "Info" - только информационные сообщения

3. **Поиск:**
   - Используйте поле "Search events" для поиска по тексту
   - Например: `source_id`, `Missing`, `Row 1`, и т.д.

## 🔗 Полезные ссылки

- **Логи функции:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/logs
- **Общие логи:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/logs
- **Edge Functions:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
- **Настройки функции:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/sync-google-sheets/settings

## 💡 Совет

После синхронизации:
1. Откройте логи функции
2. Найдите сообщения с `Row X first 3 columns:`
3. Проверьте, что `col0` содержит `source_id` (например, "GS-1", "GS-2")
4. Если `col0` пустой или `undefined`, проверьте структуру таблицы Google Sheets

