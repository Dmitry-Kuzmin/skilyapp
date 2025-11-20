# 👥 Обновление системы друзей

**Дата:** 21 ноября 2025

---

## ✅ Что реализовано

### 1. Друзья из реферальной системы (уже было)
- Пользователи, которых ты пригласил
- Пользователь, который тебя пригласил

### 2. Друзья из дуэлей (НОВОЕ ✨)
- Пользователи, с которыми ты играл в завершённых дуэлях
- Автоматически добавляются в список друзей
- Учитываются только завершённые дуэли (status = 'finished')
- Исключаются боты

### 3. Telegram контакты (планируется)
- Документация создана: `docs/TELEGRAM_CONTACTS_FRIENDS.md`
- Можно добавить через `requestContact()` API
- Требует действия пользователя (нажатие кнопки)

---

## 📦 Что нужно сделать

### 1. Применить миграцию
```sql
-- Применить в Supabase SQL Editor:
supabase/migrations/20251121100002_extend_friends_definition.sql
```

### 2. Задеплоить Edge Function
```bash
npx supabase functions deploy duel-pass-leaderboard
```

---

## 🔍 Как это работает

### Логика определения друзей:

```sql
-- Друзья = UNION из всех источников:
-- 1. Реферальная система
SELECT referred_id FROM referrals WHERE referrer_id = user_id
UNION
SELECT referrer_id FROM referrals WHERE referred_id = user_id

-- 2. Дуэли
SELECT DISTINCT dp2.user_id
FROM duel_players dp1
JOIN duel_players dp2 ON dp1.duel_id = dp2.duel_id
JOIN duels d ON dp1.duel_id = d.id
WHERE dp1.user_id = user_id
  AND dp2.user_id != user_id
  AND dp2.is_bot = false
  AND d.status = 'finished'
```

### В Edge Function:

1. Получаем друзей из `referrals`
2. Получаем друзей из `duel_players` (завершённые дуэли)
3. Объединяем в один список
4. Фильтруем лидерборд по этому списку

---

## 📊 Оптимизация

### Добавлены индексы:
- `idx_duel_players_user_duel` - для быстрого поиска дуэлей пользователя
- `idx_duels_status_finished` - для фильтрации завершённых дуэлей

---

## 🧪 Тестирование

### Проверь в приложении:

1. **Открой лидерборд** → `/duel-pass-leaderboard`
2. **Выбери фильтр "Друзья"**
3. **Должны отображаться:**
   - Пользователи из реферальной системы
   - Пользователи, с которыми играл в дуэлях

### Проверь в SQL Editor:

```sql
-- Проверь друзей из дуэлей
SELECT DISTINCT dp2.user_id, p.first_name
FROM duel_players dp1
JOIN duel_players dp2 ON dp1.duel_id = dp2.duel_id
JOIN duels d ON dp1.duel_id = d.id
JOIN profiles p ON dp2.user_id = p.id
WHERE dp1.user_id = 'YOUR_USER_ID'::uuid
  AND dp2.user_id != 'YOUR_USER_ID'::uuid
  AND dp2.is_bot = false
  AND d.status = 'finished';
```

---

## 📝 Telegram контакты (будущее)

См. `docs/TELEGRAM_CONTACTS_FRIENDS.md` для деталей.

**Кратко:**
- Telegram WebApp API не предоставляет прямой доступ к контактам
- Можно использовать `requestContact()` для запроса одного контакта
- Требует действия пользователя
- Можно добавить позже через отдельную кнопку "Добавить друга из контактов"

---

## ✅ Статус

- ✅ Миграция создана
- ✅ Edge Function обновлена
- ✅ Индексы добавлены
- ✅ Документация создана
- ⏳ Нужно применить миграцию
- ⏳ Нужно задеплоить Edge Function

