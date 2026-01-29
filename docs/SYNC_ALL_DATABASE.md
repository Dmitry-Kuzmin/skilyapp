# 🔄 Полная синхронизация данных в Supabase

## Описание

Скрипт `sync-all-to-db.js` обеспечивает полную синхронизацию всех локальных данных (JSON файлы) в базу данных Supabase.

## Что делает скрипт:

✅ **Обновляет тексты вопросов** — синхронизирует question_text, explanation  
✅ **Обновляет все ответы** — синхронизирует answer_options  
✅ **Загружает изображения** — загружает картинки в Supabase Storage  
✅ **Обновляет метаданные** — синхронизирует topic_id, test_id, difficulty  
✅ **Применяет водяные знаки** — использует обработчик изображений (если настроен)  

## Использование

### Вариант 1: Через UI (рекомендуется)

1. Открой **Mission Control** в админ-панели
2. Выбери любой тест/вопрос
3. В правом редакторе нажми кнопку **"Sync All DB"** (фиолетовая кнопка)
4. Подтверди действие
5. Наблюдай прогресс в реальном времени через toast-уведомления

### Вариант 2: Через командную строку

```bash
npm run sync:all
```

Или напрямую:

```bash
node scripts/sync-all-to-db.js
```

### Вариант 3: Через API (программно)

```javascript
const eventSource = new EventSource('http://localhost:3030/api/db/sync-all');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data.message);
  
  if (data.type === 'complete') {
    console.log('Sync complete:', data.success);
    eventSource.close();
  }
};
```

## Требования

- ✅ Установленные переменные окружения `.env`:
  - `VITE_SUPABASE_URL` или `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (предпочтительно) или `VITE_SUPABASE_ANON_KEY`

- ✅ Структура данных:
  - Локальные JSON файлы в `data/parsed/` с суффиксом `-enriched.json`
  - Таблицы в Supabase: `questions_new`, `answer_options`

## Логика работы

1. **Поиск файлов** — рекурсивно находит все `*-enriched.json` в `data/parsed/`
2. **Обработка изображений** — проверяет наличие локальных картинок и загружает в Storage
3. **Upsert вопросов** — обновляет/создает записи в `questions_new` по `id`
4. **Upsert ответов** — обновляет/создает записи в `answer_options` по `id`
5. **Статистика** — выводит итоговый отчет: успешно/пропущено/ошибки

## Примеры вывода

```
🚀 ПОЛНАЯ СИНХРОНИЗАЦИЯ: JSON → Supabase
==========================================

🔍 Searching for enriched JSON files...
✅ Found 344 files

[1/344] Processing: topic-03_test-004-enriched.json
📝 Syncing: 03_004_001
   ✅ Question updated
   ✅ 3 answers updated

[2/344] Processing: topic-03_test-005-enriched.json
📝 Syncing: 03_005_001
   ⏭️  Image already exists: 03_005_001.webp
   ✅ Question updated
   ✅ 3 answers updated

==========================================
✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА
==========================================

📊 Статистика:
   Всего:     344
   Успешно:   340 ✅
   Пропущено: 2 ⏭️
   Ошибки:    2 ❌
```

## Безопасность

⚠️ **Важно:** Скрипт использует `upsert` (insert or update), поэтому:

- ✅ Безопасно запускать многократно
- ✅ Не удаляет существующие данные
- ✅ Обновляет только указанные поля
- ⚠️ Требует Service Role Key для полного доступа

## Troubleshooting

### Ошибка "Invalid API key"

```bash
❌ Missing Supabase credentials
```

**Решение:** Проверь `.env` файл и убедись, что ключи не содержат лишних пробелов:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # БЕЗ пробелов в конце!
```

### Ошибка "permission denied"

**Решение:** RLS (Row Level Security) блокирует запись. Используй **Service Role Key**, а не Anon Key.

### Медленная работа

**Решение:** Скрипт добавляет задержку 100ms между вопросами, чтобы не перегружать БД. Это нормально для ~6000 вопросов (~10 минут).

## API Эндпоинт

### `POST /api/db/sync-all`

**Формат:** Server-Sent Events (SSE)

**Response:**

```typescript
// Лог-сообщение
{ type: 'log', message: string }

// Ошибка
{ type: 'error', message: string }

// Завершение
{ 
  type: 'complete', 
  success: boolean, 
  message: string 
}
```

## Связанные файлы

- 📄 `scripts/sync-all-to-db.js` — главный скрипт
- 🌐 `validator-server.js` — API эндпоинт `/api/db/sync-all`
- 🎨 `src/components/admin/mission-control/MissionEditor.tsx` — UI кнопка
- 📦 `package.json` — npm скрипт `sync:all`

---

**Автор:** Antigravity AI  
**Дата:** 2026-01-28  
**Версия:** 1.0.0
