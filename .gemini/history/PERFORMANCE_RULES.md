# 🚀 ПРАВИЛА ПРОИЗВОДИТЕЛЬНОСТИ И ОПТИМИЗАЦИИ

## ⚠️ КРИТИЧЕСКИ ВАЖНО

**ВСЕ изменения кода ДОЛЖНЫ соответствовать этим правилам производительности!**

---

## 📊 МЕТРИКИ И ЛИМИТЫ

### Запросы к Supabase

#### ❌ ЗАПРЕЩЕНО:
- **Более 5 запросов к одной таблице в одном компоненте**
- **Последовательные запросы, которые можно объединить в один**
- **Запросы без кэширования (React Query)**
- **Запросы в useEffect без проверки на дубликаты**
- **Запросы при каждом рендере (без мемоизации)**

#### ✅ ОБЯЗАТЕЛЬНО:
- **Использовать React Query для ВСЕХ запросов к Supabase**
- **Объединять запросы к одной таблице в один запрос с полным select**
- **Использовать существующие хуки (useProfileData, usePremium) вместо прямых запросов**
- **Кэшировать данные минимум на 1 минуту (staleTime)**
- **Использовать batch запросы (.in()) вместо циклов**

### Edge Functions

#### ❌ ЗАПРЕЩЕНО:
- **Более 3 вызовов одной Edge Function в одном компоненте**
- **Вызовы Edge Function без кэширования**
- **Вызовы Edge Function в useEffect без проверки зависимостей**

#### ✅ ОБЯЗАТЕЛЬНО:
- **Использовать React Query для Edge Functions**
- **Кэшировать результаты минимум на 2 минуты**
- **Объединять логику в одну Edge Function вместо множества вызовов**

### Realtime подписки

#### ❌ ЗАПРЕЩЕНО:
- **Множественные подписки на один канал**
- **Подписки без cleanup в useEffect**
- **Подписки без проверки на существующую подписку**

#### ✅ ОБЯЗАТЕЛЬНО:
- **Использовать глобальный реестр подписок**
- **Проверять существующие подписки перед созданием новых**
- **Всегда очищать подписки в cleanup функции**

---

## 🔍 АВТОМАТИЧЕСКИЕ ПРОВЕРКИ

### Перед каждым коммитом проверь:

1. **Количество запросов:**
   ```bash
   # Найти все прямые запросы к Supabase
   grep -r "\.from\(" src/ --include="*.ts" --include="*.tsx" | wc -l
   ```

2. **Использование React Query:**
   ```bash
   # Проверить, что все запросы используют useQuery
   grep -r "useQuery\|useMutation" src/hooks/ | wc -l
   ```

3. **Дублирующиеся запросы:**
   ```bash
   # Найти компоненты с множественными запросами
   grep -r "\.from\(" src/components/ --include="*.tsx" | sort | uniq -c | sort -rn
   ```

### Чеклист перед коммитом:

- [ ] Все запросы к Supabase используют React Query
- [ ] Нет прямых запросов в компонентах (только через хуки)
- [ ] Нет дублирующихся запросов к одной таблице
- [ ] Все Edge Functions вызываются через React Query
- [ ] Realtime подписки проверяются на дубликаты
- [ ] Кэширование настроено правильно (staleTime >= 1 минута)
- [ ] Нет запросов в useEffect без зависимостей

---

## 🎯 ПАТТЕРНЫ КОДА

### ❌ ПЛОХО (запрещено):

```typescript
// ❌ Прямой запрос в компоненте
function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    supabase.from('profiles').select('coins').eq('id', profileId)
      .then(({ data }) => setData(data));
  }, [profileId]);
  
  return <div>{data?.coins}</div>;
}

// ❌ Множественные запросы
useEffect(() => {
  supabase.from('profiles').select('coins').eq('id', profileId).then(...);
  supabase.from('profiles').select('xp').eq('id', profileId).then(...);
  supabase.from('profiles').select('streak_days').eq('id', profileId).then(...);
}, [profileId]);

// ❌ Edge Function без кэша
useEffect(() => {
  supabase.functions.invoke('premium-status', { body: { user_id: profileId } })
    .then(({ data }) => setPremium(data));
}, [profileId]);
```

### ✅ ХОРОШО (обязательно):

