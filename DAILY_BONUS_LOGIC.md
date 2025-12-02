# 📋 Логика работы виджета ежедневных бонусов

## 🎯 Общая концепция

Виджет ежедневных бонусов (DailyRewards) - это геймифицированная система поощрения за регулярный вход в приложение. Система работает по **циклическому 7-дневному циклу** с неограниченным стриком.

---

## 🔄 Циклическая система стриков

### Формула расчета

```typescript
// День недели (1-7, циклический)
const weekDay = currentStreak % 7 || 7;

// Номер недели
const weekNumber = Math.ceil(currentStreak / 7);

// Прогресс внутри недели (0-7)
const weeklyProgress = currentStreak === 0 ? 0 : (currentStreak % 7 === 0 ? 7 : currentStreak % 7);
```

### Примеры расчета

| Текущий стрик | День недели | Неделя | Описание |
|---------------|-------------|---------|----------|
| 0 | 0 | 0 | Новый пользователь |
| 1 | 1 | 1 | Первый день |
| 3 | 3 | 1 | Третий день, неделя 1 |
| 7 | 7 | 1 | **Завершение недели 1** 🎉 |
| 8 | 1 | 2 | Новая неделя началась |
| 14 | 7 | 2 | **Завершение недели 2** 🎉 |
| 21 | 7 | 3 | **Завершение недели 3** 🎉 |

---

## 💰 Логика начислений бонусов

### 1️⃣ Проверка возможности получения (Index.tsx)

```typescript
const handleClaimBonus = async () => {
  // Проверка 1: Есть ли данные daily_bonus
  if (!dashboardData?.daily_bonus || !profileId) {
    console.error('Missing data');
    return;
  }

  // Проверка 2: Можно ли получить сегодня
  if (!dailyBonus.can_claim) {
    toast({ title: "Уже получено" });
    return;
  }
  
  // Проверка 3: Уже получено сегодня (дублирование)
  if (dailyBonus.last_claimed_date === today) {
    toast({ title: "Уже получено" });
    return;
  }
}
```

### 2️⃣ Вычисление нового стрика

```typescript
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

let newStreak = 1;

if (dailyBonus.last_claimed_date === yesterday) {
  // ✅ Продолжаем серию (вчера был получен бонус)
  newStreak = (dailyBonus.current_streak || 0) + 1;
} else if (dailyBonus.last_claimed_date === today) {
  // ❌ Уже получено сегодня
  return;
} else {
  // ❌ Серия прервана (пропущен день)
  newStreak = 1;
}
```

### 3️⃣ Получение награды по дню недели

```typescript
// Циклический расчет: день недели (1-7)
const weekDay = newStreak % 7 || 7;
const weekNumber = Math.ceil(newStreak / 7);

// Получаем награду из daily_bonus_def по дню недели
const currentReward = weeklyRewards.find(r => r.day_number === weekDay);

if (!currentReward) {
  throw new Error('Reward not found');
}
```

### 4️⃣ Начисление наград

**Обновление user_daily_bonus:**
```typescript
await supabase
  .from('user_daily_bonus')
  .update({
    current_streak: newStreak,
    last_claimed_date: today,
    total_claims: (dailyBonus.total_claims || 0) + 1,
  })
  .eq('id', dailyBonus.id);
```

**Обновление XP и монет напрямую:**
```typescript
const updateData: { xp?: number; coins?: number } = {};

if (currentReward.reward.xp > 0) {
  updateData.xp = currentXP + currentReward.reward.xp;
}

if (currentReward.reward.coins > 0) {
  updateData.coins = currentCoins + currentReward.reward.coins;
}

await supabase
  .from('profiles')
  .update(updateData)
  .eq('id', profileId);
```

### 5️⃣ Асинхронные функции (без ожидания)

```typescript
Promise.allSettled([
  // Season SP для Duel Pass
  supabase.functions.invoke('season-sp', {
    body: { 
      user_id: profileId, 
      source_type: 'daily_login',
      metadata: { streak_days: newStreak }
    },
  }),
  
  // Создание записи в coins_transactions
  supabase.functions.invoke('coins-earn', {
    body: { 
      user_id: profileId,
      source_type: 'daily_login',
      metadata: { streak_days: newStreak }
    }
  })
]);
```

---

## 🎁 Структура наград (daily_bonus_def)

| День | XP | Монеты | Особое |
|------|-----|---------|---------|
| 1 | 10 | 5 | Стартовый бонус |
| 2 | 15 | 10 | - |
| 3 | 20 | 15 | - |
| 4 | 25 | 20 | Boost ×2 SP |
| 5 | 30 | 25 | - |
| 6 | 40 | 30 | - |
| 7 | **100** | **50** | 🏆 Badge + Анимация |

