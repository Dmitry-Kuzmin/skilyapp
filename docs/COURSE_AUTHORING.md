# Руководство по созданию уроков курса Skily

Документ для Claude и других агентов. Прочти целиком перед тем как создавать или редактировать уроки.

---

## 1. Общая концепция

Курс строится по принципу **микро-обучения с проверкой**: небольшие блоки теории чередуются с квизами по 2–3 вопроса. Квизы — не финальный тест в конце урока, а момент закрепления в середине. Это дольше держит внимание и лучше работает с памятью.

**Целевой объём урока:**
- Теория: **8–15 шагов** (не бояться 20, если тема большая)
- Квизы: **6–12 вопросов**, вставленных группами по 2–3 внутри теории
- Общий паттерн: `[3 теории] → [2 квиза] → [3 теории] → [2 квиза] → [3 теории] → [2 квиза]`

---

## 2. Структура БД

### Таблицы

```
course_modules      — модуль (напр. "Módulo 1: Tipos de vehículos")
  └── course_lessons — урок (напр. "1.2.5 Ciclomotor y motocicleta")
        └── lesson_steps — шаги урока (theory / quiz)
```

### `course_lessons`
| Поле | Тип | Описание |
|------|-----|---------|
| `id` | uuid | первичный ключ |
| `module_id` | uuid | FK → course_modules |
| `code` | text | `'1.2.5'`, `'1.2.4.1'` |
| `title_es` | text | название на испанском |
| `title_ru` | text | название на русском |
| `order_index` | int | порядок в модуле |
| `xp_reward` | int | XP за прохождение (обычно 25–50) |
| `is_premium` | bool | false для большинства уроков |

### `lesson_steps`
| Поле | Тип | Описание |
|------|-----|---------|
| `id` | uuid | первичный ключ (авто) |
| `lesson_id` | uuid | FK → course_lessons |
| `order_index` | int | порядок шага в уроке (1, 2, 3…) |
| `type` | text | `'theory'` или `'quiz'` |
| `content_es` | jsonb | контент на испанском |
| `content_ru` | jsonb | контент на русском |

---

## 3. Формат `content_es` / `content_ru`

### Theory step

```json
{
  "blocks": [
    { "type": "...", ... },
    { "type": "...", ... }
  ]
}
```

> **Важно:** heading-only шаги выглядят пустыми в UI (показывается только заголовок и кнопка "Добавить картинку"). Всегда объединяй `heading` с первым контент-блоком (`callout`, `text`, `table` и т.д.) в один шаг.

---

### Quiz step — два типа

#### ✅ Тип 1: DGT-вопрос (предпочтительно)

Хранит только ссылку на вопрос в `questions_new`. Текст, варианты, картинка подтягиваются из БД автоматически при каждом открытии урока — обновления применяются мгновенно. Позволяет вести статистику ошибок по каждому вопросу.

```json
// content_es:
{ "question_id": "2e4486db-2215-4283-aee6-c07297f4b267", "explanation": "Объяснение на испанском." }

// content_ru:
{ "question_id": "2e4486db-2215-4283-aee6-c07297f4b267", "explanation": "Объяснение на русском." }
```

- `question_id` — одинаковый в обоих полях (UUID из `questions_new`)
- `explanation` — разный: `content_es.explanation` показывается при языке ES, `content_ru.explanation` — при RU
- `correct` **не нужен** — берётся из `answer_options.is_correct`
- Картинку брать **не нужно** — берётся из `questions_new.image_url`

#### Тип 2: Авторский вопрос (только если нет подходящего DGT)

Полный inline-контент. Используется когда нет реального DGT-вопроса на нужную тему.

```json
// content_es:
{
  "text": "Текст вопроса на испанском",
  "options": ["Вариант A", "Вариант B", "Вариант C"],
  "correct": 1,
  "explanation": "Объяснение на испанском."
}

// content_ru:
{
  "text": "Текст вопроса на русском",
  "options": ["Вариант А", "Вариант Б", "Вариант В"],
  "correct": 1,
  "explanation": "Объяснение на русском."
}
```

**Важно:** `correct` — это **0-индекс** (0, 1 или 2). В БД `answer_options.position` — 1-индекс. Перевод: `correct = position - 1`.

---

## 4. Типы блоков (blocks)

### `callout` — выделенный блок

```json
{
  "type": "callout",
  "variant": "info",
  "title": "Заголовок (опционально)",
  "text": "Текст блока"
}
```

Варианты (`variant`):
- `"info"` — синий, для определений из закона (слово в слово)
- `"warning"` — жёлтый, для ловушек экзамена (`"¡Ojo al examen!"`)
- `"danger"` — красный, для фактов, которые ВСЕГДА выходят на экзамене
- `"tip"` — зелёный, для мнемоник и трюков запоминания

