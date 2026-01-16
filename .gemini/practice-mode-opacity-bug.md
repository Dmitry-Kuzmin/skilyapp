# КРИТИЧЕСКАЯ ПРОБЛЕМА: Невидимые варианты ответов в Practice Mode

## Симптомы
- ✅ Кнопки есть в DOM (React их рендерит)
- ✅ Кнопки кликабельны (handleAnswer срабатывает)
- ❌ Кнопки невидимы (opacity: 0)
- ✅ В других режимах (Exam, Blitz, etc.) все работает

## Попытки исправления
1. ✅ Исправлен infinite loop в useTestDataLoader
2. ✅ Исправлен маппинг answer_options (question.correct_answer)
3. ❌ Добавлен inline style={{ opacity: 1 }} в строке 2477 TestSession.tsx
4. ❌ Добавлено глобальное CSS правило `.space-y-2 > button { opacity: 1 !important; }`
5. ✅ Выполнен Hard Refresh (Cmd+Shift+R)

## Гипотезы почему не работает

### Гипотеза 1: Practice использует ДРУГОЙ компонент
**Вероятность: 90%**

Practice mode может использовать:
- `UniversalQuestionCard` вместо прямого рендера кнопок
- Отдельную секцию JSX с другими классами
- Условный рендеринг через mode === 'practice'

**Что проверить:**
```bash
grep -n "mode === 'practice'" src/pages/TestSession.tsx
grep -n "UniversalQuestionCard" src/pages/TestSession.tsx
```

### Гипотеза 2: Framer Motion анимация
**Вероятность: 60%**

Может быть AnimatePresence или motion.div с:
```tsx
initial={{ opacity: 0 }}
animate={{ opacity: shouldShow ? 1 : 0 }}
```

### Гипотеза 3: Родительский контейнер
**Вероятность: 40%**

Родительский div может иметь:
```css
.practice-mode-container {
  opacity: 0;
}
```

## 3 ВАРИАНТА РЕШЕНИЯ

### Вариант A: Быстрый хак (5 мин)
Добавить в консоль браузера:
```javascript
document.querySelectorAll('button').forEach(b => b.style.opacity = '1');
setInterval(() => { 
  document.querySelectorAll('button').forEach(b => b.style.opacity = '1');
}, 100);
```

Это покажет все кнопки и мы увидим где проблема.

### Вариант B: Найти правильный компонент (15 мин)
1. Открыть React DevTools
2. Найти Practice mode в дереве компонентов
3. Посмотреть какой компонент рендерит варианты ответов
4. Исправить opacity в нужном месте

### Вариант C: Удалить весь opacity (30 мин)
Найти ВСЕ упоминания opacity в TestSession.tsx:
```bash
grep -n "opacity" src/pages/TestSession.tsx
```
И закомментировать все что связано с кнопками вариантов.

## Рекомендация

**Вариант A прямо сейчас** → увидим кнопки → поймем где искать
**Потом Вариант B** → исправим правильно

## Следующий шаг

Дим, выполни в консоли браузера (F12 → Console):

```javascript
// Показать ВСЕ кнопки
document.querySelectorAll('button').forEach(btn => {
  btn.style.opacity = '1';
  btn.style.visibility = 'visible';
  console.log('Fixed button:', btn.textContent.substring(0, 30));
});
```

Пришли результат - если кнопки появятся, значит проблема точно в CSS и мы узнаем какой текст на кнопках!