**Цикл повторяется каждую неделю!**

---

## 🎨 UI/UX компоненты виджета

### 1. Заголовок

```tsx
<div className="flex items-start gap-3">
  {/* Flame icon */}
  <motion.div>
    <Flame />
  </motion.div>
  
  {/* Текст и badges */}
  <div>
    <h3>Ежедневная серия</h3>
    <div className="flex items-center gap-2">
      <span>Неделя {weekNumber}</span>
      <span>Осталось {7 - weekDay} дня</span> {/* СИНИЙ, ЗАМЕТНЫЙ */}
      {isDay7 && <span>🎉 Завершение!</span>}
    </div>
  </div>
  
  {/* Info кнопка */}
  <button onClick={() => setShowRewardsInfo(!showRewardsInfo)}>
    <Info /> или <X />
  </button>
</div>
```

**Ключевые улучшения:**
- ✅ Badge "Осталось X дней" теперь **синий** (`text-blue-300 bg-blue-500/20`)
- ✅ Все badges на **одной линии**
- ✅ Info кнопка справа

### 2. Круговой прогресс-индикатор

```tsx
<div className="relative w-40 h-40">
  {/* Свечение (3 слоя для глубины) */}
  <motion.div className="bg-gradient-to-br from-orange-500/30..." />
  <motion.div className="bg-gradient-to-br from-yellow-500/20..." />
  <motion.div className="bg-gradient-to-br from-yellow-400/15..." />
  
  {/* SVG круг */}
  <svg>
    {/* Track (серый круг) */}
    <circle stroke="#1e293b" />
    
    {/* Progress (оранжевый градиент) */}
    <motion.circle 
      stroke="url(#fireGradient)"
      strokeDashoffset={strokeDashoffset}
    />
  </svg>
  
  {/* Центр: Flame icon + число */}
  <div className="absolute inset-0">
    <motion.div animate={{ scale, rotate, filter }}>
      <Flame className="w-8 h-8" />
    </motion.div>
    <span className="text-4xl font-bold">{currentStreak}</span>
    <span className="text-[10px]">Дней</span>
  </div>
</div>
```

**Анимации Flame icon:**
- **День 7**: Более сильная анимация с rotation и glow
- **Обычные дни**: Пульсация с drop-shadow
- **После получения**: Статичный с fill

### 3. Week Days Dots (Прогресс недели)

```tsx
<div className="flex justify-between gap-2">
  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
    const isCompleted = day < weeklyProgress || (day === weeklyProgress && hasClaimed);
    const isActive = day === weeklyProgress && !hasClaimed;
    
    return (
      <Tooltip>
        <div className={
          isCompleted ? 'bg-gradient-to-r from-orange-500 to-red-500' :
          isActive ? 'bg-white animate-pulse' :
          'bg-slate-800'
        } />
      </Tooltip>
    );
  })}
</div>
```

### 4. Action Button (Кнопка получения)

```tsx
<motion.button
  onClick={handleClaim}
  disabled={isClaiming || showRewardsInfo || hasClaimed}
  className={
    hasClaimed ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' :
    isClaiming ? 'bg-slate-800/50 text-slate-400 cursor-wait' :
    isDay7 ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500' :
    'bg-gradient-to-r from-white via-slate-50 to-white text-slate-900'
  }
>
  {hasClaimed ? '✓ Получено сегодня' :
   isClaiming ? 'Обработка...' :
   isDay7 ? '🎉 Завершить неделю!' :
   '🎁 Получить бонус'}
</motion.button>
```

**3 состояния кнопки:**
1. **Доступно** - яркая анимация, shimmer эффект
2. **Обработка** - серая, cursor wait
3. **Получено** - серая с галочкой, disabled

### 5. Shimmer эффект

```tsx
{!isClaiming && !hasClaimed && (
  <motion.div
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
    animate={{ x: ['-100%', '200%'] }}
    transition={{
      duration: isDay7 ? 1.2 : 1.5,
      repeat: Infinity,
      repeatDelay: isDay7 ? 0.5 : 0.8,
    }}
  />
)}
```

---

## 🎆 Анимации и эффекты

### 1. Confetti (Canvas-based)

```typescript
const fireConfetti = (startX, startY) => {
  const colors = ['#ff4d00', '#ffb700', '#2ECC71', '#3b82f6', '#8b5cf6', '#ffffff', '#fbbf24'];
  
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 8,
      size: Math.random() * 10 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 120,
      gravity: 0.4,
    });
  }
}
```