---

### `table` — таблица

```json
{
  "type": "table",
  "headers": ["Колонка 1", "Колонка 2", "Колонка 3"],
  "rows": [
    ["Значение A", "Значение B", "Значение C"],
    ["Значение D", "Значение E", "Значение F"]
  ],
  "caption": "Подпись под таблицей (опционально)"
}
```

---

### `list` — список

```json
{
  "type": "list",
  "style": "check",
  "title": "Заголовок списка (опционально)",
  "items": [
    "Пункт 1",
    "Пункт 2"
  ]
}
```

Стили (`style`):
- `"check"` — ✅ для того что разрешено / обязательно
- `"cross"` — ❌ для того что запрещено / исключается
- `"arrow"` — → для перечислений без оценки

---

### `card-grid` — карточки в сетке

```json
{
  "type": "card-grid",
  "cols": 2,
  "cards": [
    {
      "icon": "🚗",
      "title": "Заголовок карточки",
      "description": "Описание"
    },
    {
      "icon": "🚜",
      "title": "Другая карточка",
      "description": "Её описание"
    }
  ]
}
```

Используется для попарного сравнения (напр. Ciclomotor vs Motocicleta, разрешено vs запрещено).

---

### `stats` — числовые показатели

```json
{
  "type": "stats",
  "stats": [
    {"value": "45", "label": "km/h máx", "note": "límite absoluto por construcción"},
    {"value": "15", "label": "años mín.", "note": "edad mínima para permiso AM"},
    {"value": "50 cc", "label": "cilindrada", "note": "límite del ciclomotor"}
  ]
}
```

Используется для ключевых цифр — скоростей, возрастов, масс, объёмов.

---

### `heading` — заголовок раздела

```json
{
  "type": "heading",
  "text": "Текст заголовка"
}
```

> Heading никогда не должен быть единственным блоком в шаге — всегда добавляй хотя бы один контент-блок следом в тот же step.

---

### `text` — обычный абзац

```json
{
  "type": "text",
  "text": "Просто текст без специального оформления."
}
```

---

## 5. Структура идеального урока

Пример для урока из 18 шагов (10 теории + 8 квизов):

```
Step 1  — theory: heading + callout info (определение)
Step 2  — theory: table сравнения + stats
Step 3  — theory: callout danger + callout warning (ловушки)
Step 4  — quiz: DGT question_id
Step 5  — quiz: DGT question_id
Step 6  — theory: heading + callout info (правила circulation)
Step 7  — theory: list cross + card-grid (запреты и исключения)
Step 8  — theory: list check + stats (обязательное оборудование)
Step 9  — quiz: DGT question_id
Step 10 — quiz: DGT question_id
Step 11 — quiz: авторский вопрос (важный факт из теории)
Step 12 — theory: heading + callout info (разрешения и permisos)
Step 13 — theory: list arrow + callout warning (документация)
Step 14 — theory: callout tip (мнемоника для запоминания)
Step 15 — quiz: DGT question_id
Step 16 — quiz: DGT question_id
Step 17 — quiz: авторский вопрос
Step 18 — quiz: авторский вопрос
```

---

## 6. Правила контента

### Теория

1. **Callout `info` = определение из закона** — цитировать максимально близко к тексту регламента. Никакой отсебятины.
2. **Callout `warning` = "¡Ojo al examen!"** — типичная ловушка, которую выбирают неправильно.
3. **Callout `danger` = красный факт** — то, что ГАРАНТИРОВАННО выходит на экзамене, часто неочевидно.
4. **Callout `tip` = мнемоника** — аббревиатура, ассоциация, правило-трюк. Конкретная, запоминаемая.
5. **Table** — всегда когда есть 2+ объекта для сравнения или цифры с условиями.
6. **Stats** — для цифр, которые часто спрашивают: скорости, возрасты, массы, мощности.
7. **Card-grid** — для бинарных сравнений (✅ разрешено / ❌ запрещено, тип А / тип B).
8. **List arrow** — перечисление типов/подтипов без оценки.
9. **List check/cross** — что можно/нельзя делать конкретно.

### Квизы

