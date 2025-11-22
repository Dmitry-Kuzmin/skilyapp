# 🔍 Диагностика проблемы загрузки данных на Vercel

## Шаг 1: Проверка переменных окружения на Vercel

1. Откройте Vercel Dashboard: https://vercel.com/dashboard
2. Выберите проект `sdadim-dgt-prep`
3. Перейдите в **Settings** → **Environment Variables**
4. Убедитесь, что установлены:
   - `VITE_SUPABASE_URL` = `https://yffjnqegeiorunyvcxkn.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (ваш anon key из Supabase)

## Шаг 2: Проверка RPC функции в Supabase

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Перейдите в **SQL Editor**
3. Выполните проверку:

```sql
-- Проверка существования функции
SELECT 
  routine_name, 
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_dashboard_stats';
```

Если функция не найдена, примените миграцию:

```sql
-- Создать RPC функцию для получения статистики дашборда
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_profile RECORD;
  v_sessions_stats RECORD;
  v_daily_bonus RECORD;
  v_today DATE := CURRENT_DATE;
  v_accuracy INTEGER := 0;
BEGIN
  -- 1. Получаем профиль
  SELECT 
    id,
    rank,
    xp,
    coins,
    boosts,
    streak_days
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Получаем статистику тестов
  SELECT 
    COUNT(*)::INTEGER as tests_completed,
    COALESCE(SUM(total_questions), 0)::INTEGER as total_questions,
    COALESCE(SUM(score), 0)::INTEGER as correct_answers
  INTO v_sessions_stats
  FROM game_sessions
  WHERE user_id = p_user_id;

  -- 3. Получаем ежедневный бонус
  SELECT 
    id,
    current_streak,
    last_claimed_date,
    total_claims
  INTO v_daily_bonus
  FROM user_daily_bonus
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_daily_bonus := ROW(
      NULL::UUID,
      0::INTEGER,
      NULL::DATE,
      0::INTEGER
    )::RECORD;
  END IF;

  -- 4. Вычисляем accuracy
  IF v_sessions_stats.total_questions > 0 THEN
    v_accuracy := ROUND((v_sessions_stats.correct_answers::NUMERIC / v_sessions_stats.total_questions) * 100);
  END IF;

  -- Собираем результат
  v_result := json_build_object(
    'profile', json_build_object(
      'id', v_profile.id,
      'rank', v_profile.rank,
      'xp', v_profile.xp,
      'coins', v_profile.coins,
      'boosts', v_profile.boosts,
      'streak_days', v_profile.streak_days
    ),
    'stats', json_build_object(
      'tests_completed', COALESCE(v_sessions_stats.tests_completed, 0),
      'total_questions', COALESCE(v_sessions_stats.total_questions, 0),
      'correct_answers', COALESCE(v_sessions_stats.correct_answers, 0),
      'accuracy', v_accuracy
    ),
    'daily_bonus', json_build_object(
      'id', v_daily_bonus.id,
      'current_streak', COALESCE(v_daily_bonus.current_streak, 0),
      'last_claimed_date', v_daily_bonus.last_claimed_date,
      'total_claims', COALESCE(v_daily_bonus.total_claims, 0),
      'can_claim', COALESCE(v_daily_bonus.last_claimed_date IS NULL OR v_daily_bonus.last_claimed_date < v_today, true)
    )
  );

  RETURN v_result;
END;
$$;

-- RLS Policy для функции
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO anon;
```

## Шаг 3: Проверка RLS политик

Выполните в SQL Editor:

```sql
-- Проверка RLS для profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Проверка RLS для game_sessions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'game_sessions';

-- Проверка RLS для user_daily_bonus
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_daily_bonus';
```

## Шаг 4: Проверка логов в браузере

1. Откройте сайт на Vercel
2. Откройте DevTools (F12)
3. Перейдите на вкладку **Console**
4. Ищите сообщения:
   - `[useDashboardData] Starting data fetch`
   - `[useDashboardData] ✅ Data loaded successfully`
   - `[useDashboardData] ❌ Error loading data`

## Шаг 5: Проверка Network запросов

1. В DevTools перейдите на вкладку **Network**
2. Обновите страницу
3. Ищите запросы к Supabase:
   - `rpc/get_dashboard_stats` - должен возвращать 200
   - `rest/v1/profiles` - должен возвращать 200
   - `rest/v1/game_sessions` - должен возвращать 200

## Шаг 6: Пересборка на Vercel

Если переменные окружения были изменены:

1. В Vercel Dashboard → **Deployments**
2. Найдите последний deployment
3. Нажмите **Redeploy** → **Use existing Build Cache** = OFF
4. Дождитесь завершения деплоя

## Возможные проблемы и решения

### Проблема 1: RPC функция возвращает 404
**Решение:** Примените SQL миграцию из Шага 2

### Проблема 2: RLS политики блокируют доступ
**Решение:** Проверьте политики в Шаге 3, убедитесь что они разрешают доступ для `authenticated` и `anon`

### Проблема 3: Переменные окружения не установлены
**Решение:** Установите переменные в Vercel Dashboard (Шаг 1)

### Проблема 4: Кэш браузера
**Решение:** 
- Очистите кэш браузера (Ctrl+Shift+R / Cmd+Shift+R)
- Или откройте в режиме инкогнито

## Дополнительная диагностика

Добавьте в консоль браузера для проверки:

```javascript
// Проверка Supabase клиента
import { supabase } from '@/integrations/supabase/client';
console.log('Supabase URL:', supabase.supabaseUrl);
console.log('Supabase Key:', supabase.supabaseKey?.substring(0, 20) + '...');

// Проверка profileId
// (добавьте в Index.tsx временно)
console.log('ProfileId:', profileId);
```

## Контакты для поддержки

Если проблема не решена:
1. Скопируйте все логи из консоли браузера
2. Скопируйте ошибки из Network tab
3. Проверьте логи в Supabase Dashboard → Logs → API


