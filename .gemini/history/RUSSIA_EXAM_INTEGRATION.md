# 🚦 Интеграция экзамена ПДД РФ с алгоритмом "5 за 1"

## 📋 Требования

Реализовать специфичную логику экзамена ПДД РФ в TestSession или создать отдельный компонент.

## 🎯 Алгоритм экзамена

### Структура
- **20 основных вопросов** в 4 блоках (по 5 вопросов)
- **Базовое время:** 20 минут
- **Доп. вопросы:** +5 за каждую ошибку (из той же темы)
- **Доп. время:** +5 минут за каждую ошибку

### Правила провала
1. **2 ошибки в одном блоке** → НЕ СДАН (сразу)
2. **3 ошибки всего** → НЕ СДАН
3. **Ошибка в доп. вопросе** → НЕ СДАН

### Правила сдачи
1. **0 ошибок** → СДАН
2. **1 ошибка** → +5 доп. вопросов, все верно → СДАН
3. **2 ошибки в разных блоках** → +10 доп. вопросов, все верно → СДАН

## 🔧 Реализация

### Вариант 1: Интеграция в TestSession (рекомендуется)

Добавить режим `exam-russia` в TestSession:

```typescript
// В TestSession.tsx
const isRussiaExam = mode === 'exam-russia';

// Использовать RussiaExamState вместо обычного состояния
const [russiaExamState, setRussiaExamState] = useState<RussiaExamState | null>(null);

// При загрузке вопросов
if (isRussiaExam) {
  const state = createRussiaExamState(questions, 20 * 60);
  setRussiaExamState(state);
}

// При ответе
if (isRussiaExam && russiaExamState) {
  const result = handleMainQuestionAnswer(
    russiaExamState,
    currentIndex,
    isCorrect
  );
  
  const newState = applyAnswerToState(russiaExamState, result, questionId);
  setRussiaExamState(newState);
  
  if (!result.shouldContinue) {
    // Провал - показать результаты
    navigate('/test/results', { state: { ... } });
  }
}
```

### Вариант 2: Отдельный компонент (проще для начала)

Создать `RussiaExamSession.tsx` - обёртку над TestSession с логикой РФ.

## 📝 Что уже готово

✅ Типы (`src/types/pddExam.ts`):
- `RussiaExamState` - состояние экзамена
- `ExamBlock` - тематический блок
- `AnswerResult` - результат ответа

✅ Логика (`src/utils/russiaExamLogic.ts`):
- `handleMainQuestionAnswer()` - обработка основного вопроса
- `handleExtraQuestionAnswer()` - обработка доп. вопроса
- `applyAnswerToState()` - применение результата
- `getExamStats()` - статистика

✅ Хук (`src/hooks/usePDDExamQuestions.ts`):
- Получение вопросов билета для экзамена

## 🚧 Что нужно сделать

1. **Интегрировать в TestSession** или создать отдельный компонент
2. **Получение доп. вопросов** из той же темы (сейчас заглушка)
3. **UI для доп. вопросов** - экран перехода между основными и доп.
4. **Результаты экзамена** - показать блоки, ошибки, доп. вопросы

## 🎨 UX для доп. вопросов

После 20 основных вопросов:

```
┌─────────────────────────────────────┐
│  ⚠️ Вы допустили ошибку             │
│                                     │
│  Вам назначено 5 дополнительных     │
│  вопросов из темы "Дорожные знаки"  │
│                                     │
│  ⏱️ +5 минут времени                │
│  ❌ Права на ошибку больше нет      │
│                                     │
│  [Начать доп. вопросы]             │
└─────────────────────────────────────┘
```

## 🔗 Роутинг

```
/test/exam-russia?country=russia&ticket=4
```

Или через главную страницу:
```
/learn/russia/ticket/4/exam
```

---

**Приоритет:** Высокий  
**Сложность:** Средняя-Высокая  
**Время:** 4-6 часов


