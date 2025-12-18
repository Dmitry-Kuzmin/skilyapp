# 📊 Анализ масштабируемости архитектуры для 30 стран

## 🔍 Текущее состояние

### ✅ Что сделано хорошо:

1. **Универсальные типы** (`UniversalQuestion`, `UniversalAnswer`)
   - ✅ Единый формат для всех стран
   - ✅ Легко расширяется

2. **Паттерн Adapter** (`pddAdapters.ts`)
   - ✅ Изолирует преобразование данных
   - ✅ Но требует добавления функции для каждой страны

3. **Контекст выбранной страны** (`PDDContext`)
   - ✅ Централизованное управление
   - ✅ Реактивные обновления

4. **Конфигурация стран** (`COUNTRIES_CONFIG`)
   - ✅ Декларативный подход
   - ✅ Легко добавлять новые страны

### ⚠️ Проблемы для масштабирования:

#### 1. **Хардкод проверок страны** (КРИТИЧНО)
```typescript
// ❌ ПЛОХО: В каждом хуке проверка if (country === 'russia')
if (country === 'russia') {
  // логика для России
}
return []; // для других стран
```

**Проблема:** При 30 странах будет 30 `if-else` блоков в каждом хуке.

**Решение:** Использовать паттерн Strategy/Registry.

#### 2. **Отдельные таблицы для каждой страны** (КРИТИЧНО)
```sql
-- ❌ ПЛОХО: Отдельная таблица для каждой страны
pdd_russia_questions
pdd_russia_answers
pdd_spain_questions  -- нужно создать
pdd_ukraine_questions -- нужно создать
-- ... 30 таблиц
```

**Проблема:** 
- 30+ таблиц в БД
- Дублирование миграций
- Сложность поддержки

**Решение:** Единая таблица с полем `country_code`.

#### 3. **Адаптеры с хардкодом** (СРЕДНЯЯ)
```typescript
// ❌ ПЛОХО: Отдельная функция для каждой страны
mapRussiaQuestionToUniversal()
mapDGTQuestionToUniversal()
mapUkraineQuestionToUniversal() // нужно добавить
// ... 30 функций
```

**Проблема:** Много дублирования кода.

**Решение:** Единый адаптер с конфигурацией по стране.

#### 4. **Нет единой схемы данных** (КРИТИЧНО)
- Россия: `ticket_number`, `question_number`
- Испания: `category`, `option_a_es`, `option_b_es`
- Украина: (неизвестно)

**Проблема:** Каждая страна имеет свою структуру.

**Решение:** Нормализованная схема с поддержкой разных форматов через JSONB.

---

## 🎯 Рекомендуемая архитектура для 30 стран

### 1. **Единая таблица вопросов**

```sql
CREATE TABLE pdd_questions (
  id UUID PRIMARY KEY,
  country_code TEXT NOT NULL, -- 'russia', 'spain', 'ukraine'
  category_code TEXT, -- 'B', 'A', 'C' (категория прав)
  
  -- Универсальные поля
  question_text TEXT NOT NULL,
  question_text_original TEXT, -- оригинальный текст на языке страны
  image_url TEXT,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  
  -- Метаданные (JSONB для гибкости)
  metadata JSONB DEFAULT '{}', -- ticket_number, question_number, topics, etc.
  
  -- Индексы
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Индексы для производительности
  INDEX idx_pdd_questions_country (country_code),
  INDEX idx_pdd_questions_category (country_code, category_code),
  INDEX idx_pdd_questions_metadata (metadata) USING GIN
);

CREATE TABLE pdd_answers (
  id UUID PRIMARY KEY,
  question_id UUID REFERENCES pdd_questions(id),
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  position INTEGER NOT NULL,
  
  -- Метаданные (для специфичных полей)
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Преимущества:**
- ✅ Одна таблица вместо 30+
- ✅ Легко добавлять новые страны
- ✅ Единые индексы и запросы
- ✅ JSONB для специфичных полей

### 2. **Registry Pattern для адаптеров**

```typescript
// src/utils/pddAdapters/registry.ts
type AdapterFunction = (data: any) => UniversalQuestion;

const adapters: Record<CountryCode, AdapterFunction> = {
  russia: mapRussiaToUniversal,
  spain: mapSpainToUniversal,
  ukraine: mapUkraineToUniversal,
  // ... легко добавлять новые
};

export function adaptQuestionToUniversal(
  country: CountryCode,
  data: any
): UniversalQuestion {
  const adapter = adapters[country];
  if (!adapter) {
    throw new Error(`No adapter for country: ${country}`);
  }
  return adapter(data);
}
```

**Преимущества:**
- ✅ Нет `if-else` цепочек
- ✅ Легко добавлять новые страны
- ✅ Типобезопасность

### 3. **Strategy Pattern для хуков**

```typescript
// src/hooks/pdd/strategies.ts
interface PDDDataStrategy {
  getTickets(country: CountryCode): Promise<PDDTicket[]>;
  getQuestions(country: CountryCode, ticketId: number): Promise<UniversalQuestion[]>;
  getRandomQuestions(country: CountryCode, count: number): Promise<UniversalQuestion[]>;
}

class RussiaStrategy implements PDDDataStrategy {
  async getTickets() {
    // логика для России
  }
  // ...
}

class SpainStrategy implements PDDDataStrategy {
  async getTickets() {
    // логика для Испании
  }
  // ...
}

