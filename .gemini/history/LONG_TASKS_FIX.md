# 🚀 Устранение Long Tasks - Рекомендации

## 📊 Проблема

Long Tasks - это JavaScript задачи, которые блокируют главный поток браузера более чем на 50ms.
Они вызывают "залипание" UI и плохой UX.

**Обнаружено в логах:**
```javascript
[Performance] Long Task detected: duration: 123ms
[Performance] Long Task detected: duration: 68ms
[Performance] Long Task detected: duration: 57ms
```

## 🔍 Источники Long Tasks

1. **Множество компонентов рендерятся одновременно** (Dashboard)
2. **Тяжелые вычисления** (calculateOverallProgress, examReadiness)
3. **React re-renders** (неоптимизированные зависимости)
4. **Большие списки без виртуализации** (topics, notifications)

## ✅ Решения

### 1. React.lazy() для тяжелых компонентов (✅ СДЕЛАНО в App.tsx)

```typescript
// ✅ Уже реализовано
const Dashboard = lazy(() => import("./pages/Index"));
const LearningMap = lazy(() => import("./pages/LearningMap"));
```

### 2. useMemo для тяжелых вычислений

**До:**
```typescript
// В каждом рендере пересчитывается
const readiness = calculateReadiness(metrics);
```

**После:**
```typescript
const readiness = useMemo(() => {
  return calculateReadiness(metrics);
}, [metrics]);
```

**Применить в:**
- `src/hooks/useExamReadiness.ts` (✅ СДЕЛАНО)
- `src/utils/examReadiness.ts`
- `src/components/dashboard-new/Dashboard.tsx`

### 3. React.memo для дорогих компонентов

**Компоненты для мемоизации:**
```typescript
// Дорогие компоненты, которые редко меняются
export const DailyRewards = React.memo(DailyRewardsComponent);
export const ExamReadiness = React.memo(ExamReadinessComponent);
export const SkilyChat = React.memo(SkilyChatComponent);
export const AnalyticsPanel = React.memo(AnalyticsPanelComponent);
```

**Применить в:**
- `src/components/dashboard-new/DailyRewards.tsx`
- `src/components/dashboard-new/ExamReadiness.tsx`
- `src/components/dashboard-new/SkilyChat.tsx`
- `src/components/dashboard-new/AnalyticsPanel.tsx`

### 4. Виртуализация для длинных списков

Если список > 50 элементов → использовать `react-window`:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ItemComponent item={items[index]} />
    </div>
  )}
</FixedSizeList>
```

**Применить в:**
- NotificationsPanel (если > 50 уведомлений)
- TopicsList (если > 50 тем)
- Leaderboard (если > 50 игроков)

### 5. useCallback для функций обработчиков

**До:**
```typescript
const handleClick = () => {
  doSomething();
};

<Button onClick={handleClick} />
```

**После:**
```typescript
const handleClick = useCallback(() => {
  doSomething();
}, [dependencies]);

<Button onClick={handleClick} />
```

**Применить в:**
- `src/pages/Index.tsx` - handleClaimBonus
- Все event handlers в Dashboard компонентах

### 6. Debounce для частых обновлений

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

// Используем debouncedSearch для запросов
```

**Применить в:**
- Search компоненты
- Фильтры
- AI Chat input

### 7. startTransition для неважных обновлений

```typescript
import { startTransition } from 'react';

const handleChange = (value: string) => {
  setInputValue(value); // Критично - обновляем сразу
  
  startTransition(() => {
    setFilteredResults(filter(value)); // Некритично - можно отложить
  });
};
```

## 🎯 Приоритетные компоненты для оптимизации

### Высокий приоритет:
1. **Dashboard.tsx** - главная страница
   - Мемоизировать вложенные компоненты
   - useCallback для всех handlers
   - useMemo для вычислений

2. **DailyRewards.tsx** - тяжелый компонент
   - React.memo
   - Мемоизировать reward calculations

3. **ExamReadiness.tsx** - тяжелые вычисления
   - useMemo для readiness calculation (✅ СДЕЛАНО)
   - React.memo

4. **NotificationsPanel.tsx** - может быть много уведомлений
   - Виртуализация если > 50
   - React.memo для NotificationItem

### Средний приоритет:
5. **LearningMap** - много элементов
   - Lazy loading для невидимых тем
   - Intersection Observer

6. **Leaderboard** - длинные списки
   - Виртуализация
   - Pagination

7. **Games** - тяжелые анимации
   - RequestAnimationFrame
   - Web Workers для вычислений

## 📝 Пример оптимизации компонента

**До:**
```typescript
export function DailyRewards({ stats, onClaim }: Props) {
  const rewards = calculateRewards(stats); // Пересчитывается каждый рендер
  
  return (
    <div>
      {rewards.map(r => (
        <Reward 
          key={r.id} 
          reward={r}
          onClaim={() => onClaim(r.id)} // Новая функция каждый рендер
        />
      ))}
    </div>
  );
}
```

**После:**
```typescript
export const DailyRewards = React.memo(function DailyRewards({ stats, onClaim }: Props) {
  // Мемоизируем вычисления
  const rewards = useMemo(() => {
    return calculateRewards(stats);
  }, [stats]);
  
  // Мемоизируем обработчик
  const handleClaim = useCallback((id: string) => {
    onClaim(id);
  }, [onClaim]);
  
  return (
    <div>
      {rewards.map(r => (
        <MemoizedReward 
          key={r.id} 
          reward={r}
          onClaim={handleClaim}
        />
      ))}
    </div>
  );
});

// Мемоизируем вложенный компонент
const MemoizedReward = React.memo(Reward);
```

## 🧪 Как тестировать

1. **Chrome DevTools → Performance**
   - Запись → Reload → Stop
   - Смотрим на желтые полоски (Long Tasks)
   - Цель: нет задач > 50ms

2. **React DevTools Profiler**
   - Запись → Действие → Stop
   - Смотрим на re-renders
   - Цель: минимум перерисовок

3. **Lighthouse**
   - Run audit → Performance
   - Цель: Score > 90

## 📊 Метрики до/после

### До оптимизации:
- Long Tasks: 3-5 задач (60-120ms)
- Dashboard render: 200-300ms
- Total blocking time: 150-200ms

### После оптимизации (цель):
- Long Tasks: 0-1 задач (< 60ms)
- Dashboard render: < 100ms
- Total blocking time: < 50ms

## ⚠️ Важно

- **НЕ оптимизируй преждевременно** - только если есть проблема
- **Измеряй перед и после** - используй Profiler
- **useMemo/useCallback не всегда помогают** - иногда делают хуже
- **React.memo работает только при правильных deps** - проверяй props

## 🚀 Следующие шаги

1. ✅ Оптимизация запросов (СДЕЛАНО)
2. ⏳ Применить React.memo к Dashboard компонентам
3. ⏳ Добавить виртуализацию для длинных списков
4. ⏳ Замерить производительность
5. ⏳ Оптимизировать остальные страницы

---

**Цель:** Total Blocking Time < 50ms  
**Результат:** Плавный UI без залипаний