**Улучшения:**
- ✅ Увеличено количество: 100 → **150** частиц
- ✅ Больше цветов: 4 → **7** цветов
- ✅ Больше скорость и размер

### 2. CelebrationAnimations

```typescript
if (canPlayCelebration) {
  if (weekDay === 7) {
    // День 7: Полная анимация + модальное окно
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setShowCelebrationModal(true);
    }, celebrationDuration); // 8000ms или 4500ms
  } else {
    // Обычные дни: Короткая анимация
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
    }, celebrationMode === 'reduced' ? 2000 : 3000);
  }
}
```

**Типы анимаций:**
- День 1-6: `'confetti'` - короткая анимация
- День 7: `'phoenix'` - эпическая полноэкранная анимация

### 3. Reward Overlay

```tsx
<AnimatePresence>
  {showReward && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-background/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Flame className="w-10 h-10" />
        <h3>Награда получена! 🎉</h3>
        <span>+{currentStreak} 🔥</span>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 🎯 Состояния виджета

### State Management

```typescript
const [isClaiming, setIsClaiming] = useState(false);           // Процесс получения
const [showReward, setShowReward] = useState(false);           // Overlay награды
const [showCelebration, setShowCelebration] = useState(false); // Анимация празднования
const [showCelebrationModal, setShowCelebrationModal] = useState(false); // Модалка для дня 7
const [showNewWeek, setShowNewWeek] = useState(false);         // Плашка "Новая неделя"
const [showRewardsInfo, setShowRewardsInfo] = useState(false); // Инфо-панель
const [hoveredDay, setHoveredDay] = useState<number | null>(null); // Hover на dots
```

### Флаги состояния

```typescript
const effectiveHasClaimed = hasClaimedToday; // Получено сегодня
const isDay7 = weekDay === 7 && !effectiveHasClaimed; // 7-й день, можно получить
const isNewWeek = weekDay === 1 && currentStreak > 7 && !effectiveHasClaimed; // Новая неделя
```

---

## 🎮 Интерактивные элементы

### 1. Info Button (переключатель)

```tsx
<button onClick={() => setShowRewardsInfo(!showRewardsInfo)}>
  {showRewardsInfo ? <X size={16} /> : <Info size={16} />}
</button>
```

**Эффекты:**
- При открытии: главный контент fadeOut
- При закрытии: главный контент fadeIn
- Кнопка "Получить бонус" скрывается

### 2. Week Days Tooltips

```tsx
<TooltipProvider>
  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
    <Tooltip key={day}>
      <TooltipTrigger>
        <div className="w-full h-2 rounded-full" />
      </TooltipTrigger>
      <TooltipContent>
        <div>День {day}</div>
        <div>{reward.description}</div>
        <div>
          {rewardData.xp > 0 && <span>+{rewardData.xp} XP</span>}
          {rewardData.coins > 0 && <span>+{rewardData.coins} 🪙</span>}
        </div>
      </TooltipContent>
    </Tooltip>
  ))}
</TooltipProvider>
```

### 3. Claim Button Handler

```typescript
const handleClaim = async (e?: React.MouseEvent) => {
  e?.preventDefault();
  e?.stopPropagation();
  
  // Блокировка повторного нажатия
  if (isClaiming || effectiveHasClaimed) {
    return;
  }

  playClickSound();
  setIsClaiming(true);
  setShowReward(true);

  // 🎊 Запуск confetti
  if (buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  // 🎉 Показ celebration анимаций
  if (canPlayCelebration) {
    if (weekDay === 7) {
      // Полная анимация для дня 7
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setShowCelebrationModal(true);
      }, celebrationDuration);
    } else {
      // Короткая анимация
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
  }

  // 💾 Вызов onClaim (начисление бонусов)
  try {
    await onClaim();
    playSuccessSound();
    
    // Держим overlay 3 секунды
    setTimeout(() => setShowReward(false), 3000);
  } catch (error) {
    console.error(error);
    setShowReward(false);
  } finally {
    setTimeout(() => setIsClaiming(false), 1000);
  }
};
```

---

## 🎨 Темы (Light/Dark Mode)

### Адаптивные цвета

```typescript
// Контейнер
const containerBg = isDarkTheme 
  ? 'bg-gradient-to-br from-[#0B1120] via-[#0f172a] to-[#0B1120]'
  : 'bg-gradient-to-br from-white via-slate-50 to-white';

