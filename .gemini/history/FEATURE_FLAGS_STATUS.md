# 🚦 Статус Feature Flags

**Текущий статус:** 🟡 Частично настроено (60%)

---

## ✅ Что уже сделано

### 1. Инфраструктура
- ✅ Миграция создана: `supabase/migrations/20250101000001_app_config_feature_flags_safe.sql`
- ✅ Таблица `app_config` готова
- ✅ Хук `useFeatureFlag` создан: `src/hooks/useFeatureFlag.ts`
- ✅ Функция `get_feature_flag()` в БД

### 2. Дефолтные флаги
- ✅ `realtime_enabled` - Real-time подписки
- ✅ `notifications_realtime` - Real-time для уведомлений
- ✅ `duel_realtime` - Real-time для дуэлей
- ✅ `ai_chat_enabled` - AI чат

---

## ❌ Что НЕ сделано

### 1. Миграция не применена
- ⚠️ Нужно применить миграцию через SQL Editor

### 2. Feature Flags НЕ используются в коде
- ❌ `Duel.tsx` - НЕ проверяет флаг `duels_enabled`
- ❌ `AIWidget.tsx` - НЕ проверяет флаг `ai_chat_enabled`
- ❌ `useDuelRealtime` - НЕ проверяет флаг `duel_realtime`

### 3. Нет админки для управления
- ❌ Нет интерфейса для включения/выключения флагов
- ❌ Нет возможности быстро отключить дуэли в случае ЧП

---

## 🎯 Что нужно сделать

### Шаг 1: Применить миграцию (5 минут)

1. Supabase Dashboard → SQL Editor
2. Откройте: `supabase/migrations/20250101000001_app_config_feature_flags_safe.sql`
3. Скопируйте SQL и выполните

**Проверка:**
```sql
SELECT * FROM app_config;
-- Должны быть 4 записи
```

### Шаг 2: Добавить флаг для дуэлей (2 минуты)

Добавить в миграцию:
```sql
INSERT INTO app_config (key, value, description) VALUES
  ('duels_enabled', 'true'::jsonb, 'Включить функцию Дуэли')
ON CONFLICT (key) DO NOTHING;
```

### Шаг 3: Использовать Feature Flags в коде (15 минут)

#### 3.1. В `Duel.tsx`:

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export default function Duel() {
  const { enabled: duelsEnabled, isLoading } = useFeatureFlag('duels_enabled', true);
  
  if (isLoading) {
    return <div>Загрузка...</div>;
  }
  
  if (!duelsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Дуэли временно отключены</h1>
        <p className="text-muted-foreground">Функция временно недоступна. Попробуйте позже.</p>
      </div>
    );
  }
  
  // Остальной код...
}
```

#### 3.2. В `useDuelRealtime.ts`:

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function useDuelRealtime(duelId: string | null, ...) {
  const { enabled: realtimeEnabled } = useFeatureFlag('duel_realtime', true);
  
  useEffect(() => {
    if (!duelId || !realtimeEnabled) {
      console.log('[useDuelRealtime] Real-time disabled by feature flag');
      return;
    }
    
    // Код подписки...
  }, [duelId, realtimeEnabled]);
}
```

#### 3.3. В `AIWidget.tsx`:

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function AIWidget() {
  const { enabled: aiEnabled } = useFeatureFlag('ai_chat_enabled', true);
  
  if (!aiEnabled) {
    return null; // Скрываем виджет
  }
  
  // Остальной код...
}
```

### Шаг 4: Создать админку для управления (30 минут)

Создать компонент `AdminFeatureFlags.tsx`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AdminFeatureFlags() {
  const queryClient = useQueryClient();
  
  const { data: flags } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_config')
        .select('*')
        .order('key');
      return data;
    },
  });
  
  const toggleFlag = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag'] });
    },
  });
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Feature Flags</h2>
      <div className="space-y-4">
        {flags?.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between p-4 border rounded">
            <div>
              <h3 className="font-semibold">{flag.key}</h3>
              <p className="text-sm text-muted-foreground">{flag.description}</p>
            </div>
            <button
              onClick={() => toggleFlag.mutate({ 
                key: flag.key, 
                value: !(flag.value === true || flag.value === 'true') 
              })}
              className={`px-4 py-2 rounded ${
                flag.value === true || flag.value === 'true'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}
            >
              {flag.value === true || flag.value === 'true' ? 'Включено' : 'Выключено'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Добавить в админку:
```typescript
// В Admin.tsx или AdminDashboard.tsx
import { AdminFeatureFlags } from '@/components/admin/AdminFeatureFlags';

// В роутинг добавить:
<Route path="/admin/feature-flags" element={<AdminFeatureFlags />} />
```

---

## ✅ Итоговый чеклист

- [ ] Применить миграцию
- [ ] Добавить флаг `duels_enabled`
- [ ] Использовать `useFeatureFlag` в `Duel.tsx`
- [ ] Использовать `useFeatureFlag` в `useDuelRealtime.ts`
- [ ] Использовать `useFeatureFlag` в `AIWidget.tsx`
- [ ] Создать админку для управления флагами
- [ ] Добавить роут в админку

---

## 🎯 После выполнения

**Сценарий:** Дуэли кладут базу данных

**Без Feature Flags:**
- ❌ Править код → Пуш → Сборка → Деплой = 30 минут
- ❌ Сервис лежит 30 минут

**С Feature Flags:**
- ✅ Зайти в админку → Выключить `duels_enabled` = 5 секунд
- ✅ Сервис спасен за 5 секунд

---

**Готовность:** 60% → 100% после выполнения всех шагов

