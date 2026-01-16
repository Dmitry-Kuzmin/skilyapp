# План Глубокого Рефакторинга TestSession

## Цель
Устранить infinite loop и стабилизировать отображение вопросов в тестовой сессии.

## Обнаруженные проблемы

### 1. Infinite Loop в useTestDataLoader ⚠️ КРИТИЧНО
**Файл:** `src/hooks/test-session/useTestDataLoader.ts:130-135`

**Проблема:**
```typescript
const topicByIdQuestions = useQuestionsByTopicId(
    (mode === 'by-topic' || mode === 'practice') && topicId ? topicId : null,
    pddCountry || null,  // ❌ ВСЕГДА передается, даже если topicId === null
    questionCount,
    topicLevel
);
```

**Почему это вызывает infinite loop:**
1. Когда `mode === 'practice'` но `topicId === null`
2. Хук вызывается с параметрами `(null, "spain", 30, undefined)`
3. React Query кеширует по ключу `['questions-by-topic-id', null, "spain", 30, undefined]`
4. Компонент перерисовывается → хук вызывается снова с теми же параметрами
5. Бесконечный цикл

**Решение:**
```typescript
const shouldLoadByTopicId = ((mode === 'by-topic' || mode === 'practice') && !!topicId && !!pddCountry);
const topicByIdQuestions = useQuestionsByTopicId(
    shouldLoadByTopicId ? topicId : null,
    shouldLoadByTopicId ? pddCountry : null,
    shouldLoadByTopicId ? questionCount : 0,
    shouldLoadByTopicId ? topicLevel : undefined
);
```

### 2. Дублирование хуков
**Файл:** `src/hooks/test-session/useTestDataLoader.ts`

**Проблема:**
- `useTestQuestions` (стр. 91)
- `useQuestionsByTopic` (стр. 122) 
- `useQuestionsByTopicId` (стр. 130)
- `usePDDTopicQuestions` (стр. 147)

Все 4 хука могут загружать вопросы для одного и того же режима!

**Решение:**
Унифицировать в один хук с четкими условиями `enabled`.

### 3. Неправильный маппинг answer_options
**Файл:** `src/hooks/useQuestionsByTopicId.ts:86`

**Проблема:**
```typescript
const correctAnswerChar = metadata.correct_answer || 'a'; // ❌ Неправильный источник
```

**Решение:**
```typescript
const correctAnswerChar = question.correct_answer || 'a'; // ✅ Правильно
```

**ИСПРАВЛЕНО** ✅

### 4. Отсутствие мемоизации
**Файл:** `src/hooks/test-session/useTestDataLoader.ts`

**Проблема:**
Все хуки создают новые объекты на каждом рендере.

**Решение:**
```typescript
const memoizedQuestions = useMemo(() => {
    return topicByIdQuestions.data || [];
}, [topicByIdQuestions.data]);
```

## План исправления

### Шаг 1: Остановить infinite loop ✅
- [x] Диагностировать источник
- [ ] Исправить условие в `useTestDataLoader.ts:130-135`
- [ ] Добавить `enabled` условие в `useQuestionsByTopicId`

### Шаг 2: Упростить логику загрузки
- [ ] Создать единый хук `useTestQuestions`
- [ ] Убрать дублирование
- [ ] Добавить мемоизацию

### Шаг 3: Стабилизировать маппинг
- [x] Исправить `correct_answer` источник
- [ ] Добавить fallback для пустых `answer_options`
- [ ] Типизировать возвращаемые данные

### Шаг 4: Очистить TestSession
- [ ] Удалить неиспользуемые логи
- [ ] Упростить логику рендера
- [ ] Убрать мертвый код

## Следующие действия

1. **Сейчас:** Исправить `useTestDataLoader.ts` строка 130-135
2. **Потом:** Убрать лишние console.log
3. **После:** Протестировать загрузку вопросов

## Прогресс
- [x] Найден источник infinite loop
- [x] Исправлен маппинг `correct_answer`
- [ ] Остановлен infinite loop
- [ ] Удалены дублирующиеся хуки
- [ ] Добавлена мемоизация
