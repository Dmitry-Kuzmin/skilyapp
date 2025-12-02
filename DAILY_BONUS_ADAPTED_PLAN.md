# 🎯 Адаптированный план доработки Daily Bonus
## На основе критического анализа

---

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (выявлены в анализе)

### ❌ Проблема 1: Fallback + RLS = противоречие
**Суть:** После применения RLS `UPDATE` будет доступен только `service_role`, но fallback пытается писать через `anon` ключ.

**Статус:** 🔴 Критично

**Решение:** Убрать fallback в production, добавить proper error handling.

---

### ❌ Проблема 2: Streak Freeze не интегрирован
**Суть:** Функция `use_streak_freeze` существует отдельно, не встроена в `claim_daily_bonus_atomic`.

**Статус:** 🟠 Важно

**Решение:** Интегрировать auto-freeze логику внутрь основной функции.

---

### ❌ Проблема 3: Mystery Box без бэкенда
**Суть:** Красивая анимация есть, но рандом и выдача наград - на клиенте.

**Статус:** 🟠 Важно

**Решение:** Создать `open_mystery_box` Edge Function с серверным рандомом.

---

### ❌ Проблема 4: Окно уязвимости
**Суть:** Сейчас работает старая небезопасная логика, новая не задеплоена.

**Статус:** 🔴 Критично

**Решение:** Максимально быстро задеплоить.

---

### ❌ Проблема 5: Push-уведомления отсутствуют
**Суть:** Лучшая мотивация бесполезна, если пользователь забывает зайти.

**Статус:** 🔴 Критично для retention

**Решение:** Telegram bot reminder система.

---

## ✅ АДАПТИРОВАННЫЙ ПЛАН

## PHASE 0: Критические исправления (48 часов)

### 0.1 Исправить Fallback Logic ⚠️

**Проблема:** Fallback будет ломаться после RLS

**Файл:** `src/pages/Index.tsx`

**Изменения:**

```typescript
// Убираем fallback в production
const isProd = import.meta.env.PROD;
const allowFallback = !isProd && import.meta.env.DEV;

// ✅ ПОПЫТКА 1: Edge Function (безопасно)
try {
  const { data: efData, error: efError } = await supabase.functions.invoke('claim-daily-bonus', {
    body: { user_id: profileId }
  });

  if (efError) throw efError;
  
  if (!efData?.success) {
    // Обработка ошибок бизнес-логики
    if (efData?.error === 'already_claimed_today') {
      toast({
        title: "Уже получено",
        description: "Сегодняшняя награда уже получена (серверное время)",
        variant: "default",
      });
      return;
    }
    
    if (efData?.error === 'concurrent_claim') {
      toast({
        title: "Повтори попытку",
        description: "Подожди секунду и попробуй снова",
        variant: "default",
      });
      return;
    }
    
    throw new Error(efData?.message || 'Unknown error');
  }

  // ✅ Успех через Edge Function
  handleSuccessfulClaim(efData);
  return;

} catch (edgeFunctionError) {
  console.error('[handleClaimBonus] Edge Function failed:', edgeFunctionError);
  
  // ❌ В production НЕ делаем fallback
  if (!allowFallback) {
    toast({
      title: "Ошибка сервера",
      description: "Не удалось получить бонус. Попробуйте позже или обратитесь в поддержку.",
      variant: "destructive",
    });
    return;
  }
  
  // ⚠️ Fallback ТОЛЬКО в dev mode
  console.warn('[handleClaimBonus] Using FALLBACK (dev only)');
  await handleFallbackClaim();
}
```

**Результат:** Production безопасен, dev удобен для отладки.

---

### 0.2 Интегрировать Streak Freeze в Claim Function

**Проблема:** Auto-freeze не работает при пропуске дня

**Файл:** `supabase/migrations/20251202000001_add_daily_bonus_claim_function.sql`

**Изменения:** Обновить `claim_daily_bonus_atomic`