```typescript
// ✅ Использование существующего хука
function MyComponent() {
  const { coins } = useProfileData();
  return <div>{coins}</div>;
}

// ✅ React Query для новых запросов
function useMyData(profileId: string) {
  return useQuery({
    queryKey: ['my-data', profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from('my_table')
        .select('*')
        .eq('id', profileId)
        .single();
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 минуты
    enabled: !!profileId,
  });
}

// ✅ Batch запрос
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, first_name, username')
  .in('id', userIds); // Вместо цикла
```

---

## 📈 МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ

### Метрики для отслеживания:

1. **Количество запросов при загрузке страницы:**
   - Цель: < 50 запросов к REST API
   - Цель: < 10 запросов к Edge Functions

2. **Время загрузки:**
   - Цель: < 2 секунды до интерактивности
   - Цель: < 1 секунда до First Contentful Paint

3. **Размер бандла:**
   - Цель: < 500KB для основного бандла
   - Цель: < 200KB для каждого chunk

### Инструменты:

- Chrome DevTools Performance
- React DevTools Profiler
- Bundle analyzer (`npm run build:analyze`)
- Network tab для подсчета запросов

---

## 🔧 ОБЯЗАТЕЛЬНЫЕ ОПТИМИЗАЦИИ

### 1. Все запросы через React Query

**Правило:** НИКОГДА не делай прямые запросы в компонентах.

**Проверка:**
```bash
# Найти все прямые запросы
grep -r "supabase\.from\|supabase\.functions\.invoke" src/components/ src/pages/ --include="*.tsx"
```

### 2. Использование существующих хуков

**Правило:** Всегда используй существующие хуки вместо новых запросов:
- `useProfileData()` - для данных профиля
- `usePremium()` - для premium статуса
- `useCoins()` - для баланса монет
- `useDashboardData()` - для данных дашборда

### 3. Batch запросы

**Правило:** Всегда используй `.in()` для множественных запросов.

**Пример:**
```typescript
// ❌ Плохо
const profiles = await Promise.all(
  userIds.map(id => supabase.from('profiles').select('*').eq('id', id).single())
);

// ✅ Хорошо
const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .in('id', userIds);
```

### 4. Кэширование

**Правило:** Все запросы должны иметь:
- `staleTime: >= 1 минута` для часто меняющихся данных
- `staleTime: >= 5 минут` для редко меняющихся данных
- `refetchOnWindowFocus: false` для большинства запросов
- `refetchOnMount: false` если данные свежие

### 5. Мемоизация

**Правило:** Все тяжелые вычисления должны быть мемоизированы:
- `useMemo` для вычислений
- `useCallback` для функций
- `React.memo` для компонентов

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### НИКОГДА не делай:

1. ❌ Прямые запросы в компонентах
2. ❌ Запросы в useEffect без зависимостей
3. ❌ Множественные запросы к одной таблице
4. ❌ Edge Functions без кэширования
5. ❌ Realtime подписки без проверки дубликатов
6. ❌ Запросы при каждом рендере
7. ❌ Последовательные запросы вместо batch

### ВСЕГДА делай:

1. ✅ Используй React Query для всех запросов
2. ✅ Используй существующие хуки
3. ✅ Объединяй запросы в batch
4. ✅ Кэшируй данные минимум на 1 минуту
5. ✅ Проверяй существующие подписки
6. ✅ Мемоизируй тяжелые вычисления
7. ✅ Используй пагинацию для больших списков

---

## 📝 ПРОВЕРКА ПЕРЕД КОММИТОМ

Перед каждым коммитом выполни:

```bash
# 1. Проверь количество прямых запросов
grep -r "supabase\.from\|supabase\.functions\.invoke" src/components/ src/pages/ --include="*.tsx" | wc -l
# Должно быть: 0 (все через хуки)

# 2. Проверь использование React Query
grep -r "useQuery\|useMutation" src/hooks/ | wc -l
# Должно быть: >= количество хуков с запросами

# 3. Проверь дублирующиеся запросы
grep -r "\.from\(" src/ --include="*.tsx" | sort | uniq -c | sort -rn | head -10
# Проверь, нет ли множественных запросов к одной таблице
```

---

**Последнее обновление:** 2025-12-01  
**Версия:** 2.0 (строгие правила с метриками)