1. **Приоритет — реальные вопросы DGT** из таблицы `questions_new`. Формат: `question_id` + `explanation`. Картинка/текст/варианты берутся из БД автоматически.
2. **Вопросы с картинкой можно использовать** — `image_url` подтягивается из `questions_new.image_url` при рендере. Избегай только вопросов вида "¿Circula correctamente este...?" где без контекста картинки невозможно понять о чём речь.
3. **Авторские вопросы** — только когда реальных DGT-вопросов на тему недостаточно. Формат `{text, options, correct, explanation}` в обоих языках.
4. **Индексация DGT → JSON**: в БД `answer_options.position` начинается с 1 (авт. квизы: `correct = position - 1`). Для DGT-вопросов `correct` не нужен — берётся из `is_correct`.
5. **Объяснение** (`explanation`) — обязательно, подробное. Объясняет ПОЧЕМУ именно этот ответ.
6. **Статистика**: поскольку quiz-шаги ссылаются на `question_id`, в будущем можно агрегировать ошибки по каждому вопросу прямо в `questions_new` (difficulty score, error rate и т.д.).

---

## 7. SQL-миграции — шаблон

### Создание нового урока

```sql
-- Файл: supabase/migrations/YYYYMMDDHHMMSS_lesson_X_X_X_название.sql
-- Module 1 UUID: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.X.X',
     'Título en español',
     'Название на русском',
     <порядковый номер>, 40, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory: heading + callout ───────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[{"type":"heading","text":"Заголовок ES"},{"type":"callout","variant":"info","title":"Título","text":"Texto..."}]}',
    '{"blocks":[{"type":"heading","text":"Заголовок RU"},{"type":"callout","variant":"info","title":"Заголовок","text":"Текст..."}]}'
  );

  -- ── Step N · Quiz: DGT question_id (preferred) ───────────────────────────
  -- Текст, варианты и картинка берутся из questions_new + answer_options автоматически.
  -- explanation — пишем вручную на обоих языках.
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, N, 'quiz',
    '{"question_id":"<full-uuid>","explanation":"Explicación en español."}',
    '{"question_id":"<full-uuid>","explanation":"Объяснение на русском."}'
  );

  -- ── Step M · Quiz: authored (only if no suitable DGT question) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, M, 'quiz',
    '{"text":"Pregunta ES...","options":["A","B","C"],"correct":1,"explanation":"..."}',
    '{"text":"Вопрос RU...","options":["А","Б","В"],"correct":1,"explanation":"..."}'
  );

END $$;
```

### Расширение существующего урока (добавление шагов)

```sql
DO $$
DECLARE
  l_id uuid := '<lesson-uuid>';
BEGIN

  -- 1. Освободить место, сдвинув существующие шаги
  UPDATE lesson_steps
  SET order_index = order_index + <N>
  WHERE lesson_id = l_id AND order_index >= <первый сдвигаемый>;

  -- 2. Вставить новые шаги на освободившиеся позиции
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, <позиция>, 'theory', '...', '...');

END $$;
```

---

## 8. Как найти DGT-вопросы для урока

### Шаг 1: найти вопросы по теме

```sql
SELECT q.id, q.question_es, q.image_url,
       ao.position, ao.text_es, ao.is_correct
FROM questions_new q
JOIN answer_options ao ON ao.question_id = q.id
WHERE q.question_es ILIKE '%ключевое слово%'
  AND q.country = 'es'
ORDER BY q.id, ao.position;
```

### Шаг 2: получить русские переводы для выбранных вопросов

```sql
SELECT q.id, q.question_ru, ao.position, ao.text_ru, ao.is_correct
FROM questions_new q
JOIN answer_options ao ON ao.question_id = q.id
WHERE q.id IN ('<uuid1>', '<uuid2>', ...)
ORDER BY q.id, ao.position;
```

### Что делать с результатом

- Запомни `question_id` (UUID) и `image_url` (для справки, в SQL не нужен — берётся автоматически)
- Определи правильный ответ: `is_correct = true` → это он
- Напиши `explanation` на ES и RU вручную — объясни ПОЧЕМУ именно этот ответ
- Вставь в quiz step как `{"question_id": "...", "explanation": "..."}`

**Применение через CLI:**
```bash
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/supabase db query --linked --file supabase/migrations/<файл>.sql
```

---

## 9. Важные UUID модулей

| Модуль | UUID |
|--------|------|
| Módulo 1 — Tipos y definiciones | `bef4ce90-5902-49d1-a082-173faeefda12` |

---

## 10. Предупреждения

- **Одинарные кавычки** в тексте внутри SQL-строки → экранировать как `''`.
  Пример: `it''s` вместо `it's` внутри `VALUES ('...')`.

- **Не использовать** `supabase db push` — он применяет ВСЕ локальные миграции и требует Docker.
  Правильно: `supabase db query --linked --file <файл>`.

- **Не трогать** `src/integrations/supabase/types.ts` — это авто-генерация.

- **Перед применением** проверить файл на наличие одинарных кавычек в текстовых значениях.

- **Heading-only шаги** выглядят пустыми в UI — всегда объединяй heading с первым контент-блоком в один step.