```sql
-- Добавить в начало функции:
DECLARE
  -- ... существующие переменные
  v_freeze_count INTEGER := 0;
  v_freeze_auto_used BOOLEAN := FALSE;
BEGIN
  
  -- ... существующий код до расчета streak
  
  -- ✅ 3. Вычисляем новый streak (на сервере!) + AUTO FREEZE
  IF v_bonus_record.last_claimed_date = p_server_yesterday THEN
    -- Продолжаем streak
    v_new_streak := v_bonus_record.current_streak + 1;
    
  ELSIF v_bonus_record.last_claimed_date IS NULL THEN
    -- Первое получение
    v_new_streak := 1;
    
  ELSE
    -- ❄️ ПРОПУСК ДНЯ ОБНАРУЖЕН!
    
    -- Проверяем наличие freeze
    SELECT quantity INTO v_freeze_count
    FROM public.user_items
    WHERE user_id = p_user_id 
      AND item_type = 'streak_freeze'
    FOR UPDATE;
    
    IF v_freeze_count > 0 THEN
      -- ✅ AUTO-USE FREEZE: спасаем streak
      v_new_streak := v_bonus_record.current_streak;  -- Сохраняем
      v_freeze_auto_used := TRUE;
      
      -- Списываем freeze
      UPDATE public.user_items
      SET 
        quantity = quantity - 1,
        updated_at = NOW()
      WHERE user_id = p_user_id 
        AND item_type = 'streak_freeze';
      
      -- Логируем auto-use
      BEGIN
        INSERT INTO public.user_events (user_id, event_type, metadata)
        VALUES (
          p_user_id,
          'streak_freeze_auto_used',
          jsonb_build_object(
            'streak_saved', v_bonus_record.current_streak,
            'days_missed', p_server_today::DATE - v_bonus_record.last_claimed_date::DATE - 1,
            'freeze_remaining', v_freeze_count - 1,
            'server_date', p_server_today
          )
        );
      EXCEPTION
        WHEN undefined_table THEN NULL;
      END;
      
    ELSE
      -- ❌ Нет freeze → streak теряется
      v_new_streak := 1;
      
      -- Логируем потерю (уже было в коде)
      BEGIN
        INSERT INTO public.user_events (user_id, event_type, metadata)
        VALUES (
          p_user_id,
          'streak_lost',
          jsonb_build_object(
            'old_streak', v_bonus_record.current_streak,
            'last_claimed', v_bonus_record.last_claimed_date,
            'server_today', p_server_today,
            'days_missed', p_server_today::DATE - v_bonus_record.last_claimed_date::DATE - 1,
            'had_freeze', FALSE
          )
        );
      EXCEPTION
        WHEN undefined_table THEN NULL;
      END;
    END IF;
  END IF;
  
  -- ... остальной код без изменений
  
  -- ✅ 9. Возвращаем успех (добавляем freeze_used)
  RETURN QUERY SELECT 
    TRUE,
    NULL::TEXT,
    CASE 
      WHEN v_freeze_auto_used THEN 'Streak спасён заморозкой! ❄️'
      ELSE 'Награда получена успешно!'
    END,
    v_new_streak,
    v_week_day,
    v_reward_def.reward,
    v_new_xp,
    v_new_coins,
    v_freeze_auto_used;  -- Новое поле

END;
```

**Обновить возвращаемый тип:**

```sql
RETURNS TABLE(
  success BOOLEAN,
  error TEXT,
  message TEXT,
  new_streak INTEGER,
  week_day INTEGER,
  reward JSONB,
  new_balance_xp INTEGER,
  new_balance_coins INTEGER,
  freeze_used BOOLEAN  -- ← Новое поле
)
```

**Результат:** Freeze работает автоматически, защищая streak.

---

### 0.3 Создать Mystery Box Backend

**Проблема:** Рандом на клиенте = читерство

