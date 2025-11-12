# Исправление отображения имен и счета соперника в дуэлях

## Проблемы, которые были решены

1. **Имена соперников не отображаются** - показывается "Соперник" вместо реального имени
2. **Счет соперника не обновляется** в Telegram WebApp
3. **Ошибки 400 Bad Request** при загрузке профилей

---

## КРИТИЧЕСКИ ВАЖНО: RLS политики для profiles

### Проблема
Политика "Users can view own profile" блокирует доступ к профилям соперников, что вызывает ошибки 400 и отсутствие имен.

### Решение
Применить SQL скрипт `FIX_PROFILES_RLS.sql` в Supabase SQL Editor:

```sql
-- Удаляем ограничивающую политику
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Создаем политику для чтения ВСЕХ профилей
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);
```

**ВАЖНО:** Политика должна иметь `USING (true)` - это разрешает чтение всех профилей.

---

## Правильная загрузка профилей

### ❌ НЕПРАВИЛЬНО (вызывает ошибки 400):

```typescript
// НЕ используйте .in() - может не работать с RLS
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, first_name, username')
  .in('id', userIds);
```

### ✅ ПРАВИЛЬНО (загрузка по одному):

```typescript
// Загружаем профили по одному через Promise.all
const profilePromises = userIds.map(async (userId) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, first_name, username')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error(`Error loading profile for ${userId}:`, error);
    return null;
  }
  
  return { userId, profile };
});

const profileResults = await Promise.all(profilePromises);
const profilesMap = new Map();

profileResults.forEach((result) => {
  if (result && result.profile) {
    profilesMap.set(result.userId, result.profile);
  }
});
```

---

## Использование только существующих колонок

### ❌ НЕПРАВИЛЬНО:

```typescript
// Колонки telegram_username НЕТ в таблице profiles!
.select('id, first_name, username, telegram_username')
```

### ✅ ПРАВИЛЬНО:

```typescript
// Используем только существующие колонки
.select('id, first_name, username')

// Извлечение имени (приоритет: first_name > username)
const name = profile.first_name || profile.username || 'Соперник';
```

---

## Edge Function: правильная загрузка профилей

### В `supabase/functions/duel-manager/index.ts`:

**В action `get_players`:**

```typescript
// Загружаем профили по одному через Promise.all (более надежно чем .in())
const profilePromises = userIds.map(async (userId) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, first_name, username, telegram_id')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error(`[get_players] ❌ Error loading profile for ${userId}:`, error);
    return null;
  }
  
  return { userId, profile };
});

const profileResults = await Promise.all(profilePromises);
const profilesMap = new Map();

profileResults.forEach((result) => {
  if (result && result.profile) {
    profilesMap.set(result.userId, result.profile);
  }
});
```

**Извлечение имени:**

```typescript
// Приоритет: first_name > username
if (profile.first_name && profile.first_name.trim() && profile.first_name !== 'Игрок') {
  name = profile.first_name.trim();
} else if (profile.username && profile.username.trim() && profile.username !== 'Игрок') {
  name = profile.username.trim();
}
```

---

## Fallback для обновления счета соперника в Telegram WebApp

### Проблема
Realtime подписка может не работать в Telegram WebApp, счет не обновляется.

### Решение
Добавить периодическую проверку счета как fallback:

```typescript
// В DuelBattleFullscreen.tsx
useEffect(() => {
  if (!duelId || !myPlayerId || !state.duelStarted) return;
  
  // Проверяем счет каждые 2 секунды как fallback
  const scoreCheckInterval = setInterval(async () => {
    try {
      const { data: players, error } = await supabase
        .from('duel_players')
        .select('id, score, user_id')
        .eq('duel_id', duelId);
      
      if (error) {
        console.error('[DuelBattleFullscreen] Error checking opponent score (fallback):', error);
        return;
      }
      
      if (players && players.length >= 2) {
        const opponent = players.find((p: any) => p.id !== myPlayerId);
        if (opponent && typeof opponent.score === 'number' && opponent.score !== opponentScore) {
          console.log('[DuelBattleFullscreen] 🔄 Fallback: Updating opponent score:', opponent.score);
          setOpponentScore(opponent.score);
        }
      }
    } catch (error) {
      console.error('[DuelBattleFullscreen] Exception in score check fallback:', error);
    }
  }, 2000); // Каждые 2 секунды
  
  return () => clearInterval(scoreCheckInterval);
}, [duelId, myPlayerId, state.duelStarted, opponentScore]);
```

