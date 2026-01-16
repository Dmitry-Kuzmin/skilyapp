# План чистки legacy кода

## 1. useTestDataLoader.ts
- ❌ Удалить `const practiceQuestions = useTestQuestions(...)` (строки 83-88)
- ❌ Удалить `practiceQuestions` из dependency array (строка 337)
- ❌ Удалить `import { useTestQuestions }` если он есть

## 2. useQuestionsByTopicId.ts
- ❌ Удалить все диагностические логи (строки 35-45, 120-130)

## 3. TestSession.tsx
- ❌ Удалить диагностический лог dataLoader.questions (строки 462-470)
- ❌ Удалить диагностический лог currentQuestion (строка 837)

## 4. AnswerOptionsList.tsx  
- ❌ Удалить диагностический лог options (строка 206)

## 5. Проверить файл useTestQuestions.ts
- 🔍 Если он больше нигде не используется - УДАЛИТЬ ПОЛНОСТЬЮ

## 6. Очистить временные файлы
- ❌ Удалить .gemini/add-log*.sh
- ❌ Удалить .gemini/check-*.sql
- ❌ Удалить .backup файлы

## Результат:
✅ Чистый, понятный код
✅ Один источник истины для загрузки вопросов
✅ Никаких лишних логов