**Новый файл:** `supabase/functions/open-mystery-box/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, box_type } = await req.json();

    if (!user_id || !box_type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Вызываем SQL функцию (серверный рандом!)
    const { data, error } = await supabase.rpc('open_mystery_box_atomic', {
      p_user_id: user_id,
      p_box_type: box_type
    });

    if (error) {
      console.error('[open-mystery-box] Error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      return new Response(
        JSON.stringify(result),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Возвращаем reward для анимации
    return new Response(
      JSON.stringify({
        success: true,
        reward: result.reward,
        new_balance_xp: result.new_balance_xp,
        new_balance_coins: result.new_balance_coins
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[open-mystery-box] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**SQL функция:** `supabase/migrations/20251203000001_mystery_box_backend.sql`

```sql
-- Таблица лута для Mystery Box
CREATE TABLE IF NOT EXISTS public.mystery_box_loot_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_type TEXT NOT NULL,  -- 'common', 'rare', 'epic'
  reward_type TEXT NOT NULL,  -- 'xp', 'coins', 'sticker', 'badge', 'boost'
  reward_value JSONB NOT NULL,
  weight INTEGER NOT NULL DEFAULT 100,  -- Вес для рандома
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заполняем таблицу лута
INSERT INTO public.mystery_box_loot_table (box_type, reward_type, reward_value, weight) VALUES
-- Common Box
('common', 'xp', '{"xp": 20}'::jsonb, 30),
('common', 'coins', '{"coins": 15}'::jsonb, 30),
('common', 'xp', '{"xp": 30}'::jsonb, 20),
('common', 'coins', '{"coins": 25}'::jsonb, 15),
('common', 'sticker', '{"sticker_id": "random_common"}'::jsonb, 5),

-- Rare Box
('rare', 'xp', '{"xp": 50}'::jsonb, 25),
('rare', 'coins', '{"coins": 40}'::jsonb, 25),
('rare', 'xp', '{"xp": 75}'::jsonb, 20),
('rare', 'coins', '{"coins": 60}'::jsonb, 15),
('rare', 'boost', '{"boost_tickets": 2}'::jsonb, 10),
('rare', 'sticker', '{"sticker_id": "random_rare"}'::jsonb, 5),

-- Epic Box
('epic', 'xp', '{"xp": 150}'::jsonb, 20),
('epic', 'coins', '{"coins": 100}'::jsonb, 20),
('epic', 'xp', '{"xp": 200}'::jsonb, 15),
('epic', 'coins', '{"coins": 150}'::jsonb, 15),
('epic', 'boost', '{"boost_tickets": 5}'::jsonb, 15),
('epic', 'badge', '{"badge_id": "mystery_master"}'::jsonb, 10),
('epic', 'sticker', '{"sticker_id": "random_epic"}'::jsonb, 5);

-- Функция открытия Mystery Box
CREATE OR REPLACE FUNCTION public.open_mystery_box_atomic(
  p_user_id UUID,
  p_box_type TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  error TEXT,
  message TEXT,
  reward JSONB,
  new_balance_xp INTEGER,
  new_balance_coins INTEGER
) AS $$
DECLARE
  v_box_count INTEGER;
  v_total_weight INTEGER;
  v_random_roll INTEGER;
  v_cumulative_weight INTEGER := 0;
  v_selected_reward RECORD;
  v_profile RECORD;
  v_new_xp INTEGER;
  v_new_coins INTEGER;
