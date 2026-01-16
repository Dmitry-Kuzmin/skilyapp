# 🏗️ Архитектура мультистрановой системы ПДД

## 📊 Анализ репозитория etspring/pdd_russia

**Ссылка**: https://github.com/etspring/pdd_russia

### Структура данных:

```json
{
  "title": "Вопрос 1",
  "ticket_number": "Билет 2",
  "ticket_category": "A,B",
  "image": "./images/A_B/1871b903ddd6b18d2bc45133234dd7fa.jpg",
  "question": "Сколько полос для движения имеет данная дорога?",
  "answers": [
    {
      "answer_text": "Две",
      "is_correct": false
    },
    {
      "answer_text": "Четыре",
      "is_correct": true
    },
    {
      "answer_text": "Пять",
      "is_correct": false
    }
  ],
  "correct_answer": "Правильный ответ: 2",
  "answer_tip": "Разделительная полоса делит дорогу на проезжие части...",
  "topic": ["Общие положения"],
  "id": "40edd1d720133385413d2302583b2eee"
}
```

### Особенности:
- ✅ 40 билетов по 20 вопросов = 800 вопросов
- ✅ Категории: A_B, C_D
- ✅ Вопросы по темам (topic)
- ✅ Изображения в папке images/
- ✅ Дорожные знаки (signs/)
- ✅ Штрафы (penalties/)
- ✅ Разметка (markup/)

---

## 🎯 Архитектурное решение

### Принципы:
1. **Отдельные таблицы для каждой страны** - проще управлять, нет лишних полей
2. **Единая структура админки** - один интерфейс для всех стран
3. **Без переводов для РФ** - только русский язык
4. **Масштабируемость** - легко добавить новые страны

---

## 📋 Структура базы данных

### 1. Таблица стран (countries)

```sql
CREATE TABLE countries (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,  -- 'DGT', 'PDD_RUSSIA', 'PDD_UKRAINE', etc.
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  flag_emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  default_language TEXT NOT NULL,  -- 'ru', 'es', 'en'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Таблица вопросов ПДД России (pdd_russia_questions)

```sql
CREATE TABLE pdd_russia_questions (
  id UUID PRIMARY KEY,
  source_id TEXT UNIQUE,  -- MD5 hash из репозитория
  ticket_number INTEGER CHECK (ticket_number >= 1 AND ticket_number <= 40),
  question_number INTEGER CHECK (question_number >= 1 AND question_number <= 20),
  ticket_category TEXT,  -- 'A,B', 'C,D', 'ALL'
  question_text TEXT NOT NULL,
  image_url TEXT,
  explanation TEXT,  -- answer_tip
  correct_answer_text TEXT,  -- correct_answer
  topics TEXT[],  -- массив тем
  difficulty TEXT DEFAULT 'medium',
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticket_number, question_number)
);
```

### 3. Таблица ответов ПДД России (pdd_russia_answers)

```sql
CREATE TABLE pdd_russia_answers (
  id UUID PRIMARY KEY,
  question_id UUID REFERENCES pdd_russia_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, position)
);
```

### 4. Таблица дорожных знаков ПДД России (pdd_russia_signs)

```sql
CREATE TABLE pdd_russia_signs (
  id UUID PRIMARY KEY,
  category TEXT NOT NULL,  -- "Предупреждающие знаки", "Знаки приоритета", etc.
  number TEXT NOT NULL,  -- "1.1", "1.3.2", etc.
  title TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, number)
);
```

### 5. Таблица штрафов ПДД России (pdd_russia_penalties)

```sql
CREATE TABLE pdd_russia_penalties (
  id UUID PRIMARY KEY,
  article_part TEXT NOT NULL,  -- "12.8 ч. 3", "264.1 УК РФ"
  text TEXT NOT NULL,
  penalty TEXT NOT NULL,
  is_criminal BOOLEAN DEFAULT false,  -- true если УК РФ
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔧 Админка - структура

### Модули админки:

1. **Управление странами**
   - Список стран
   - Добавление/редактирование страны
   - Активация/деактивация

2. **Управление вопросами (по странам)**
   - Выбор страны
   - Список вопросов с фильтрами:
     - По билетам (1-40)
     - По категориям (A,B / C,D)
     - По темам
     - По сложности
   - Добавление/редактирование вопроса
   - Массовый импорт из JSON
   - Предпросмотр вопроса

3. **Управление дорожными знаками**
   - По категориям
   - Добавление/редактирование
   - Загрузка изображений

4. **Управление штрафами**
   - Список штрафов
   - Добавление/редактирование
   - Фильтр по статьям

5. **Статистика**
   - Количество вопросов по странам
   - Популярные темы
   - Активность пользователей

---

## 📥 Импорт данных

### Скрипт импорта из GitHub:

```javascript
// scripts/import-pdd-russia.js
// 1. Клонировать/скачать репозиторий
// 2. Парсить JSON файлы из questions/
// 3. Импортировать в pdd_russia_questions и pdd_russia_answers
// 4. Импортировать знаки из signs/
// 5. Импортировать штрафы из penalties/
```

---

## 🎨 UI/UX админки

### Главная страница:
- Карточки стран с флагами
- Статистика по каждой стране
- Быстрые действия

### Страница управления вопросами:
- Split-view: список слева, редактор справа
- Фильтры сверху (билет, категория, тема)
- Таблица вопросов с поиском
- Модалка для редактирования вопроса
- Drag & drop для изменения порядка ответов

### Редактор вопроса:
- Поля: текст вопроса, изображение, объяснение
- Список ответов с чекбоксами (правильный/неправильный)
- Предпросмотр как на фронте

---

## 🚀 План реализации

### Фаза 1: База данных
- [x] Создать таблицу countries
- [ ] Создать таблицы для ПДД России
- [ ] Создать индексы и RLS политики

### Фаза 2: Импорт данных
- [ ] Скрипт для скачивания репозитория
- [ ] Парсер JSON файлов
- [ ] Импорт в базу данных
- [ ] Валидация данных

### Фаза 3: Админка
- [ ] Компонент выбора страны
- [ ] Список вопросов с фильтрами
- [ ] Редактор вопроса
- [ ] Импорт из JSON
- [ ] Управление знаками и штрафами

### Фаза 4: Фронтенд
- [ ] Компонент выбора страны при входе
- [ ] Адаптация существующих компонентов для ПДД России
- [ ] Отображение билетов (1-40)
- [ ] Режим экзамена

---

## 📝 Примечания

- Для РФ используем только русский язык (нет полей question_es, question_en)
- Структура отличается от DGT (билеты вместо тем)
- Нужно продумать миграцию существующих пользователей
- Админка должна быть быстрой и удобной (виртуализация списков)

