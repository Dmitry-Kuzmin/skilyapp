# 🎨 Архитектура интерфейса ПДД (мультистрановое приложение)

## 📋 Общая концепция

Создаём универсальную систему для изучения ПДД разных стран, переиспользуя существующие компоненты и добавляя страновую логику.

## 🏗️ Архитектура

### 1. **Структура маршрутов (Универсальная, международная)**

```
/learn                         → Страница выбора страны
/learn/:country                → Главная страница ПДД для страны (билеты/тесты)
/learn/:country/tickets        → Список билетов
/learn/:country/ticket/:id     → Прохождение билета
/learn/:country/test/:mode     → Тесты (случайные, по темам и т.д.)
/learn/:country/results        → Результаты теста
```

**Примеры:**
- `/learn/russia` - ПДД Россия
- `/learn/russia/tickets` - Билеты ПДД Россия
- `/learn/russia/ticket/4` - Билет 4 ПДД Россия
- `/learn/spain` - DGT Испания
- `/learn/ukraine` - ПДД Украина (будущее)

**Почему `/learn`?**
- Универсальное слово, понятное на любом языке
- Не привязано к конкретному акрониму (PDD, DGT, StVO)
- SEO-friendly и профессионально выглядит

### 2. **Компоненты (переиспользование)**

#### ✅ Что переиспользуем:
- `TestSession.tsx` - универсальный компонент для прохождения тестов
- `QuestionProgressBar.tsx` - прогресс-бар
- `AIExplanationDialog.tsx` - объяснения от AI
- UI компоненты из `@/components/ui/`

#### 🆕 Что создаём:
- `CountrySelector.tsx` - выбор страны
- `PDDTicketsList.tsx` - список билетов для страны
- `PDDTicketCard.tsx` - карточка билета
- `PDDCountryLayout.tsx` - layout для страновых страниц
- `usePDDCountry.ts` - хук для работы с данными страны

### 3. **Контекст и состояние**

```typescript
// src/contexts/PDDCountryContext.tsx
interface PDDCountryContext {
  country: string; // 'russia', 'spain', etc.
  countryData: CountryData; // из таблицы countries
  tickets: Ticket[]; // билеты для страны
  stats: CountryStats; // статистика пользователя
}
```

### 4. **Хуки для работы с данными**

```typescript
// src/hooks/usePDDCountry.ts
- usePDDCountry(country: string) - данные страны
- usePDDTickets(country: string) - список билетов
- usePDDTicket(country: string, ticketId: number) - конкретный билет
- usePDDQuestions(country: string, ticketId?: number) - вопросы
- usePDDStats(country: string) - статистика пользователя
```

### 5. **Адаптация TestSession**

TestSession уже поддерживает разные режимы через `mode`:
- `practice` - практика
- `exam` - экзамен
- `dgt` - DGT тесты
- `sequential` - последовательные тесты

**Добавим новый режим:**
- `pdd-ticket` - прохождение билета ПДД
- `pdd-random` - случайные вопросы ПДД

**Параметры URL:**
```
/test/learn-ticket?country=russia&ticket=4
/test/learn-random?country=russia&count=20
```

### 6. **Адаптеры данных (Критично!)**

Разные страны имеют разные форматы данных в БД. Нужно преобразовывать их к единому стандарту для `TestSession`.

```typescript
// Адаптер для России
const mapRussiaQuestionToUniversal = (russiaQ: PDDRussiaQuestion): UniversalQuestion => ({
  id: russiaQ.id,
  text: russiaQ.question_text,
  image: russiaQ.image_url,
  answers: russiaQ.answers.map(a => ({
    id: a.id,
    text: a.answer_text,
    isCorrect: a.is_correct
  })),
  explanation: russiaQ.explanation
});

// Адаптер для Испании (DGT)
const mapDGTQuestionToUniversal = (dgtQ: DGTQuestion): UniversalQuestion => ({
  id: dgtQ.id,
  text: dgtQ.question_es,
  image: dgtQ.image_filename,
  answers: [
    { id: 'a', text: dgtQ.option_a_es, isCorrect: dgtQ.correct_answer === 'a' },
    { id: 'b', text: dgtQ.option_b_es, isCorrect: dgtQ.correct_answer === 'b' },
    { id: 'c', text: dgtQ.option_c_es, isCorrect: dgtQ.correct_answer === 'c' },
  ],
  explanation: dgtQ.explanation_es
});
```