BEGIN
  -- ✅ 1. Проверяем наличие box в инвентаре
  SELECT quantity INTO v_box_count
  FROM public.user_items
  WHERE user_id = p_user_id 
    AND item_type = 'mystery_box_' || p_box_type
  FOR UPDATE;
  
  IF v_box_count IS NULL OR v_box_count <= 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'no_box'::TEXT, 
      'У вас нет такого бокса'::TEXT,
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER;
    RETURN;
  END IF;
  
  -- ✅ 2. Серверный рандом (weighted random)
  SELECT SUM(weight) INTO v_total_weight
  FROM public.mystery_box_loot_table
  WHERE box_type = p_box_type;
  
  -- Генерируем случайное число (1 до total_weight)
  v_random_roll := FLOOR(RANDOM() * v_total_weight) + 1;
  
  -- Выбираем награду методом cumulative weight
  FOR v_selected_reward IN
    SELECT * FROM public.mystery_box_loot_table
    WHERE box_type = p_box_type
    ORDER BY weight DESC
  LOOP
    v_cumulative_weight := v_cumulative_weight + v_selected_reward.weight;
    IF v_random_roll <= v_cumulative_weight THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- ✅ 3. Блокируем профиль
  SELECT xp, coins INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_profile IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'profile_not_found'::TEXT, 
      'Профиль не найден'::TEXT,
      NULL::JSONB, 
      NULL::INTEGER, 
      NULL::INTEGER;
    RETURN;
  END IF;
  
  -- ✅ 4. Применяем награду
  v_new_xp := COALESCE(v_profile.xp, 0) + COALESCE((v_selected_reward.reward_value->>'xp')::INTEGER, 0);
  v_new_coins := COALESCE(v_profile.coins, 0) + COALESCE((v_selected_reward.reward_value->>'coins')::INTEGER, 0);
  
  -- Обновляем профиль
  UPDATE public.profiles
  SET 
    xp = v_new_xp,
    coins = v_new_coins,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- ✅ 5. Списываем box
  UPDATE public.user_items
  SET 
    quantity = quantity - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND item_type = 'mystery_box_' || p_box_type;
  
  -- ✅ 6. Логируем транзакцию
  INSERT INTO public.transactions (user_id, transaction_type, amount, metadata)
  VALUES (
    p_user_id,
    'mystery_box_opened',
    COALESCE((v_selected_reward.reward_value->>'coins')::INTEGER, 0),
    jsonb_build_object(
      'box_type', p_box_type,
      'reward_type', v_selected_reward.reward_type,
      'reward_value', v_selected_reward.reward_value,
      'random_roll', v_random_roll,
      'total_weight', v_total_weight,
      'opened_at_utc', NOW()
    )
  );
  
  -- ✅ 7. Возвращаем награду для UI
  RETURN QUERY SELECT 
    TRUE,
    NULL::TEXT,
    'Награда получена!'::TEXT,
    v_selected_reward.reward_value,
    v_new_xp,
    v_new_coins;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Права доступа
GRANT EXECUTE ON FUNCTION public.open_mystery_box_atomic TO service_role;
REVOKE EXECUTE ON FUNCTION public.open_mystery_box_atomic FROM anon, authenticated;

COMMENT ON FUNCTION public.open_mystery_box_atomic IS 
  'Открытие Mystery Box с серверным рандомом (защита от читерства)';
```

**Интеграция в клиент:** `src/pages/Index.tsx`

```typescript
const handleOpenMysteryBox = async (boxType: 'common' | 'rare' | 'epic') => {
  try {
    // Показываем анимацию opening (без награды)
    setShowMysteryBox(true);
    setMysteryBoxType(boxType);
    
    // Вызываем Edge Function
    const { data, error } = await supabase.functions.invoke('open-mystery-box', {
      body: { user_id: profileId, box_type: boxType }
    });
    
    if (error || !data?.success) {
      toast({
        title: "Ошибка",
        description: data?.message || "Не удалось открыть бокс",
        variant: "destructive"
      });
      setShowMysteryBox(false);
      return;
    }
    
    // ✅ Сервер вернул reward → показываем в анимации
    setMysteryBoxReward(data.reward);
    
    // После завершения анимации
    setTimeout(() => {
      invalidateCache();  // Обновить UI
      setShowMysteryBox(false);
    }, 8000);
    
  } catch (err) {
    console.error('[handleOpenMysteryBox] Error:', err);
    toast({
      title: "Ошибка",
      description: "Попробуйте позже",
      variant: "destructive"
    });
  }
};
```

**Результат:** Рандом только на сервере, читерство невозможно.

---

## PHASE 1: Деплой и активация (24 часа)

### 1.1 Применить SQL миграции

```bash
# В Supabase Dashboard → SQL Editor
# Выполнить по порядку:

