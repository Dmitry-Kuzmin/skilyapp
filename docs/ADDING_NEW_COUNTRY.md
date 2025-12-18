# 🌍 Добавление новой страны

## Быстрый старт (2-4 часа)

### Шаг 1: Добавить конфигурацию страны

```typescript
// src/types/pdd.ts
export const COUNTRIES_CONFIG: Record<CountryCode, CountryData> = {
  // ... существующие страны
  ukraine: {
    code: 'ukraine',
    name: 'Украина',
    nameNative: 'Україна',
    flag: '🇺🇦',
    isoCode: 'UA',
    examRules: {
      maxErrors: 2,
      timeLimit: 20 * 60,
      questionsCount: 20,
      mode: 'ticket',
      passingScore: 90,
    },
    available: true,
    licenseCategories: [
      { code: 'B', name: 'B', nameFull: 'Легкові автомобілі', icon: '🚗', description: '...' },
      // ... другие категории
    ],
  },
};
```

### Шаг 2: Создать стратегию (если нужна специфичная логика)

```typescript
// src/core/pdd/strategies/UkraineStrategy.ts
import { PDDDataStrategy } from '../PDDDataStrategy';
import { CountryCode, UniversalQuestion, PDDRussiaTicket } from '@/types/pdd';
import { supabase } from '@/integrations/supabase/client';

export class UkraineStrategy implements PDDDataStrategy {
  async getTickets(country: CountryCode): Promise<PDDRussiaTicket[]> {
    // Логика получения билетов для Украины
    // Может работать с единой таблицей pdd_questions (country_code = 'ukraine')
    // или со своей таблицей pdd_ukraine_questions
  }

  async getTicketQuestions(country: CountryCode, ticketNumber: number): Promise<UniversalQuestion[]> {
    // Логика получения вопросов билета
  }

  async getRandomQuestions(country: CountryCode, count: number): Promise<UniversalQuestion[]> {
    // Логика получения случайных вопросов
  }

  async getExamQuestions(country: CountryCode): Promise<{
    selectedQuestions: UniversalQuestion[];
    allQuestionsByBlock: Record<number, UniversalQuestion[]>;
  }> {
    // Логика получения вопросов для экзамена
  }
}
```

### Шаг 3: Зарегистрировать стратегию

```typescript
// src/core/pdd/strategies/PDDStrategyRegistry.ts
import { UkraineStrategy } from './UkraineStrategy';

constructor() {
  // ... существующие стратегии
  this.register('ukraine', new UkraineStrategy());
}
```

### Шаг 4: Создать адаптер (если структура данных отличается)

```typescript
// src/utils/pddAdapters.ts
export function mapUkraineToUniversal(
  ukraineQ: UkraineQuestion,
  answers?: UkraineAnswer[]
): UniversalQuestion {
  return {
    id: ukraineQ.id,
    text: ukraineQ.question_text,
    image: ukraineQ.image_url,
    answers: answers?.map(a => ({
      id: a.id,
      text: a.answer_text,
      isCorrect: a.is_correct,
      position: a.position,
    })) || [],
    explanation: ukraineQ.explanation,
    topics: ukraineQ.topics || [],
    difficulty: ukraineQ.difficulty || 'medium',
  };
}
```

### Шаг 5: Импортировать данные в БД

**Вариант A: Единая таблица (рекомендуется для новых стран)**

```sql
-- Используем единую таблицу pdd_questions
INSERT INTO pdd_questions (country_code, category_code, question_text, ...)
VALUES ('ukraine', 'B', '...', ...);
```

**Вариант B: Отдельная таблица (legacy подход, как у России)**

```sql
-- Создать таблицы pdd_ukraine_questions и pdd_ukraine_answers
-- Использовать в UkraineStrategy
```

---

## ✅ Готово!

После этих шагов:
- ✅ Страна появится в `ContextSwitcher`
- ✅ Хуки автоматически будут работать через стратегию
- ✅ Dashboard и Tests адаптируются под страну
- ✅ Можно добавлять билеты/темы

---

## 📝 Примеры

### Простая стратегия (работает с единой таблицей)

```typescript
export class SimpleCountryStrategy implements PDDDataStrategy {
  async getTickets(country: CountryCode): Promise<PDDRussiaTicket[]> {
    const { data } = await supabase
      .from('pdd_questions')
      .select('metadata')
      .eq('country_code', country);
    
    // Группируем по билетам из metadata
    // ...
  }
}
```

### Сложная стратегия (специфичная логика экзамена)

```typescript
export class ComplexCountryStrategy implements PDDDataStrategy {
  async getExamQuestions(country: CountryCode) {
    // Своя логика формирования экзамена
    // Например, другая система блоков или правил
  }
}
```

---

## 🎯 Рекомендации

1. **Новые страны** → используйте единую таблицу `pdd_questions`
2. **Legacy страны** (Россия) → оставьте как есть, работает через `RussiaLegacyStrategy`
3. **Специфичная логика** → создайте свою стратегию
4. **Простая логика** → можно переиспользовать базовую стратегию

