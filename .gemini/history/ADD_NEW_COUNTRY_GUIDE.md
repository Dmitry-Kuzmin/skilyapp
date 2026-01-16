# 🌍 Руководство по добавлению новой страны

## 📋 Общий процесс

### Шаг 1: Анализ данных новой страны

1. **Найди источник данных:**
   - GitHub репозитории (как для России)
   - Официальные сайты
   - API (если есть)
   - CSV/JSON файлы

2. **Изучи структуру:**
   - Формат вопросов (билеты/темы/категории)
   - Количество вопросов
   - Языки (нужны ли переводы?)
   - Изображения (где хранятся?)
   - Дополнительные данные (знаки, штрафы, разметка)

3. **Определи отличия от существующих стран:**
   - Структура билетов/тестов
   - Категории прав
   - Формат ответов

---

## 🗄️ Шаг 2: Создание таблиц

### Вариант А: Похожая структура (как Россия)

Если структура похожа на ПДД России (билеты, категории):

1. **Создай миграцию:**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_[country_code]_tables.sql

-- Таблица вопросов
CREATE TABLE IF NOT EXISTS public.[country_code]_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  ticket_number INTEGER,
  question_number INTEGER,
  question_text TEXT NOT NULL,  -- Только основной язык
  image_url TEXT,
  explanation TEXT,
  topics TEXT[],
  -- ... остальные поля
);

-- Таблица ответов
CREATE TABLE IF NOT EXISTS public.[country_code]_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.[country_code]_questions(id),
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  position INTEGER NOT NULL
);
```

2. **Создай Storage bucket:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  '[country_code]',
  '[country_code]',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);
```

### Вариант Б: Используй существующую структуру (как DGT)

Если структура похожа на DGT (темы, без билетов):

- Используй таблицу `questions_new` с полем `country = '[COUNTRY_CODE]'`
- Добавь переводы в `question_ru`, `question_es`, `question_en` если нужно

---

## 📥 Шаг 3: Создание скрипта импорта

### Шаблон скрипта:

```javascript
// scripts/import-[country-code].js

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Функция загрузки изображения
async function uploadImageToStorage(imagePath, repoPath) {
  // ... (скопируй из import-pdd-russia.js)
}

// Функция импорта вопроса
async function importQuestion(questionData, repoPath) {
  // Адаптируй под структуру данных новой страны
}

// Главная функция
async function main() {
  const repoPath = process.argv[2];
  // ... импорт данных
}

main().catch(console.error);
```

### Добавь в package.json:

```json
{
  "scripts": {
    "import:[country-code]": "node scripts/import-[country-code].js"
  }
}
```

---

## 🎨 Шаг 4: Добавление в админку

### 1. Добавь страну в таблицу countries:

```sql
INSERT INTO public.countries (code, name_ru, name_en, flag_emoji, default_language)
VALUES (
  '[COUNTRY_CODE]',
  'Название страны (RU)',
  'Country Name (EN)',
  '🏳️',
  'ru'  -- или другой язык
);
```

### 2. Создай страницу админки:

```typescript
// src/pages/admin/Admin[CountryCode].tsx

export function Admin[CountryCode]() {
  // Скопируй структуру из AdminPDDRussia.tsx
  // Адаптируй под структуру данных новой страны
}
```

### 3. Добавь в меню:

```typescript
// src/components/admin/AdminLayout.tsx

{
  id: "[country-code]",
  label: "Название страны",
  icon: Flag,
  path: "/admin/[country-code]",
}
```

### 4. Добавь роут:

```typescript
// src/components/AppRoutes.tsx

const Admin[CountryCode] = lazy(() =>
  import("../pages/admin/Admin[CountryCode]").then((module) => ({ default: module.Admin[CountryCode] }))
);

// В Routes:
<Route path="[country-code]" element={
  <Suspense fallback={<PageSkeleton />}>
    <Admin[CountryCode] />
  </Suspense>
} />
```

---

## 🚀 Шаг 5: Фронтенд для пользователей

### 1. Компонент выбора страны:

```typescript
// src/components/CountrySelector.tsx

export function CountrySelector() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('DGT');
  
  // Загрузи страны из БД
  // Покажи выбор при первом входе
  // Сохрани выбор в localStorage/профиле
}
```

### 2. Адаптация существующих компонентов:

- **Тесты:** Используй разные таблицы в зависимости от выбранной страны
- **Билеты:** Для России - билеты 1-40, для DGT - темы
- **Вопросы:** Загружай из соответствующих таблиц

