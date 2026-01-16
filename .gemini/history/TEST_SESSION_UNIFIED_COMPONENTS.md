# 🎨 Единые компоненты для всех тестов

## ✅ Что создано

### Общие компоненты (`src/components/test/`)

1. **QuestionCard** - универсальная карточка вопроса
2. **QuestionText** - текст вопроса с поддержкой перевода
3. **AnswerButton** - кнопка ответа с единым дизайном
4. **QuestionImage** - изображение вопроса

### Преимущества

- ✅ Один дизайн для всех тестов
- ✅ Изменения в одном месте применяются везде
- ✅ Легко поддерживать и обновлять
- ✅ Консистентный UX

## 🔄 План миграции

### Этап 1: TestSession (в процессе)
- [x] Создать общие компоненты
- [ ] Заменить дублированный код в TestSession на общие компоненты
- [ ] Добавить режим `exam-russia`
- [ ] Интегрировать логику экзамена РФ

### Этап 2: Дуэли
- [ ] Использовать общие компоненты в `DuelBattleFullscreen`
- [ ] Убрать дублированный код

### Этап 3: Игры
- [ ] Использовать общие компоненты в играх
- [ ] Единый дизайн ответов

## 📝 Использование

```typescript
import { QuestionCard, QuestionText, AnswerButton, QuestionImage } from '@/components/test';

// В компоненте теста
<QuestionCard>
  <QuestionImage imageUrl={question.image_url} />
  <QuestionText 
    text={question.text}
    fontSize={1}
    showTranslation={showTranslation}
    onToggleTranslation={toggleTranslation}
  />
  
  <div className="space-y-2">
    {answers.map(answer => (
      <AnswerButton
        key={answer.id}
        id={answer.id}
        text={answer.text}
        isCorrect={answer.isCorrect}
        isSelected={selectedOption === answer.id}
        showResult={showResult}
        onClick={() => handleAnswer(answer.id)}
      />
    ))}
  </div>
</QuestionCard>
```

## 🎯 Режим exam-russia

### Роутинг
```
/test/exam-russia?country=russia&ticket=4
```

### Особенности
- 20 основных вопросов в 4 блоках
- Алгоритм "5 за 1" (доп. вопросы за ошибки)
- Строгие правила провала
- Отдельный UI для доп. вопросов

### Интеграция в TestSession

```typescript
// Определение режима
const isRussiaExam = mode === 'exam-russia';

// Использование хука
const russiaExam = useRussiaExam(questions);

// В handleAnswer
if (isRussiaExam) {
  const result = russiaExam.handleAnswer(isCorrect);
  if (!result.shouldContinue) {
    // Провал - показать результаты
  }
}
```

---

**Статус:** В процессе интеграции  
**Приоритет:** Высокий


