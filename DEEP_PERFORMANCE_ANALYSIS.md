# 🔍 Глубокий анализ производительности

**Дата:** 2025-12-01  
**Статус:** В процессе

## 📊 Текущее состояние

### Найденные проблемы:

1. **114+ прямых запросов в компонентах и страницах:**
   - 59 в компонентах
   - 55 в страницах
   - Все должны быть через React Query

2. **Проблемные паттерны:**
   - Heartbeat каждые 15 секунд в DuelBattleFullscreen
   - Множественные запросы без кэширования
   - Запросы в useEffect без React Query
   - Последовательные запросы вместо batch

---

## 🎯 Приоритетные оптимизации

### 1. Heartbeat в дуэлях (КРИТИЧНО)

**Файл:** `src/components/duel/DuelBattleFullscreen.tsx:317-336`

**Проблема:** 
- Edge Function вызывается каждые 15 секунд
- Нет кэширования
- Можно оптимизировать через Realtime

**Решение:**
- Использовать Realtime для статуса активности
- Heartbeat только при необходимости (fallback)
- Кэшировать результаты

### 2. Прямые запросы в компонентах

**Проблема:** 114+ прямых запросов без React Query

**Приоритетные файлы:**
- `src/components/duel/DuelBattleFullscreen.tsx` - 5 запросов
- `src/components/duel/DuelResult.tsx` - 4 запроса
- `src/components/duel/DuelWaitingReplay.tsx` - 7 запросов
- `src/pages/games/Duel.tsx` - 5 запросов
- `src/pages/TestSession.tsx` - 3 запроса
- `src/pages/admin/AdminDashboard.tsx` - 6 запросов

**Решение:**
- Создать хуки через React Query для всех запросов
- Заменить прямые запросы на хуки

### 3. Загрузка данных без кэширования

**Проблема:** Множественные компоненты загружают данные при каждом монтировании

**Примеры:**
- `GuessTheSign.tsx` - загрузка знаков при каждом монтировании
- `AdminDashboard.tsx` - обновление каждые 30 секунд без кэша
- `DuelResult.tsx` - загрузка результатов без кэша

**Решение:**
- Использовать React Query с правильным staleTime
- Кэшировать статические данные (знаки, темы)

### 4. Batch запросы

**Проблема:** Последовательные запросы вместо batch

**Примеры:**
- Загрузка профилей по одному
- Загрузка вопросов с опциями отдельно
- Загрузка прогресса по темам отдельно

**Решение:**
- Использовать `.in()` для множественных запросов
- Объединять связанные запросы в один

---

## 📋 План оптимизации

### Фаза 1: Критичные компоненты (приоритет 1)

1. ✅ Оптимизировать heartbeat в дуэлях
2. ✅ Создать хуки для дуэлей через React Query
3. ✅ Оптимизировать загрузку результатов дуэли

### Фаза 2: Часто используемые компоненты (приоритет 2)

4. ✅ Оптимизировать TestSession
5. ✅ Оптимизировать игры (GuessTheSign, RaceGame, etc.)
6. ✅ Оптимизировать AdminDashboard

### Фаза 3: Остальные компоненты (приоритет 3)

7. ✅ Заменить все прямые запросы на хуки
8. ✅ Добавить кэширование для статических данных
9. ✅ Оптимизировать batch запросы

---

## 🔧 Конкретные исправления

### 1. Heartbeat оптимизация

```typescript
// ❌ ПЛОХО (текущий код)
useEffect(() => {
  const heartbeatInterval = setInterval(async () => {
    await supabase.functions.invoke('duel-manager', {
      body: { action: 'heartbeat', duel_id: duelId, profile_id: profileId }
    });
  }, 15000);
  return () => clearInterval(heartbeatInterval);
}, [duelId, profileId]);

// ✅ ХОРОШО (оптимизированный)
// Использовать Realtime для статуса, heartbeat только как fallback
useEffect(() => {
  // Realtime подписка на статус активности
  const channel = supabase
    .channel(`duel_activity_${duelId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'duel_players',
      filter: `duel_id=eq.${duelId}`
    }, (payload) => {
      // Обновляем статус из Realtime
      updateOpponentStatus(payload.new);
    })
    .subscribe();

  // Heartbeat только как fallback (каждые 60 секунд)
  const heartbeatInterval = setInterval(async () => {
    // Проверяем, есть ли Realtime соединение
    if (channel.state === 'joined') {
      // Realtime работает, heartbeat не нужен
      return;
    }
    // Fallback на heartbeat
    await supabase.functions.invoke('duel-manager', {
      body: { action: 'heartbeat', duel_id: duelId, profile_id: profileId }
    });
  }, 60000); // Увеличено до 60 секунд

  return () => {
    clearInterval(heartbeatInterval);
    supabase.removeChannel(channel);
  };
}, [duelId, profileId]);
```

### 2. Создание хуков для дуэлей

```typescript
// src/hooks/useDuelResults.ts
export function useDuelResults(duelId: string | null, profileId: string | null) {
  return useQuery({
    queryKey: ['duel-results', duelId, profileId],
    queryFn: async () => {
      // Объединяем все запросы в один или batch
      const [duelData, playersData, answersData] = await Promise.all([
        supabase.from('duels').select('*').eq('id', duelId).single(),
        supabase.from('duel_players').select('*, profiles(*)').eq('duel_id', duelId),
        supabase.from('duel_answers').select('*, duel_questions(*)')
          .eq('duel_id', duelId)
          .eq('player_id', myPlayerId)
      ]);
      // Объединяем данные
      return { duel: duelData.data, players: playersData.data, answers: answersData.data };
    },
    enabled: !!duelId && !!profileId,
    staleTime: 1 * 60 * 1000, // 1 минута
  });
}
```

### 3. Кэширование статических данных

```typescript
// src/hooks/useRoadSigns.ts
export function useRoadSigns() {
  return useQuery({
    queryKey: ['road-signs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('road_signs')
        .select('*')
        .limit(200);
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 минут - статические данные
    gcTime: 60 * 60 * 1000, // 1 час
  });
}
```

---

## 📈 Ожидаемые результаты

После всех оптимизаций:

- **Запросы к Supabase:** с ~150 до ~30-40 (-75%)
- **Edge Functions:** с ~35 до ~3-5 (-90%)
- **Время загрузки:** с ~3-4 сек до ~1 сек (-75%)
- **Нагрузка на Supabase:** -80%

---

**Статус:** В процессе оптимизации

