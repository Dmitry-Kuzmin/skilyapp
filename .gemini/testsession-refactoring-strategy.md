# 🏗️ Стратегия рефакторинга TestSession.tsx

## Текущее состояние:
- **3000 строк** - монолитный компонент
- **Mixы:** UI логика + бизнес-логика + хуки + обработчики
- **Zustand:** используется ТОЛЬКО здесь (хорошо!)

---

## 📋 Фазы рефакторинга (по приоритету):

### **ФАЗА 1: Вынести UI компоненты** ✅ (МОЖНО ДЕЛАТЬ СРАЗУ)

**Цель:** Разбить огромный JSX на мелкие компоненты

#### Что выносим:
1. `TestHeader` - вся логика шапки (таймер, прогресс, кнопки)
2. `QuestionCard` - отображение вопроса + изображение
3. `AnswerSection` - уже есть `AnswerOptionsList`, но можно обернуть с логикой
4. `ExplanationPanel` - панель с объяснением после ответа
5. `NavigationButtons` - кнопки Назад/Вперед
6. `ModalManager` - все модалки в одном месте

**Выгода:** 
- ↓ 1000-1500 строк сразу  
- ✅ Легче читать JSX  
- ✅ Компоненты переиспользуемые

---

### **ФАЗА 2: Группировка хуков по домену** ✅ (МОЖНО ДЕЛАТЬ ПАРАЛЛЕЛЬНО)

**Цель:** Собрать разрозненные хуки в логические группы

#### Создать файлы:
```
src/hooks/test-session/
  ├── useTestState.ts      - Zustand селекторы (все useExamStore)
  ├── useTestActions.ts    - Методы из Zustand (answerQuestion, nextQuestion...)
  ├── useModalManagement.ts - Управление модалками
  └── useTestEffects.ts    - Все useEffect в одном месте
```

**Пример `useTestState.ts`:**
```typescript
export const useTestState = () => {
  const activeState = useExamStore(s => s.activeState);
  const timeLeft = useExamStore(selectTimerValue);
  const selectedOption = useExamStore(s => s.activeState?.kind === 'standard' 
    ? s.activeState.selectedOption : null);
  const feedbackStatus = useExamStore(s => s.activeState?.kind === 'standard' 
    ? s.activeState.feedbackStatus : 'idle');
  
  return { activeState, timeLeft, selectedOption, feedbackStatus };
};
```

**Выгода:**
- ↓ 300-500 строк из TestSession  
- ✅ Единая точка доступа к Zustand  
- ✅ Легко тестировать

---

### **ФАЗА 3: Вынести бизнес-логику в сервисы** 🔶 (ПОСЛЕ ФАЗЫ 1-2)

**Цель:** Отделить чистую логику от React

#### Создать:
```
src/services/test-session/
  ├── answerProcessing.ts  - Обработка ответов
  ├── progressCalculator.ts - Подсчет прогресса
  ├── questionNavigation.ts - Логика навигации
  └── challengeBankSync.ts  - Синхронизация с Challenge Bank
```

**Пример `answerProcessing.ts`:**
```typescript
export const processAnswer = (
  questionId: string,
  answerId: string,
  isCorrect: boolean
) => {
  return {
    xpGained: isCorrect ? 10 : 0,
    shouldAddToBank: !isCorrect,
    feedbackMessage: isCorrect ? 'Верно! 🎉' : 'Подумай еще 🤔',
  };
};
```

**Выгода:**
- ✅ Легко тестировать (чистые функции)  
- ✅ Переиспользование в других местах  
- ↓ 200-300 строк

---

### **ФАЗА 4: Оптимизировать Zustand** 🔶 (ОПЦИОНАЛЬНО)

**Цель:** Разделить monolithic `examStore` на слайсы

#### Создать слайсы:
```
src/store/slices/
  ├── timerSlice.ts       - Таймер
  ├── navigationSlice.ts  - Навигация
  ├── answersSlice.ts     - Ответы
  └── feedbackSlice.ts    - Фидбек
```

**Объединить:**
```typescript
export const useExamStore = create<ExamStore>()(
  (...args) => ({
    ...createTimerSlice(...args),
    ...createNavigationSlice(...args),
    ...createAnswersSlice(...args),
    ...createFeedbackSlice(...args),
  })
);
```

**Выгода:**
- ✅ Модульная архитектура  
- ✅ Легче поддерживать  
- ⚠️ Требует рефакторинга всех компонентов

---

## 🎯 Рекомендуемый порядок:

### **Неделя 1: ФАЗА 1**
1. Вынести `TestHeader`
2. Вынести `QuestionCard`
3. Вынести `ExplanationPanel`
4. Вынести `ModalManager`

**Результат:** TestSession.tsx ↓ **~2000 строк**

### **Неделя 2: ФАЗА 2**
1. Создать `useTestState`
2. Создать `useTestActions`
3. Создать `useModalManagement`

**Результат:** TestSession.tsx ↓ **~1500 строк**

### **Неделя 3: ФАЗА 3** (опционально)
1. Вынести `answerProcessing`
2. Вынести `progressCalculator`

**Результат:** TestSession.tsx ↓ **~1200 строк**

---

## ⚡ Быстрый старт (прямо сейчас!):

### Шаг 1: Вынести `TestHeader`
```bash
# 1. Создать файл
touch src/components/test-session/TestHeader.tsx

# 2. Вынести логику:
- Таймер
- Прогресс-бар
- Кнопка "Завершить"
- Индикатор режима
```

### Шаг 2: Использовать в TestSession
```tsx
// Было: 200+ строк JSX
<TestHeader 
  mode={mode}
  timeLeft={timeLeft}
  currentIndex={currentIndex}
  totalQuestions={questions.length}
  onFinish={handleFinish}
/>
```

**Выгода СРАЗУ:** ↓ ~200 строк! 🎉

---

## 🚨 Правила рефакторинга:

1. ✅ **Один PR = одна фаза** (чтобы не сломать)
2. ✅ **Тестируй после каждого шага**
3. ✅ **Не меняй логику**, только структуру
4. ✅ **Используй TypeScript** для безопасности
5. ❌ **НЕ трогай Zustand** пока не вынесешь UI

---

## 📊 Прогноз:

| После | Строк | Читаемость | Поддержка |
|-------|-------|------------|-----------|
| Сейчас | 3000 | ⭐️ | ⭐️ |
| Фаза 1 | 2000 | ⭐️⭐️⭐️ | ⭐️⭐️⭐️ |
| Фаза 2 | 1500 | ⭐️⭐️⭐️⭐️ | ⭐️⭐️⭐️⭐️ |
| Фаза 3 | 1200 | ⭐️⭐️⭐️⭐️⭐️ | ⭐️⭐️⭐️⭐️⭐️ |

**Итоговый файл:** 1200 строк чистой оркестрации! 🎯