### 7. **Правила экзаменов (RulesConfig)**

Каждая страна имеет свои правила:
- **Россия:** 20 вопросов, 2 ошибки, 20 минут
- **Испания (DGT):** 30 вопросов, 3 ошибки, 30 минут

```typescript
interface ExamRules {
  maxErrors: number;
  timeLimit: number; // секунды
  questionsCount: number;
  mode: 'ticket' | 'exam' | 'practice';
  allowAdditionalQuestions?: boolean; // для РФ: +5 вопросов при ошибке
}
```

## 📁 Структура файлов

```
src/
├── pages/
│   ├── pdd/
│   │   ├── PDDCountrySelector.tsx      # Выбор страны
│   │   ├── PDDCountryHome.tsx          # Главная страна
│   │   ├── PDDTicketsList.tsx          # Список билетов
│   │   └── PDDTicketSession.tsx         # Прохождение билета
│   └── ...
├── components/
│   ├── pdd/
│   │   ├── PDDCountryLayout.tsx        # Layout для ПДД
│   │   ├── PDDTicketCard.tsx           # Карточка билета
│   │   ├── PDDStatsCard.tsx            # Статистика
│   │   └── PDDNavigation.tsx            # Навигация
│   └── ...
├── hooks/
│   ├── usePDDCountry.ts                  # Данные страны
│   ├── usePDDTickets.ts                 # Билеты
│   ├── usePDDTicket.ts                  # Конкретный билет
│   ├── usePDDQuestions.ts               # Вопросы
│   └── usePDDStats.ts                   # Статистика
├── contexts/
│   └── PDDCountryContext.tsx            # Контекст страны
└── types/
    └── pdd.ts                           # TypeScript типы
```

## 🎯 План разработки (пошагово)

### Этап 1: Базовая инфраструктура (1-2 часа)
1. ✅ Создать типы для ПДД (`types/pdd.ts`)
2. ✅ Создать хук `usePDDCountry.ts`
3. ✅ Создать хук `usePDDTickets.ts`
4. ✅ Создать хук `usePDDQuestions.ts`
5. ✅ Добавить RPC функции в БД (если нужно)

### Этап 2: Страница выбора страны (1 час)
1. ✅ Создать `PDDCountrySelector.tsx`
2. ✅ Добавить маршрут `/pdd`
3. ✅ Интегрировать в навигацию

### Этап 3: Главная страница страны (2 часа)
1. ✅ Создать `PDDCountryHome.tsx`
2. ✅ Создать `PDDCountryLayout.tsx`
3. ✅ Добавить статистику пользователя
4. ✅ Добавить быстрые действия (начать тест, выбрать билет)

### Этап 4: Список билетов (2 часа)
1. ✅ Создать `PDDTicketsList.tsx`
2. ✅ Создать `PDDTicketCard.tsx`
3. ✅ Добавить фильтры и поиск
4. ✅ Показать прогресс по билетам

### Этап 5: Прохождение билета (3-4 часа)
1. ✅ Адаптировать `TestSession` для режима `pdd-ticket`
2. ✅ Создать `PDDTicketSession.tsx` (обёртка над TestSession)
3. ✅ Добавить навигацию между вопросами билета
4. ✅ Добавить результаты билета

### Этап 6: Статистика и история (2 часа)
1. ✅ Создать страницу статистики
2. ✅ Показать прогресс по билетам
3. ✅ История пройденных тестов

## 🔧 Технические детали

### Адаптация TestSession