const strategies: Record<CountryCode, PDDDataStrategy> = {
  russia: new RussiaStrategy(),
  spain: new SpainStrategy(),
  // ...
};

export function getPDDStrategy(country: CountryCode): PDDDataStrategy {
  return strategies[country] || strategies.russia; // fallback
}
```

**Преимущества:**
- ✅ Изолированная логика для каждой страны
- ✅ Легко тестировать
- ✅ Нет хардкода в хуках

### 4. **Конфигурация схемы данных**

```typescript
// src/config/countrySchemas.ts
interface CountrySchema {
  hasTickets: boolean; // Россия - да, Испания - нет
  hasCategories: boolean; // все страны - да
  ticketStructure?: 'numbered' | 'thematic'; // Россия - numbered
  questionStructure: 'separate_answers' | 'inline_answers'; // Россия - separate
}

export const COUNTRY_SCHEMAS: Record<CountryCode, CountrySchema> = {
  russia: {
    hasTickets: true,
    hasCategories: true,
    ticketStructure: 'numbered',
    questionStructure: 'separate_answers',
  },
  spain: {
    hasTickets: false,
    hasCategories: true,
    questionStructure: 'inline_answers',
  },
  // ...
};
```

**Преимущества:**
- ✅ Декларативное описание структуры
- ✅ Автоматическая адаптация UI
- ✅ Легко добавлять новые страны

---

## 📈 План миграции (Постепенный подход)

### ✅ Этап 1: Рефакторинг хуков через Strategy Pattern (1-2 дня)
**Цель:** Внедрить паттерны без изменения БД. Существующие таблицы остаются как "Legacy".

- [ ] Создать `PDDDataStrategy` интерфейс
- [ ] Вынести логику России в `RussiaLegacyStrategy` (работает с `pdd_russia_*`)
- [ ] Вынести логику Испании в `SpainStrategy` (работает с `dgt_questions`)
- [ ] Создать Registry для стратегий
- [ ] Обновить хуки для использования стратегий через Registry
- [ ] **Результат:** Код готов к масштабированию, БД не трогаем

### 🔄 Этап 2: Создание единой таблицы для новых стран (1 день)
**Цель:** Новая таблица для будущих стран, старые остаются.

- [ ] Создать миграцию для `pdd_questions` и `pdd_answers` (с `country_code`)
- [ ] Создать `UnifiedStrategy` для работы с новой таблицей
- [ ] **Результат:** Новые страны (Украина, Беларусь) добавляются в единую таблицу

### 🔄 Этап 3: Унификация адаптеров через Registry (1 день)
- [ ] Создать Registry для адаптеров
- [ ] Рефакторить существующие адаптеры
- [ ] Обновить все места использования
- [ ] **Результат:** Единая точка входа для адаптеров

### 🔄 Этап 4: Конфигурация схем (1 день)
- [ ] Создать `COUNTRY_SCHEMAS`
- [ ] Обновить UI компоненты для использования схем
- [ ] Тестирование

### ⏳ Этап 5: Миграция legacy данных (когда будет время)
**Цель:** Перелить данные РФ из `pdd_russia_*` в `pdd_questions` (опционально).

- [ ] Создать скрипт миграции данных
- [ ] Обновить `RussiaLegacyStrategy` → `RussiaStrategy` (работает с `pdd_questions`)
- [ ] Удалить legacy таблицы (или оставить как архив)

---

## 🎯 Преимущества постепенного подхода

1. ✅ **Не ломаем работающее** - РФ продолжает работать через legacy таблицы
2. ✅ **Быстрый старт** - паттерны внедряются за 1-2 дня
3. ✅ **Новые страны правильно** - сразу идут в единую таблицу
4. ✅ **Миграция опциональна** - можно делать когда будет время
5. ✅ **Нет остановки разработки** - фичи продолжают разрабатываться

---

## 🎯 Итоговая оценка

### Текущая архитектура:
- **Масштабируемость:** ⚠️ Средняя (проблемы при 10+ странах)
- **Поддержка:** ⚠️ Сложная (много дублирования)
- **Добавление страны:** ⚠️ 2-3 дня работы

### После рефакторинга:
- **Масштабируемость:** ✅ Отличная (легко до 50+ стран)
- **Поддержка:** ✅ Простая (единая логика)
- **Добавление страны:** ✅ 2-4 часа работы

---

## 💡 Рекомендации

1. **НЕ откладывать рефакторинг** - чем больше стран, тем сложнее будет
2. **Начать с хуков** - это даст быстрый эффект
3. **Миграция БД** - можно делать постепенно (поддержка старых и новых таблиц)
4. **Документировать** - создать шаблон для добавления новой страны

---

## 📝 Шаблон для добавления новой страны

```typescript
// 1. Добавить в COUNTRIES_CONFIG
ukraine: {
  code: 'ukraine',
  name: 'Украина',
  // ...
}

// 2. Создать стратегию (если нужна специфичная логика)
class UkraineStrategy implements PDDDataStrategy {
  // ...
}

// 3. Добавить адаптер
export function mapUkraineToUniversal(data: any): UniversalQuestion {
  // ...
}

// 4. Зарегистрировать
strategies.ukraine = new UkraineStrategy();
adapters.ukraine = mapUkraineToUniversal;

// 5. Импортировать данные в БД
// Готово! 🎉
```

**Время:** 2-4 часа вместо 2-3 дней.