1. supabase/migrations/20251202000001_add_daily_bonus_claim_function.sql (обновленная с freeze)
2. supabase/migrations/20251202000002_secure_daily_bonus_updates.sql
3. supabase/migrations/20251202000003_add_streak_freeze_system.sql
4. supabase/migrations/20251203000001_mystery_box_backend.sql (новая)
```

### 1.2 Deploy Edge Functions

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep

# Deploy обе функции
supabase functions deploy claim-daily-bonus
supabase functions deploy open-mystery-box
```

### 1.3 Smoke Test

```bash
# Проверить что функции работают
curl -X POST https://your-project.supabase.co/functions/v1/claim-daily-bonus \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-uuid"}'

# Ожидаем 200 или корректную ошибку, НЕ 500
```

### 1.4 Production Rollout

1. Мониторить Supabase Logs первые 2 часа
2. Проверить что нет spike в error rate
3. Если OK → объявить о завершении

**Результат:** Безопасная логика активна в production.

---

## PHASE 2: Push-уведомления (критично!) (48 часов)

### 2.1 Telegram Bot Reminder

**Файл:** `supabase/functions/daily-bonus-reminder/index.ts`

```typescript
// Telegram bot cron job
// Вызывается через Supabase Cron каждые 4 часа

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Найти пользователей с риском потери streak
  const { data: atRiskUsers } = await supabase
    .from('user_daily_bonus')
    .select(`
      user_id,
      current_streak,
      last_claimed_date,
      profiles!inner(telegram_id, timezone)
    `)
    .lt('last_claimed_date', 'today')  // Еще не получал сегодня
    .gte('current_streak', 3);  // Streak >= 3 (есть что терять)
  
  for (const user of atRiskUsers) {
    // Определить оптимальное время
    const userTime = getUserLocalTime(user.profiles.timezone);
    const optimalHour = user.typical_claim_hour || 20;  // По умолчанию 20:00
    
    // Отправить за 2 часа до optimal time
    if (Math.abs(userTime.getHours() - optimalHour) <= 2) {
      await sendTelegramMessage(user.profiles.telegram_id, {
        text: `🔥 Твой streak ${user.current_streak} дней в опасности!

Зайди за наградой сегодня, чтобы не потерять прогресс 💪

[Получить бонус →]`,
        inline_keyboard: [[
          { text: "🎁 Получить", url: "https://t.me/your_bot?start=claim_bonus" }
        ]]
      });
      
      // Логируем отправку
      await supabase
        .from('notification_log')
        .insert({
          user_id: user.user_id,
          type: 'streak_reminder',
          sent_at: new Date().toISOString()
        });
    }
  }
  
  return new Response(JSON.stringify({ success: true }));
});
```

**Supabase Cron:**

```sql
-- В Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
  'send-daily-reminders',
  '0 */4 * * *',  -- Каждые 4 часа
  $$
  SELECT
    net.http_post(
      url:='https://your-project.supabase.co/functions/v1/daily-bonus-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
```

### 2.2 Smart Timing (ML optional)

