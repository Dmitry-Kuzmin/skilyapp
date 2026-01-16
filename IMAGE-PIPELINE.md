# 🎯 DGT Image Pipeline - Полная Система

## Обзор процесса

```
1. ГЕНЕРАЦИЯ       2. ВАЛИДАЦИЯ         3. ЗАГРУЗКА
   (AI)              (Ты)                (Автомат)
     ↓                 ↓                     ↓
  [Gemini]  →  [Tinder UI]  →  [Supabase Storage]
```

---

## Шаг 1: Генерация изображений 🎨

### Команда для тестового запуска (10 картинок):

```bash
npm run generate:images:test
```

Это **dry-run** (без реальной генерации) — посмотришь, что будет происходить.

### Команда для реальной генерации:

```bash
npm run generate:images
```

**Что делает:**
- Сканирует все enriched файлы
- Находит external_id
- Скачивает оригиналы из PracticaVial
- Анализирует через Gemini Vision
- Генерирует новые изображения через Gemini Imagen
- Сохраняет в `data/generated-images/`

**Checkpoint система:**
- Можешь прервать (Ctrl+C) и продолжить позже
- Прогресс сохраняется в `data/image-gen-checkpoint.json`
- Пропускает уже сгенерированные

**Стоимость:**
- Gemini Free Tier: 15 запросов/минуту
- ~1 час на 100 изображений

---

## Шаг 2: Валидация (Tinder UI) 🔥

### Запуск:

```bash
npm run validator
```

Откроется на **http://localhost:3030**

### Процесс:

1. **Сравнить** оригинал (слева) vs AI (справа)
2. **Решить:**
   - **Y** — ✅ Одобрить
   - **N** — ❌ Отклонить
   - **R** — 🔄 Перегенерировать (+ промпт)
   - **→** — ⏭️ Пропустить

### Твои решения сохраняются:

```json
{
  "approved": ["id1", "id2", ...],
  "rejected": ["id3", ...],
  "toRegenerate": [
    { "id": "id5", "additionalPrompt": "Добавь велосипедиста" }
  ]
}
```

Файл: `data/validation-decisions.json`

---

## Шаг 3: Загрузка в Supabase 🚀

### После валидации:

```bash
node scripts/upload-approved-images.js
```

**Что делает:**
- Читает `validation-decisions.json`
- Берет только `approved`
- Загружает в Supabase Storage
- Обновляет `questions` таблицу (меняет `image_url`)

**SQL Update:**
```sql
UPDATE questions 
SET image_url = 'https://your-cdn/id.png'
WHERE external_id = 'id';
```

---

## Бонус: Перегенерация 🔄

Для тех, которые отмечены "To Regenerate":

```bash
node scripts/regenerate-with-prompts.js
```

Он возьмет additional_prompt и добавит к оригинальному промпту.

---

## Структура файлов

```
data/
├── parsed/
│   ├── topic-01/
│   │   └── *-enriched.json     # Твои вопросы (с external_id)
│   └── ...
├── generated-images/
│   ├── abc-123.png              # AI версия
│   ├── def-456.png
│   └── originals/
│       ├── abc-123_original.jpg # Оригинал
│       └── def-456_original.jpg
├── image-gen-checkpoint.json    # Прогресс генерации
└── validation-decisions.json    # Твои решения

scripts/
├── generate-images-batch.js     # Генератор
└── ...

validator-server.js              # API Server
validator-ui.html                # UI Frontend
```

---

## Быстрые команды

```bash
# Сгенерировать 50 тестовых (для пробы)
npm run generate:images -- --limit=50

# Запустить UI валидатор
npm run validator

# Dry-run (показать что будет сгенерировано)
npm run generate:images:test
```

---

## FAQ

**Q: Сколько времени это займет?**
- Генерация: ~1 час на 100 картинок
- Валидация: ~1-2 секунды на картинку (за час можно 1000+)

**Q: А если у меня кончится Free Tier?**
- Используй новый API ключ
- Или подключи платный план ($0.002 за картинку)

**Q: Могу ли я валидировать параллельно генерации?**
- **Да!** Запусти генератор в одном терминале, валидатор в другом
- Валидатор покажет только те, что уже сгенерированы

**Q: Как откатить решение?**
- Просто удали ID из `validation-decisions.json`
- Перезагрузи валидатор

---

## Контроль качества

После загрузки в Supabase, проверь:

```sql
SELECT COUNT(*) as cnt, 
       image_url LIKE '%supabase%' as has_new_image
FROM questions 
WHERE external_id IS NOT NULL
GROUP BY has_new_image;
```

Должно быть:
- `has_new_image = true` — количество = `approved.length`
- `has_new_image = false` — оставшиеся (не валидированы или отклонены)

---

💡 **Pro Tip**: Запусти первые 50, провалидируй, посмотри на % одобрения. Если < 70% — подправь промпт в `generate-images-batch.js` (функция `STYLE_MASTER_PROMPT`).
