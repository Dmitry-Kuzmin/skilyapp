# 🎨 Единая архитектура UI (UI Kit)

## 🎯 Концепция

**Один компонент → Везде используется → Одно изменение → Везде меняется**

Все компоненты вопросов, кнопок, прогресс-баров и типографики унифицированы. Изменение дизайна в одном месте применяется ко всем тестам, дуэлям и играм.

## 📁 Структура

```
src/components/
├── shared/
│   ├── question/
│   │   ├── UniversalQuestionCard.tsx  # Универсальная карточка вопроса
│   │   └── index.ts
│   └── ui/
│       ├── AppButton.tsx              # Универсальная кнопка
│       ├── AppProgressBar.tsx         # Универсальный прогресс-бар
│       ├── Typography.tsx              # Универсальная типографика
│       └── index.ts
└── test/
    ├── QuestionCard.tsx                # Базовая карточка
    ├── QuestionText.tsx                # Текст вопроса
    ├── AnswerButton.tsx                # Кнопка ответа
    ├── QuestionImage.tsx               # Изображение вопроса
    └── index.ts
```

## 🧩 Компоненты

### 1. UniversalQuestionCard

**Универсальная карточка вопроса для ВСЕХ режимов**

```tsx
import { UniversalQuestionCard } from '@/components/shared/question';

// В экзамене РФ
<UniversalQuestionCard
  mode="exam-russia"
  question={question.text}
  image={question.image}
  answers={question.answers}
  selectedAnswerId={selectedId}
  onAnswerClick={handleAnswer}
  showResult={false} // на экзамене не показываем результат сразу
/>

// В обучении
<UniversalQuestionCard
  mode="practice"
  question={question.text}
  answers={question.answers}
  selectedAnswerId={selectedId}
  showResult={true} // в обучении показываем результат
  showExplanationButton={true}
  onAnswerClick={handleAnswer}
/>

// В дуэли
<UniversalQuestionCard
  mode="duel"
  question={question.text}
  answers={question.answers}
  compact={true} // компактный режим
  header={<Timer />} // таймер в header
  onAnswerClick={handleAnswer}
/>
```

**Преимущества:**
- ✅ Один компонент для всех режимов
- ✅ Настраивается через `mode` prop
- ✅ Единый дизайн везде

### 2. AppButton

**Универсальная кнопка приложения**

```tsx
import { AppButton } from '@/components/shared/ui';

// Везде одинаковый дизайн
<AppButton context="primary">Начать тест</AppButton>
<AppButton context="success">Продолжить</AppButton>
<AppButton context="danger">Отменить</AppButton>
```

**Изменение дизайна:**
- Меняешь `AppButton.tsx` → меняется везде (меню, тесты, дуэли, игры)

### 3. AppProgressBar

**Универсальная полоска прогресса**

```tsx
import { AppProgressBar } from '@/components/shared/ui';

// В тесте
<AppProgressBar current={15} total={20} showLabel />

// В дуэли (таймер)
<AppProgressBar 
  current={120} 
  total={300} 
  variant="timer" 
  color="warning" 
/>
```

### 4. Typography

**Универсальная типографика**

```tsx
import { Typography } from '@/components/shared/ui';

<Typography variant="h1">Заголовок</Typography>
<Typography variant="body" color="muted">Текст</Typography>
```

## 🔄 Миграция

### Этап 1: TestSession ✅
- [x] Созданы общие компоненты
- [ ] Заменить дублированный код на `UniversalQuestionCard`
- [ ] Использовать `AppButton` вместо кастомных кнопок
- [ ] Использовать `AppProgressBar` вместо кастомных прогресс-баров

### Этап 2: Дуэли
- [ ] Использовать `UniversalQuestionCard` в `DuelBattleFullscreen`
- [ ] Заменить кнопки на `AppButton`
- [ ] Заменить прогресс-бары на `AppProgressBar`

### Этап 3: Игры
- [ ] Использовать общие компоненты в играх
- [ ] Единый дизайн ответов

## 💡 Примеры использования

### Экзамен ПДД РФ
```tsx
<UniversalQuestionCard
  mode="exam-russia"
  question={question.text}
  image={question.image}
  answers={question.answers}
  selectedAnswerId={selectedId}
  onAnswerClick={handleAnswer}
  header={
    <div className="flex items-center justify-between">
      <AppProgressBar 
        current={russiaExam.progress.current} 
        total={russiaExam.progress.total}
        showLabel
      />
      <Typography variant="small" color="muted">
        Блок {russiaExam.currentBlock}
      </Typography>
    </div>
  }
  footer={
    <AppButton 
      context="primary" 
      onClick={handleSubmit}
      disabled={!selectedId}
    >
      Ответить
    </AppButton>
  }
/>
```

### Обучение (DGT)
```tsx
<UniversalQuestionCard
  mode="practice"
  question={question.text}
  answers={question.answers}
  selectedAnswerId={selectedId}
  showResult={true}
  showExplanationButton={true}
  onAnswerClick={handleAnswer}
  footer={
    <AppButton 
      context="success" 
      onClick={nextQuestion}
      disabled={!selectedId}
    >
      Следующий
    </AppButton>
  }
/>
```

## 🎨 Изменение дизайна

### Пример: Изменить цвет правильного ответа

**Было:** Нужно менять в 5+ местах (TestSession, Duel, Games...)

**Стало:** Меняешь один файл `AnswerButton.tsx`:

```tsx
// Было
border-emerald-500

// Стало
border-green-400 bg-green-50
```

**Результат:** Цвет меняется везде автоматически! 🎉

## 📝 Правила

1. **Всегда используй общие компоненты** из `@/components/shared`
2. **Не создавай кастомные кнопки** - используй `AppButton`
3. **Не создавай кастомные прогресс-бары** - используй `AppProgressBar`
4. **Для вопросов** - всегда `UniversalQuestionCard`

---

**Статус:** Базовая архитектура готова  
**Следующий шаг:** Миграция TestSession на общие компоненты