```sql
-- Записываем типичное время claim
CREATE TABLE IF NOT EXISTS public.user_claim_patterns (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id),
  typical_hour INTEGER,  -- 0-23
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Обновляется при каждом claim
CREATE OR REPLACE FUNCTION update_claim_pattern()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_claim_patterns (user_id, typical_hour)
  VALUES (
    NEW.user_id,
    EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    typical_hour = (
      -- Скользящее среднее
      COALESCE(user_claim_patterns.typical_hour, 0) * 0.7 + 
      EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC') * 0.3
    )::INTEGER,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_claim_time
  AFTER UPDATE ON public.user_daily_bonus
  FOR EACH ROW
  WHEN (NEW.last_claimed_date IS DISTINCT FROM OLD.last_claimed_date)
  EXECUTE FUNCTION update_claim_pattern();
```

**Результат:** Напоминания в оптимальное время → +15-20% retention.

---

## PHASE 3: Экономика 2.0 (72 часа)

### 3.1 Streak Multiplier

```sql
-- Добавить поле
ALTER TABLE public.user_daily_bonus
ADD COLUMN IF NOT EXISTS streak_multiplier NUMERIC DEFAULT 1.0;

-- Auto-calculate trigger
CREATE OR REPLACE FUNCTION calc_streak_multiplier()
RETURNS TRIGGER AS $$
BEGIN
  -- Формула: 1.0 + (недели × 5%), макс 1.5
  NEW.streak_multiplier := LEAST(
    1.0 + (FLOOR(NEW.current_streak / 7.0) * 0.05),
    1.5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_multiplier
  BEFORE INSERT OR UPDATE ON public.user_daily_bonus
  FOR EACH ROW
  EXECUTE FUNCTION calc_streak_multiplier();
```

**Применить множитель в rewards:**

```sql
-- В claim_daily_bonus_atomic, при расчете наград:
v_xp_reward := FLOOR((v_reward_def.reward->>'xp')::INTEGER * v_bonus_record.streak_multiplier);
v_coins_reward := FLOOR((v_reward_def.reward->>'coins')::INTEGER * v_bonus_record.streak_multiplier);
```

### 3.2 Улучшить базовые награды

```sql
-- Обновить daily_bonus_def
UPDATE public.daily_bonus_def 
SET reward = '{"xp": 15, "coins": 10, "sp_bonus": 5}'::jsonb
WHERE day_number = 1;

UPDATE public.daily_bonus_def 
SET reward = '{"xp": 25, "coins": 15, "sticker": "common", "sp_bonus": 10}'::jsonb
WHERE day_number = 2;

-- ... и так далее для дней 3-7
```

### 3.3 Milestone Rewards

```sql
CREATE TABLE IF NOT EXISTS public.streak_milestones (
  milestone_days INTEGER PRIMARY KEY,
  reward JSONB NOT NULL,
  title TEXT,
  animation_type TEXT DEFAULT 'fireworks'
);

INSERT INTO public.streak_milestones (milestone_days, reward, title, animation_type) VALUES
(7,   '{"xp": 100, "coins": 50, "badge": "week_warrior"}'::jsonb, 'Неделя!', 'fireworks'),
(30,  '{"xp": 500, "coins": 250, "skin": "month_champion", "title": "Dedicated"}'::jsonb, 'Месяц!', 'champion'),
(60,  '{"xp": 1500, "coins": 750, "skin": "rare_streak", "frame": "gold"}'::jsonb, 'Два месяца!', 'phoenix'),
(90,  '{"xp": 3000, "coins": 1500, "aura": "legend", "title": "Legend"}'::jsonb, 'Квартал!', 'supernova');

-- Добавить в claim_daily_bonus_atomic:
-- Проверить milestone
SELECT * INTO v_milestone
FROM public.streak_milestones
WHERE milestone_days = v_new_streak;

IF v_milestone IS NOT NULL THEN
  -- Grant milestone reward
  -- Логировать special event
END IF;
```

**Результат:** Прогрессия наград, долгосрочная мотивация.

---

## PHASE 4: Аналитика и мониторинг (24 часа)

### 4.1 Аналитические view

