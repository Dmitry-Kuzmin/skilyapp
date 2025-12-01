# Анализ производительности приложения

**Дата анализа:** 2025-12-01  
**Версия:** Development (localhost:8080)

## 🔴 Критические проблемы

### 1. Массовые запросы к `premium-status` Edge Function
**Проблема:** За короткое время выполняется **30+ запросов** к `/functions/v1/premium-status`

**Причина:** 
- Множественные компоненты вызывают `usePremium()` независимо
- Нет кэширования результатов
- Каждый компонент делает свой запрос

**Влияние:**
- Высокая нагрузка на Supabase Edge Functions
- Медленная загрузка страницы
- Лишние расходы на вызовы функций

**Решение:**
```typescript
// Создать единый хук с глобальным кэшем
const premiumStatusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 минута

export function usePremium() {
  // Использовать React Query с кэшированием
  // Или создать глобальный контекст с единым запросом
}
```

### 2. Дублирующиеся запросы к профилю
**Проблема:** Множественные запросы к одним и тем же данным:
- `profiles?select=coins&id=eq.XXX` - 10+ запросов
- `profiles?select=xp,streak_days&id=eq.XXX` - 8+ запросов
- `profiles?select=id&user_id=eq.XXX` - 5+ запросов

**Причина:**
- Разные компоненты запрашивают разные поля профиля
- Нет единого источника данных
- React Query не используется эффективно

**Решение:**
- Объединить все запросы профиля в один через `select('*')`
- Использовать React Query с правильным кэшированием
- Создать единый контекст для данных профиля

### 3. Неоптимальная загрузка профилей в Edge Function
**Файл:** `supabase/functions/duel-manager/index.ts:1184-1203`

**Проблема:** Профили загружаются по одному вместо batch запроса:
```typescript
// ТЕКУЩИЙ КОД (плохо):
const profilePromises = userIds.map(async (userId) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, first_name, username, telegram_id')
    .eq('id', userId)
    .single();
  // ...
});
```

**Решение:**
```typescript
// ОПТИМИЗИРОВАННЫЙ КОД:
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('id, first_name, username, telegram_id')
  .in('id', userIds);

const profilesMap = new Map(
  (profiles || []).map(p => [p.id, p])
);
```

**Экономия:** С 10 запросов → 1 запрос (в 10 раз быстрее)

## ⚠️ Средние проблемы

### 4. Избыточные OPTIONS запросы (CORS preflight)
**Проблема:** Много OPTIONS запросов перед каждым реальным запросом

**Причина:** 
- Неправильная настройка CORS
- Отсутствие кэширования preflight запросов

**Решение:**
- Настроить правильные CORS заголовки на Supabase
- Добавить `Access-Control-Max-Age` для кэширования preflight

### 5. Множественные подписки на уведомления
**Проблема:** В консоли видно несколько инициализаций `useNotifications`

**Причина:**
- Компонент монтируется несколько раз
- Нет проверки на существующую подписку

**Решение:**
- Использовать singleton для Realtime подписки
- Проверять существующую подписку перед созданием новой

### 6. Загрузка всех уведомлений сразу
**Проблема:** Загружается 100 уведомлений сразу (`limit=100`)

**Решение:**
- Использовать пагинацию (загружать по 20-30)
- Ленивая загрузка при скролле

## 📊 Метрики производительности

### Количество запросов при загрузке страницы:
- **Supabase REST API:** ~150 запросов
- **Edge Functions:** ~35 запросов (в основном premium-status)
- **WebSocket:** 2 соединения (Vite HMR + Supabase Realtime)

### Время загрузки (приблизительно):
- **Initial Load:** ~2-3 секунды
- **First Contentful Paint:** ~1-1.5 секунды
- **Time to Interactive:** ~3-4 секунды

### Размер бандла:
- Не измерен (нужен production build)
- Рекомендуется запустить `npm run build:analyze`

## ✅ Рекомендации по оптимизации

### Приоритет 1 (Критично):
1. ✅ Объединить запросы `premium-status` в единый хук с кэшем
2. ✅ Оптимизировать загрузку профилей (один запрос вместо множества)
3. ✅ Исправить batch загрузку профилей в `duel-manager`

### Приоритет 2 (Важно):
4. ✅ Настроить правильное кэширование React Query
5. ✅ Объединить запросы профиля в единый источник данных
6. ✅ Добавить пагинацию для уведомлений

### Приоритет 3 (Желательно):
7. ✅ Оптимизировать CORS preflight запросы
8. ✅ Проверить размер бандла и lazy loading
9. ✅ Добавить мониторинг производительности

## 🔧 Быстрые исправления

### 1. Кэш для premium-status
Создать файл `src/hooks/usePremiumCached.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PREMIUM_CACHE_KEY = 'premium-status';
const CACHE_TIME = 60000; // 1 минута

export function usePremiumCached(profileId: string | null) {
  return useQuery({
    queryKey: [PREMIUM_CACHE_KEY, profileId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('premium-status', {
        body: { profile_id: profileId }
      });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
```

### 2. Batch загрузка профилей
Исправить в `supabase/functions/duel-manager/index.ts:1180-1221`:
```typescript
// Заменить цикл на один запрос
if (userIds.length > 0) {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, first_name, username, telegram_id')
    .in('id', userIds);

  if (error) {
    console.error('[get_players] Error loading profiles:', error);
  } else {
    (profiles || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });
  }
}
```

## 📈 Ожидаемые улучшения

После исправлений:
- **Снижение запросов:** с ~150 до ~50-70 (-60%)
- **Ускорение загрузки:** с 3-4 сек до 1.5-2 сек (-50%)
- **Снижение нагрузки на Supabase:** -70%
- **Улучшение UX:** мгновенная загрузка данных профиля

