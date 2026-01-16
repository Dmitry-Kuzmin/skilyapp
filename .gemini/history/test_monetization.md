# 🧪 Тестирование системы монетизации на localhost

## ✅ Что проверить:

### 1. Dev сервер запущен
- Откройте: http://localhost:8080
- Приложение должно загрузиться без ошибок

### 2. Проверка Premium статуса
- Войдите в приложение
- Откройте консоль браузера (F12)
- Проверьте, что нет ошибок при загрузке
- Проверьте, что `usePremium` hook работает

### 3. Проверка Edge Functions

#### A. Premium Status
```javascript
// В консоли браузера выполните:
const { data } = await supabase.functions.invoke('premium-status', {
  body: { user_id: 'YOUR_PROFILE_ID' }
});
console.log('Premium Status:', data);
```

#### B. Complete Test & Award
```javascript
// Тест начисления наград за тест
const { data } = await supabase.functions.invoke('complete-test-and-award', {
  body: { 
    user_id: 'YOUR_PROFILE_ID',
    session_id: crypto.randomUUID(),
    score: 92,
    questions_count: 30,
    correct_count: 28,
    test_duration_seconds: 780,
    premium_flag: false,
    double_sp_active: false,
  }
});
console.log('Test Rewards:', data);
```

#### C. Duel Pass XP
```javascript
// Тест начисления XP
const { data } = await supabase.functions.invoke('duel-pass-xp', {
  body: { 
    user_id: 'YOUR_PROFILE_ID',
    source_type: 'test'
  }
});
console.log('Duel Pass XP:', data);
```

### 4. Проверка UI компонентов

- ✅ PaywallModal должен открываться при необходимости
- ✅ DuelPassProgress должен показывать прогресс
- ✅ Монеты должны отображаться в интерфейсе
- ✅ Premium статус должен отображаться корректно

### 5. Проверка базы данных

В Supabase Dashboard → Table Editor проверьте:

- ✅ `profiles` - должны быть новые поля монетизации
- ✅ `transactions` - должны создаваться записи
- ✅ `duel_pass_rewards` - должны быть 10 уровней
- ✅ `user_claimed_rewards` - должна быть пустой (пока)

---

## 🐛 Возможные проблемы:

### Edge Function возвращает ошибку
- Проверьте секреты в Supabase Dashboard
- Проверьте логи Edge Functions

### Premium статус не определяется
- Проверьте, что `trial_until` или `premium_until` установлены в `profiles`
- Проверьте логику в `premium-status` функции

### Монеты не начисляются
- Проверьте логи `complete-test-and-award` функции
- Проверьте таблицу `transactions`
- Проверьте баланс в `profiles.coins`

---

## 📝 Чеклист проверки:

- [ ] Dev сервер запущен
- [ ] Приложение открывается без ошибок
- [ ] Premium статус определяется
- [ ] Монеты отображаются
- [ ] Edge Functions отвечают
- [ ] База данных содержит нужные таблицы
- [ ] UI компоненты монетизации работают

