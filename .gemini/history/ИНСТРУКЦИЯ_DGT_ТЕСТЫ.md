# 🚗 Инструкция по установке тестов DGT

## Что было создано

Создана система тестов DGT (экзамены для получения водительских прав в Испании) с базой из **4012 реальных вопросов** для категорий:
- **A1** (мотоциклы): 899 вопросов
- **B** (легковые автомобили): 2947 вопросов
- **D** (автобусы): 166 вопросов

Все данные скачаны из официального репозитория: https://github.com/donmerendolo/anki-carnet-conducir

## Файлы проекта

### Созданные страницы:
1. **`/src/pages/DGTTests.tsx`** - главная страница с выбором категории экзамена
2. **`/src/pages/DGTTestSession.tsx`** - страница прохождения теста с таймером
3. **`/src/pages/DGTTestResults.tsx`** - страница результатов с разбором ответов
4. **`/src/pages/DGTTestHistory.tsx`** - история пройденных тестов

### Инфраструктура:
- **`/src/types/dgt.ts`** - TypeScript типы для работы с DGT тестами
- **`/src/hooks/useDGTTests.ts`** - хук для работы с API тестов
- **`/supabase/migrations/20251110000001_create_dgt_questions.sql`** - миграция для создания таблиц
- **`/scripts/import-dgt-questions.ts`** - скрипт импорта данных из JSON
- **`/data/data_A1.json, data_B.json, data_D.json`** - JSON файлы с вопросами

### Документация:
- **`/APPLY_DGT_MIGRATION.sql`** - SQL скрипт для ручного применения миграции

## Шаги установки

### Шаг 1: Применить миграцию базы данных

#### Вариант А: Через Supabase Dashboard (рекомендуется)

1. Открой **Supabase Dashboard**: https://supabase.com/dashboard
2. Выбери свой проект
3. Перейди в **SQL Editor**
4. Нажми **New Query**
5. Скопируй содержимое файла **`APPLY_DGT_MIGRATION.sql`**
6. Вставь в редактор и нажми **Run**

#### Вариант Б: Через CLI

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
npx supabase db push
```

После применения миграции будут созданы 3 таблицы:
- `dgt_questions` - вопросы для тестов
- `dgt_test_sessions` - сессии прохождения тестов
- `dgt_test_answers` - ответы пользователей

### Шаг 2: Импортировать данные

#### Вариант А: Через TypeScript скрипт

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep

# Установить зависимости если нужно
npm install

# Запустить импорт
npx tsx scripts/import-dgt-questions.ts
```

#### Вариант Б: Через Python скрипт

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep

# Установить зависимости
pip install supabase python-dotenv

# Запустить импорт
python3 scripts/import-dgt-questions.py
```

**Важно**: Убедись, что в файле `.env` есть переменные:
```
VITE_SUPABASE_URL=твой_url
VITE_SUPABASE_ANON_KEY=твой_ключ
```

### Шаг 3: Проверить работу

1. Запусти проект: `npm run dev`
2. Открой страницу **Обучение** (`/learning`)
3. Увидишь новый модуль **"Экзамены DGT"** с бейджем "Новое"
4. Или перейди напрямую: `/dgt-tests`

## Возможности системы

### Для пользователей:
- ✅ Выбор категории экзамена (A1, B, D)
- ✅ Прохождение теста из 30 вопросов
- ✅ Таймер на 30 минут (как на реальном экзамене)
- ✅ Изображения к вопросам
- ✅ Подробный разбор ответов с объяснениями
- ✅ История пройденных тестов
- ✅ Статистика по каждой категории
- ✅ Минимум 90% для сдачи (27 из 30 правильных ответов)

### Технические особенности:
- 🎨 Красивый UI с анимациями (Framer Motion)
- 🎉 Конфетти при успешной сдаче
- 📱 Адаптивный дизайн
- 🔐 RLS политики для безопасности
- 📊 Автоматический подсчет статистики
- 🌐 Поддержка изображений из GitHub репозитория

## Структура базы данных

### Таблица `dgt_questions`
Хранит все вопросы для экзаменов:
- `category` - категория (A1, B, D)
- `question_es` - текст вопроса (на испанском)
- `option_a_es, option_b_es, option_c_es` - варианты ответов
- `correct_answer` - правильный ответ (a, b, или c)
- `explanation_es` - объяснение правильного ответа
- `image_filename` - название файла изображения
- `times_shown, times_correct` - статистика по вопросу

### Таблица `dgt_test_sessions`
Хранит сессии прохождения тестов:
- `user_id` - ID пользователя
- `category` - категория экзамена
- `total_questions` - количество вопросов
- `correct_answers, incorrect_answers, unanswered` - результаты
- `score_percentage` - процент правильных ответов
- `time_spent_seconds` - время прохождения
- `status` - статус (in_progress, completed, abandoned)

### Таблица `dgt_test_answers`
Хранит ответы пользователя на каждый вопрос:
- `session_id` - ID сессии теста
- `question_id` - ID вопроса
- `user_answer` - ответ пользователя (a, b, или c)
- `is_correct` - правильно ли ответил
- `time_spent_seconds` - время на ответ

## Маршруты

| Путь | Описание |
|------|----------|
| `/dgt-tests` | Главная страница с выбором категории |
| `/dgt-tests/:category/start` | Начать тест выбранной категории |
| `/dgt-tests/:category/results/:sessionId` | Результаты теста с разбором |
| `/dgt-tests/:category/history` | История тестов категории |

## Устранение проблем

### Если миграция не применяется через CLI
- Используй **Supabase Dashboard** → SQL Editor
- Скопируй содержимое `APPLY_DGT_MIGRATION.sql`
- Запусти вручную

### Если импорт не работает
1. Проверь наличие файлов в `/data/`:
   - `data_A1.json`
   - `data_B.json`
   - `data_D.json`

2. Проверь переменные окружения в `.env`:
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

3. Проверь доступ к Supabase:
   - Открой Supabase Dashboard
   - Проверь, что таблицы созданы
   - Проверь RLS политики

### Если изображения не загружаются
- Изображения грузятся напрямую из GitHub репозитория
- URL: `https://raw.githubusercontent.com/donmerendolo/anki-carnet-conducir/master/images/{category}/{filename}`
- Если изображение не найдено, оно просто скрывается (не ломает страницу)

## Дальнейшее развитие

Возможные улучшения:
- [ ] Добавить перевод вопросов на русский язык
- [ ] Сохранять изображения локально в Supabase Storage
- [ ] Добавить режим "быстрый тест" (10 вопросов)
- [ ] Добавить фильтр по темам
- [ ] Добавить режим "только ошибки" (повторение неправильных ответов)
- [ ] Добавить подробную статистику по темам
- [ ] Интеграция с достижениями и монетами

## Поддержка

Если возникли вопросы или проблемы:
1. Проверь логи в консоли браузера
2. Проверь логи Supabase (Dashboard → Logs)
3. Проверь RLS политики (Dashboard → Authentication → Policies)

---

**Автор**: Cursor AI  
**Дата**: 10 ноября 2025  
**Источник данных**: https://github.com/donmerendolo/anki-carnet-conducir