TestSession уже умеет работать с разными источниками данных через хуки:
- `useDGTQuestions` - для DGT
- `useQuestionsByTopic` - для тем
- `useChallengeBankQuestions` - для challenge bank

**Добавим:**
- `usePDDTicketQuestions(country, ticketId)` - вопросы билета
- `usePDDRandomQuestions(country, count)` - случайные вопросы

### Работа с RPC функциями

Уже есть функции:
- `get_pdd_russia_ticket(ticket_number)` - получить билет
- `get_pdd_russia_question_by_source(source_id)` - получить вопрос

**Можно добавить:**
- `get_pdd_russia_tickets()` - список всех билетов
- `get_pdd_russia_stats(user_id)` - статистика пользователя

### Типы данных

```typescript
// types/pdd.ts
interface PDDTicket {
  ticket_number: number;
  questions_count: number;
  completed: boolean;
  score?: number;
  last_attempt?: string;
}

interface PDDQuestion {
  id: string;
  ticket_number: number;
  question_number: number;
  question_text: string;
  image_url: string | null;
  answers: PDDAnswer[];
  explanation: string | null;
}

interface PDDAnswer {
  id: string;
  answer_text: string;
  is_correct: boolean;
  position: number;
}
```

## 🎨 UI/UX концепция

### Главная страница страны (`/pdd/russia`)
```
┌─────────────────────────────────────┐
│  🇷🇺 ПДД Россия                     │
│  ────────────────────────────────  │
│                                     │
│  📊 Статистика                     │
│  ┌─────────┬─────────┬─────────┐ │
│  │ Билеты  │ Вопросы │ Точность │ │
│  │ 12/40   │ 240/800 │   85%    │ │
│  └─────────┴─────────┴─────────┘ │
│                                     │
│  🚀 Быстрые действия               │
│  ┌───────────────────────────────┐ │
│  │ 🎲 Случайный тест (20 вопросов)│ │
│  │ 📚 Выбрать билет              │ │
│  │ 📖 Изучить знаки              │ │
│  └───────────────────────────────┘ │
│                                     │
│  📚 Последние билеты                │
│  ┌──────┬──────┬──────┬──────┐    │
│  │ Б.1  │ Б.2  │ Б.3  │ Б.4  │    │
│  │ ✅   │ ⏳   │ ❌   │ ⏳   │    │
│  └──────┴──────┴──────┴──────┘    │
└─────────────────────────────────────┘
```

### Список билетов (`/pdd/russia/tickets`)
```
┌─────────────────────────────────────┐
│  ← Назад  |  📚 Билеты ПДД Россия  │
│  ────────────────────────────────  │
│                                     │
│  🔍 Поиск: [____________]           │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Билет 1    ✅ 20/20  95%      │ │
│  │ Билет 2    ⏳ 15/20  -        │ │
│  │ Билет 3    ❌ 12/20  60%      │ │
│  │ Билет 4    ⏳  0/20  -        │ │
│  │ ...                            │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Прохождение билета (`/pdd/russia/ticket/4`)
Используем существующий `TestSession` с адаптацией:
- Показываем номер билета и вопроса
- Навигация только внутри билета
- Результаты по билету

## 🚀 С чего начать?

### Вариант 1: Быстрый старт (рекомендуется)
1. Создать страницу выбора страны
2. Создать главную страницу для России
3. Адаптировать TestSession для билетов
4. Добавить список билетов

### Вариант 2: Полная реализация
Следовать плану по этапам выше.

## 📝 Следующие шаги

1. **Создать типы** (`types/pdd.ts`)
2. **Создать хуки** (`hooks/usePDD*.ts`)
3. **Создать страницу выбора страны**
4. **Создать главную страницу России**
5. **Адаптировать TestSession**

---

**Вопросы для обсуждения:**
- Нужна ли интеграция с существующими тестами DGT?
- Как показывать статистику по странам?
- Нужны ли достижения/бейджи за билеты?