---

## Проверка RLS политик

### SQL запрос для проверки:

```sql
-- Проверяем текущие политики SELECT для profiles
SELECT 
  policyname,
  cmd,
  qual as "USING condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'SELECT';
```

**Ожидаемый результат:**
- Политика "Profiles are viewable by everyone" должна существовать
- `USING condition` должно быть `true`

---

## Быстрое исправление (чеклист)

1. ✅ **Применить RLS политику:**
   - Выполнить `FIX_PROFILES_RLS.sql` в Supabase SQL Editor

2. ✅ **Проверить Edge Function:**
   - Убедиться что `get_players` загружает профили по одному (не через `.in()`)
   - Задеплоить: `supabase functions deploy duel-manager`

3. ✅ **Проверить клиентский код:**
   - Убедиться что используется только `first_name` и `username` (не `telegram_username`)
   - Убедиться что загрузка профилей идет по одному

4. ✅ **Проверить fallback для счета:**
   - Убедиться что есть периодическая проверка счета в `DuelBattleFullscreen.tsx`

---

## Файлы для проверки

### SQL скрипты:
- `FIX_PROFILES_RLS.sql` - исправление RLS политик
- `CHECK_AND_FIX_PROFILES_RLS.sql` - детальная диагностика
- `TEST_PROFILES_ACCESS.sql` - проверка доступа к профилям

### Код:
- `supabase/functions/duel-manager/index.ts` - Edge Function (action `get_players`)
- `src/components/duel/DuelBattleFullscreen.tsx` - основной компонент дуэли
- `src/components/duel/DuelWaitingReplay.tsx` - экран ожидания соперника
- `src/hooks/useDuelRealtime.ts` - Realtime подписка

---

## Типичные ошибки и решения

### Ошибка: "column telegram_username does not exist"
**Решение:** Убрать `telegram_username` из всех запросов, использовать только `first_name` и `username`

### Ошибка: "policy already exists"
**Решение:** Сначала удалить политику, потом создать заново:
```sql
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ...
```

### Ошибка: 400 Bad Request при загрузке профилей
**Решение:** 
1. Проверить RLS политики (должна быть `USING (true)`)
2. Загружать профили по одному, а не через `.in()`

### Проблема: Имена не отображаются в Telegram WebApp
**Решение:**
1. Проверить что Edge Function задеплоен
2. Проверить что RLS политика применена
3. Проверить логи Edge Function в Supabase Dashboard

### Проблема: Счет соперника не обновляется в Telegram WebApp
**Решение:**
1. Проверить что fallback механизм включен (периодическая проверка каждые 2 секунды)
2. Проверить что `myPlayerId` установлен правильно
3. Проверить логи Realtime подписки

---

## Команды для быстрого восстановления

```bash
# 1. Задеплоить Edge Function
supabase functions deploy duel-manager --no-verify-jwt

# 2. Применить SQL скрипт (в Supabase SQL Editor)
# Скопировать содержимое FIX_PROFILES_RLS.sql и выполнить

# 3. Проверить что все работает
# Открыть приложение в Telegram WebApp и проверить логи консоли
```

---

## Контрольные точки

После применения исправлений проверить:

- [ ] RLS политика "Profiles are viewable by everyone" существует с `USING (true)`
- [ ] Edge Function задеплоен и использует загрузку профилей по одному
- [ ] Клиентский код не использует `telegram_username`
- [ ] Fallback для обновления счета включен
- [ ] Имена отображаются в браузере
- [ ] Имена отображаются в Telegram WebApp
- [ ] Счет соперника обновляется в Telegram WebApp

---

**Последнее обновление:** 12 ноября 2024
**Статус:** ✅ Все исправления применены и работают