```sql
-- Retention по streak
CREATE OR REPLACE VIEW public.streak_retention_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT user_id) FILTER (WHERE current_streak >= 7) as week_plus,
  COUNT(DISTINCT user_id) FILTER (WHERE current_streak >= 30) as month_plus,
  AVG(current_streak) as avg_streak,
  MAX(current_streak) as max_streak
FROM public.user_daily_bonus
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Freeze usage
CREATE OR REPLACE VIEW public.freeze_usage_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_freezes_used,
  COUNT(*) FILTER (WHERE event_type = 'streak_freeze_auto_used') as auto_used,
  COUNT(*) FILTER (WHERE event_type = 'streak_freeze_manual_used') as manual_used,
  AVG((metadata->>'streak_saved')::INTEGER) as avg_streak_saved
FROM public.user_events
WHERE event_type LIKE 'streak_freeze%'
GROUP BY DATE(created_at);
```

### 4.2 Monitoring Dashboard (Metabase/Grafana)

Подключить к:
- `streak_retention_analytics`
- `freeze_usage_analytics`
- `transactions` (type = 'daily_bonus_claimed')
- `user_events` (type = 'streak_lost')

**Метрики:**
- Daily claim rate
- Average streak
- D7/D30 retention
- Freeze conversion rate
- Mystery box open rate

**Результат:** Data-driven решения.

---

## ⚠️ КРИТИЧЕСКИЕ ТОЧКИ КОНТРОЛЯ

### Checkpoint 1: После деплоя (2 часа)
- [ ] Edge Functions отвечают 200
- [ ] RLS блокирует прямые UPDATE
- [ ] Fallback НЕ срабатывает в production
- [ ] Streak Freeze auto-use работает
- [ ] Mystery Box рандом на сервере

### Checkpoint 2: Через 24 часа
- [ ] Error rate < 1%
- [ ] Claim rate не упал (должен вырасти)
- [ ] Push-уведомления отправляются
- [ ] Нет жалоб на "потерянные streak"

### Checkpoint 3: Через 7 дней
- [ ] D7 retention вырос на 5-10%
- [ ] Average streak вырос
- [ ] Freeze purchase rate > 0
- [ ] Mystery box engagement high

---

## 📊 SUCCESS METRICS (30 дней)

| Метрика | Было | Цель | Критично |
|---------|------|------|----------|
| Timezone exploits | ? | 0 | ✅ |
| Race conditions | ? | 0 | ✅ |
| D7 Retention | 40% | 50%+ | 🔴 |
| Daily Claim Rate | 65% | 80%+ | 🟠 |
| Avg Streak | 12 | 15+ | 🟠 |
| Freeze Usage | 0 | 20%+ | 🟢 |
| Mystery Box Opens | 0 | 70%+ day7 | 🟢 |

---

## 🚀 ROADMAP (после Phase 4)

### Month 2: Social
- Streak leaderboard
- Social sharing
- Streak battles (PvP)

### Month 3: Advanced
- AI персонализация
- Seasonal themes
- AR rewards

### Month 4: Mobile-First
- Haptic feedback
- Voice feedback
- Home screen widget

---

## ✅ ЧЕКЛИСТ ПЕРЕД СТАРТОМ

- [ ] Прочитать весь план
- [ ] Сделать backup БД
- [ ] Подготовить rollback script
- [ ] Уведомить команду о деплое
- [ ] Начать с Phase 0 (критические исправления)
- [ ] НЕ ПРОПУСКАТЬ шаги
- [ ] Тестировать каждую фазу
- [ ] Мониторить метрики

---

**Оценка времени:**
- Phase 0: 48 часов
- Phase 1: 24 часа
- Phase 2: 48 часов
- Phase 3: 72 часа
- Phase 4: 24 часа

**Итого: 9 дней** до production-ready системы.

**Критический путь:** Phase 0 → Phase 1 → Phase 2

Остальное можно делать параллельно или после.

---

🎯 **НАЧИНАЙ С PHASE 0.1** - это исправит fallback логику и подготовит к безопасному деплою!



