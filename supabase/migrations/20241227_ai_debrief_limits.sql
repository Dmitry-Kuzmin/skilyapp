-- Миграция: Server-Side AI Debrief Limits
-- Защита "банковского уровня" — все лимиты проверяются на сервере
-- ИСПРАВЛЕНО: Правильная проверка Premium статуса через subscription_status

-- 1. Таблица для хранения лимитов пользователей (если не существует)
create table if not exists user_limits (
  user_id uuid references auth.users not null primary key,
  ai_debrief_count int default 0,
  last_reset_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS политики
alter table user_limits enable row level security;

-- Пользователь может видеть только свои записи
drop policy if exists "Users can view own limits" on user_limits;
create policy "Users can view own limits"
  on user_limits for select
  using (auth.uid() = user_id);

-- 2. Функция для проверки и инкремента лимита (вызывается из Edge Function)
-- Возвращает JSON с результатом
-- ИСПРАВЛЕНО: Правильная проверка Premium через subscription_status
create or replace function check_and_increment_ai_debrief_limit(p_user_id uuid)
returns jsonb as $$
declare
  v_count int;
  v_last_date date;
  v_is_premium boolean := false;
  v_daily_limit int := 1; -- Бесплатный лимит в день
  v_today date;
  v_subscription_status text;
  v_subscription_expires_at timestamptz;
  v_premium_forever timestamptz;
begin
  -- Используем Europe/Madrid timezone для определения "сегодня"
  v_today := (now() at time zone 'Europe/Madrid')::date;

  -- 1. Проверяем Premium статус (правильная логика как в других функциях)
  select 
    subscription_status,
    subscription_expires_at,
    premium_forever_purchased_at
  into v_subscription_status, v_subscription_expires_at, v_premium_forever
  from profiles 
  where id = p_user_id;

  -- Определяем Premium статус
  v_is_premium := (
    v_subscription_status = 'lifetime' OR
    v_premium_forever is not null OR
    (v_subscription_status = 'pro' AND (v_subscription_expires_at IS NULL OR v_subscription_expires_at > now())) OR
    (v_subscription_status = 'active' AND v_subscription_expires_at > now()) OR
    (v_subscription_status = 'trial' AND v_subscription_expires_at > now())
  );

  -- Если премиум - всегда разрешаем
  if v_is_premium then
    return jsonb_build_object(
      'allowed', true, 
      'is_premium', true,
      'remaining', -1, -- Безлимит
      'limit', -1
    );
  end if;

  -- 2. Получаем текущие данные лимита
  select ai_debrief_count, last_reset_date 
  into v_count, v_last_date 
  from user_limits 
  where user_id = p_user_id;

  -- Если записи нет, создаем и разрешаем первое использование
  if not found then
    insert into user_limits (user_id, ai_debrief_count, last_reset_date)
    values (p_user_id, 1, v_today);
    
    return jsonb_build_object(
      'allowed', true,
      'is_premium', false,
      'remaining', v_daily_limit - 1,
      'limit', v_daily_limit,
      'reset_at', (v_today + interval '1 day')::timestamptz
    );
  end if;

  -- 3. ПРОВЕРКА ВРЕМЕНИ (SERVER TIME Europe/Madrid)
  -- Если дата в базе отличается от 'сегодня', сбрасываем счетчик
  if v_last_date < v_today then
    update user_limits 
    set ai_debrief_count = 1, 
        last_reset_date = v_today,
        updated_at = now()
    where user_id = p_user_id;
    
    return jsonb_build_object(
      'allowed', true,
      'is_premium', false,
      'remaining', v_daily_limit - 1,
      'limit', v_daily_limit,
      'reset_at', (v_today + interval '1 day')::timestamptz
    );
  end if;

  -- 4. ПРОВЕРКА ЛИМИТА
  if v_count >= v_daily_limit then
    -- Лимит исчерпан — ОТКАЗАТЬ
    return jsonb_build_object(
      'allowed', false,
      'is_premium', false,
      'remaining', 0,
      'limit', v_daily_limit,
      'current_count', v_count,
      'reset_at', (v_today + interval '1 day')::timestamptz
    );
  else
    -- Увеличиваем счетчик и разрешаем
    update user_limits 
    set ai_debrief_count = ai_debrief_count + 1,
        updated_at = now()
    where user_id = p_user_id;
    
    return jsonb_build_object(
      'allowed', true,
      'is_premium', false,
      'remaining', v_daily_limit - v_count - 1,
      'limit', v_daily_limit,
      'reset_at', (v_today + interval '1 day')::timestamptz
    );
  end if;
end;
$$ language plpgsql security definer;

-- 3. Функция для получения текущего статуса лимитов (без инкремента)
-- Для отображения в UI
create or replace function get_ai_debrief_limit_status(p_user_id uuid)
returns jsonb as $$
declare
  v_count int;
  v_last_date date;
  v_is_premium boolean := false;
  v_daily_limit int := 1;
  v_today date;
  v_subscription_status text;
  v_subscription_expires_at timestamptz;
  v_premium_forever timestamptz;
begin
  -- Используем Europe/Madrid timezone
  v_today := (now() at time zone 'Europe/Madrid')::date;

  -- Проверяем Premium статус
  select 
    subscription_status,
    subscription_expires_at,
    premium_forever_purchased_at
  into v_subscription_status, v_subscription_expires_at, v_premium_forever
  from profiles 
  where id = p_user_id;

  -- Определяем Premium статус
  v_is_premium := (
    v_subscription_status = 'lifetime' OR
    v_premium_forever is not null OR
    (v_subscription_status = 'pro' AND (v_subscription_expires_at IS NULL OR v_subscription_expires_at > now())) OR
    (v_subscription_status = 'active' AND v_subscription_expires_at > now()) OR
    (v_subscription_status = 'trial' AND v_subscription_expires_at > now())
  );

  if v_is_premium then
    return jsonb_build_object(
      'is_premium', true,
      'remaining', -1,
      'limit', -1,
      'can_use', true
    );
  end if;

  -- Получаем лимиты
  select ai_debrief_count, last_reset_date 
  into v_count, v_last_date 
  from user_limits 
  where user_id = p_user_id;

  -- Если записи нет — полный лимит
  if not found then
    return jsonb_build_object(
      'is_premium', false,
      'remaining', v_daily_limit,
      'limit', v_daily_limit,
      'can_use', true,
      'reset_at', (v_today + interval '1 day')::timestamptz
    );
  end if;

  -- Если новый день — сброс
  if v_last_date < v_today then
    return jsonb_build_object(
      'is_premium', false,
      'remaining', v_daily_limit,
      'limit', v_daily_limit,
      'can_use', true,
      'reset_at', (v_today + interval '1 day')::timestamptz
    );
  end if;

  -- Текущий статус
  return jsonb_build_object(
    'is_premium', false,
    'remaining', greatest(0, v_daily_limit - v_count),
    'limit', v_daily_limit,
    'current_count', v_count,
    'can_use', v_count < v_daily_limit,
    'reset_at', (v_today + interval '1 day')::timestamptz
  );
end;
$$ language plpgsql security definer;

-- 4. Индекс для быстрого поиска
create index if not exists idx_user_limits_user_id on user_limits(user_id);

-- Комментарии
comment on function check_and_increment_ai_debrief_limit is 'Атомарно проверяет и инкрементит лимит AI Debrief (timezone: Europe/Madrid)';
comment on function get_ai_debrief_limit_status is 'Проверяет лимит AI Debrief без инкремента (timezone: Europe/Madrid)';
