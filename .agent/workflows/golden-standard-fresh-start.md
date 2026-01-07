---
description: Переход на Golden Standard архитектуру вопросов
---

# 🏆 Fresh Start: Создание базы испанских вопросов с нуля

Этот workflow описывает процесс полной замены старой структуры данных на новую масштабируемую архитектуру Golden Standard.

## 📐 Архитектура Golden Standard

### Структура данных (JSON):
```json
{
  "topic_id": 10,
  "question_number": 1,
  "category": "B",
  "question": {
    "es": "¿Qué significa...?",
    "en": "What does...",
    "ru": "Что означает..."
  },
  "answers": [
    { "id": "a", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": false },
    { "id": "b", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": true },
    { "id": "c", "text": { "es": "...", "en": "...", "ru": "..." }, "is_correct": false }
  ],
  "explanation": { "es": "...", "en": "...", "ru": "..." },
  "image_url": "...",
  "source": "practicalvial"
}
```

### Структура БД:
- **questions_golden** (parent) - вопросы
- **answers_golden** (child) - варианты ответов (3 на вопрос)

---

## ⚡ Быстрый старт (Автоматический конвейер)

### 🏭 Полностью автоматический процесс

Если у тебя уже есть JSON с вопросами от браузерного парсера:

// turbo
```bash
# Автоматический режим (без подтверждений)
node scripts/pipeline.js data/raw-questions.json --auto
```

Или интерактивный режим (с подтверждением каждого этапа):

```bash
node scripts/pipeline.js data/raw-questions.json
```

Конвейер автоматически выполнит:
1. ✅ Валидация JSON
2. 🤖 AI обработка (перевод + объяснения через Gemini)
3. 📦 Импорт в Supabase

---

## 🛠️ Ручной процесс (Пошагово)

### 1. Применить миграцию БД

// turbo
```bash
# Через Supabase CLI (рекомендуется)
npx supabase db push
```

Или вручную через SQL Editor в Supabase Dashboard:
- Открыть файл `supabase/migrations/20260106000000_create_golden_standard_tables.sql`
- Скопировать содержимое
- Выполнить в SQL Editor

### 2. Очистить старые данные (необязательно)

Если у вас уже есть испанские вопросы в старых таблицах:

```bash
# Проверка (dry-run)
node scripts/clean-spanish-questions.js --dry-run

# Реальное удаление (НЕОБРАТИМО!)
node scripts/clean-spanish-questions.js --force
```

### 3. Подготовить JSON данные

Используйте AI генератор для создания вопросов в Golden формате:

```bash
# Обработка сырых вопросов через Gemini AI
node scripts/digitize-explanations-golden.js data/raw-questions.json
```

Результат будет в том же файле, но в Golden формате.

### 4. Импортировать вопросы

```bash
# Проверка перед импортом (dry-run)
node scripts/import-golden.js data/questions-golden.json --dry-run

# Реальный импорт с автоподтверждением
node scripts/import-golden.js data/questions-golden.json --yes
```

---

## 🔍 Валидация данных

Скрипт `import-golden.js` автоматически проверяет:
- ✅ Наличие обязательных полей (`question.es`, `category`, `answers[]`)
- ✅ Ровно 3 ответа на вопрос
- ✅ Ровно 1 правильный ответ (`is_correct: true`)
- ✅ Корректные `id` ответов (a, b, c)

---

## 🛠️ Скрипты

| Скрипт | Назначение |
|--------|-----------|
| `clean-spanish-questions.js` | Удаляет испанские вопросы из legacy таблиц |
| `digitize-explanations-golden.js` | AI обработка: перевод + объяснения в Golden формате |
| `import-golden.js` | Импорт Golden JSON в БД (2 таблицы) |

---

## 📝 Примеры

### Создание вопроса вручную

1. Создайте файл `data/my-questions.json`:
```json
[
  {
    "topic_id": "4ee11103-1725-4869-96b1-3bfa1236a6b2",
    "question_number": 1,
    "category": "B",
    "question": {
      "es": "¿Está permitido circular con un vehículo sin silenciador?",
      "en": "Is it allowed to drive a vehicle without a muffler?",
      "ru": "Разрешено ли ездить на автомобиле без глушителя?"
    },
    "answers": [
      {
        "id": "a",
        "text": {
          "es": "Sí, en motocicletas.",
          "en": "Yes, on motorcycles.",
          "ru": "Да, на мотоциклах."
        },
        "is_correct": false
      },
      {
        "id": "b",
        "text": {
          "es": "No, está prohibido.",
          "en": "No, it is prohibited.",
          "ru": "Нет, это запрещено."
        },
        "is_correct": true
      },
      {
        "id": "c",
        "text": {
          "es": "Sí, en vías interurbanas.",
          "en": "Yes, on intercity roads.",
          "ru": "Да, на междугородних дорогах."
        },
        "is_correct": false
      }
    ],
    "explanation": {
      "es": "Está prohibido circular sin silenciador...",
      "en": "It is prohibited to drive without a muffler...",
      "ru": "Запрещено ездить без глушителя..."
    },
    "image_url": null,
    "source": "manual"
  }
]
```

2. Импортируйте:
```bash
node scripts/import-golden.js data/my-questions.json --yes
```

### Проверка импорта

После импорта проверьте данные в Supabase:

```sql
-- Количество вопросов
SELECT COUNT(*) FROM questions_golden;

-- Количество ответов
SELECT COUNT(*) FROM answers_golden;

-- Вопросы с ответами
SELECT 
  q.id,
  q.text_es,
  json_agg(json_build_object(
    'id', a.answer_id,
    'text', a.text_es,
    'is_correct', a.is_correct
  )) as answers
FROM questions_golden q
LEFT JOIN answers_golden a ON q.id = a.question_id
GROUP BY q.id
LIMIT 5;
```

---

## ⚠️ Важные замечания

1. **Миграция обратно несовместима**: Legacy данные (плоский формат `option_a_es`) не будут работать с новой системой.
2. **Используйте UUID для topic_id**: Берите из таблицы `topics` в Supabase.
3. **Dry-run всегда первым шагом**: Всегда проверяйте `--dry-run` перед реальным импортом.
4. **Резервное копирование**: Перед очисткой старых данных сделайте экспорт через Supabase Dashboard.

---

## 🎯 Следующие шаги

После успешного импорта:
1. Обновить UI для чтения из `questions_golden` + `answers_golden`
2. Создать view для совместимости со старым кодом (опционально)
3. Удалить legacy код работы с плоскими полями `option_a/b/c`