### 3. Роутинг:

```typescript
// Добавь параметр страны в URL или контекст
// /tests?country=PDD_RUSSIA
// /tests?country=DGT
```

---

## 📊 Шаг 6: Унификация данных (опционально)

Если хочешь единый интерфейс для всех стран:

### Создай view/функцию:

```sql
CREATE OR REPLACE VIEW unified_questions AS
SELECT 
  'DGT' as country,
  id,
  question_ru as question_text,
  -- ...
FROM questions_new
WHERE country = 'DGT'

UNION ALL

SELECT 
  'PDD_RUSSIA' as country,
  id,
  question_text,
  -- ...
FROM pdd_russia_questions;
```

---

## ✅ Чеклист добавления новой страны

- [ ] Найден источник данных
- [ ] Проанализирована структура данных
- [ ] Созданы таблицы (миграция)
- [ ] Создан Storage bucket
- [ ] Написан скрипт импорта
- [ ] Протестирован импорт
- [ ] Добавлена страна в таблицу `countries`
- [ ] Создана страница админки
- [ ] Добавлен пункт меню
- [ ] Добавлен роут
- [ ] Создан компонент выбора страны (для пользователей)
- [ ] Адаптированы компоненты тестов/вопросов
- [ ] Обновлена документация

---

## 🎯 Примеры стран для добавления

### Украина (ПДД України)
- **Структура:** Похожа на Россию (билеты)
- **Язык:** Украинский
- **Источник:** Искать на GitHub или официальный сайт

### Беларусь (ПДД Беларуси)
- **Структура:** Похожа на Россию
- **Язык:** Русский/Белорусский
- **Источник:** Искать на GitHub

### Германия (StVO)
- **Структура:** Может отличаться
- **Язык:** Немецкий (нужны переводы?)
- **Источник:** Официальный сайт

### Франция (Code de la route)
- **Структура:** Может отличаться
- **Язык:** Французский
- **Источник:** Официальный сайт

---

## 📝 Шаблон миграции для новой страны

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_[country_code]_tables.sql

-- 1. Таблица вопросов
CREATE TABLE IF NOT EXISTS public.[country_code]_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  -- Адаптируй поля под структуру страны
  question_text TEXT NOT NULL,
  image_url TEXT,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Таблица ответов
CREATE TABLE IF NOT EXISTS public.[country_code]_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.[country_code]_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(question_id, position)
);

-- 3. Индексы
CREATE INDEX IF NOT EXISTS idx_[country_code]_questions_source ON public.[country_code]_questions(source_id);

-- 4. RLS Policies
ALTER TABLE public.[country_code]_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.[country_code]_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view [country_code] questions"
  ON public.[country_code]_questions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage [country_code] questions"
  ON public.[country_code]_questions FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  '[country_code]',
  '[country_code]',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies
CREATE POLICY "Anyone can view [country_code] images"
ON storage.objects FOR SELECT USING (bucket_id = '[country_code]');

-- 7. Добавь страну в таблицу countries
INSERT INTO public.countries (code, name_ru, name_en, flag_emoji, default_language)
VALUES (
  '[COUNTRY_CODE]',
  'Название (RU)',
  'Name (EN)',
  '🏳️',
  'ru'
)
ON CONFLICT (code) DO NOTHING;
```

---

## 🚀 Быстрый старт для новой страны

1. **Скопируй структуру России:**
   ```bash
   cp supabase/migrations/20251218000002_create_pdd_russia_tables.sql \
      supabase/migrations/$(date +%Y%m%d%H%M%S)_create_[country_code]_tables.sql
   ```

2. **Замени все вхождения:**
   - `pdd_russia` → `[country_code]`
   - `PDD_RUSSIA` → `[COUNTRY_CODE]`
   - Адаптируй поля под структуру данных

3. **Скопируй скрипт импорта:**
   ```bash
   cp scripts/import-pdd-russia.js scripts/import-[country-code].js
   ```

4. **Адаптируй под структуру данных новой страны**

5. **Создай страницу админки:**
   ```bash
   cp src/pages/admin/AdminPDDRussia.tsx \
      src/pages/admin/Admin[CountryCode].tsx
   ```

---

## 📚 Полезные ссылки

- **Архитектура:** `PDD_RUSSIA_ARCHITECTURE.md`
- **Пример импорта:** `scripts/import-pdd-russia.js`
- **Пример админки:** `src/pages/admin/AdminPDDRussia.tsx`

---

**Готово! Теперь ты знаешь, как добавлять новые страны! 🎉**