// Badge "Осталось X дней" (УЛУЧШЕНО)
const remainingBadge = isDarkTheme
  ? 'text-blue-300 bg-blue-500/20 border-blue-500/40' // 🌙 Темная тема
  : 'text-blue-700 bg-blue-100 border-blue-300';      // ☀️ Светлая тема

// Flame color
const flameColor = isDarkTheme
  ? effectiveHasClaimed ? 'text-orange-500 fill-orange-500' 
    : isDay7 ? 'text-yellow-400 fill-yellow-400' 
    : 'text-slate-600'
  : effectiveHasClaimed ? 'text-orange-500 fill-orange-500'
    : isDay7 ? 'text-yellow-500 fill-yellow-500'
    : 'text-slate-400';
```

---

## 📊 Диаграмма потока данных

```
User Click "Получить бонус"
         ↓
    handleClaim()
         ↓
    ├─→ playClickSound()
    ├─→ setIsClaiming(true)
    ├─→ setShowReward(true)
    ├─→ fireConfetti()
    └─→ onClaim() (из Index.tsx)
              ↓
         ┌────┴────┐
         │         │
    Calculate   Check
    newStreak   canClaim
         │         │
         └────┬────┘
              ↓
      Get reward from
      daily_bonus_def
      (by weekDay)
              ↓
      ┌──────┴──────┐
      │             │
   Update       Update
   user_daily   profiles
   _bonus       (xp, coins)
      │             │
      └──────┬──────┘
             ↓
    Async functions
    (season-sp, coins-earn)
             ↓
      ✅ Success!
         ↓
    playSuccessSound()
    Show overlay (3s)
    Update UI
```

---

## 🔍 Ключевые изменения и улучшения

### ✅ Что было исправлено:

1. **Блокировка кнопки после получения**
   - До: Можно было кликать несколько раз
   - После: `disabled={isClaiming || showRewardsInfo || effectiveHasClaimed}`

2. **Улучшенная читаемость badge "Осталось X дней"**
   - До: Серый, мелкий текст
   - После: Синий, bold, заметный

3. **Badges на одной линии**
   - До: "Неделя 1" и "Осталось X дней" на разных строках
   - После: Все badges на одной линии

4. **Кнопка возврата в инфо-панели**
   - До: Только X в углу
   - После: X кнопка в заголовке рядом с текстом

5. **Улучшенные анимации**
   - Confetti: 100 → 150 частиц, больше цветов
   - Flame: добавлен drop-shadow и rotation для дня 7
   - Shimmer: быстрее для дня 7

6. **3 состояния кнопки**
   - Доступно: "🎁 Получить бонус"
   - Обработка: "Обработка..."
   - Получено: "✓ Получено сегодня"

---

## 📱 Адаптивность

### Desktop (lg)
- Compact header
- Badges в одну строку
- Info кнопка справа

### Mobile (sm)
- Stack layout
- Badges могут wrap на новую строку
- Увеличенные touch targets

---

## 🐛 Известные проблемы (решены)

1. ~~Кнопка не блокировалась после получения~~ ✅
2. ~~Badge "Осталось X дней" плохо читается~~ ✅
3. ~~Нет кнопки возврата из инфо-панели~~ ✅
4. ~~Badges на разных строках~~ ✅
5. ~~Слабая анимация confetti~~ ✅

---

## 🚀 Рекомендации для дальнейшего улучшения

1. **Звуковые эффекты**
   - Добавить разные звуки для разных дней
   - День 7: торжественная музыка

2. **Haptic Feedback (для мобильных)**
   - Вибрация при получении награды
   - Разная интенсивность для дня 7

3. **Achievements Integration**
   - Отображение unlock бейджей при получении
   - Анимация появления нового бейджа

4. **Analytics**
   - Трекинг кликов на кнопку
   - Трекинг открытия инфо-панели
   - A/B тестирование разных анимаций

5. **Восстановление стрика**
   - Добавить UI для восстановления за монеты
   - Показывать предупреждение о потере стрика

---

## 📚 Связанные файлы

- **Компонент**: `src/components/dashboard-new/DailyRewards.tsx`
- **Логика начисления**: `src/pages/Index.tsx` (`handleClaimBonus`)
- **Данные наград**: Supabase таблица `daily_bonus_def`
- **Пользовательский стрик**: Supabase таблица `user_daily_bonus`
- **Анимации**: `src/components/dashboard-new/CelebrationAnimations.tsx`
- **Модалка**: `src/components/dashboard-new/CelebrationModal.tsx`


