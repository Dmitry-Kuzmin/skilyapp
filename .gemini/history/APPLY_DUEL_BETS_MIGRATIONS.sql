-- ============================================
-- Применить миграции для системы ставок и страховки дуэлей
-- Выполнить в Supabase SQL Editor
-- ============================================

-- Проверка и создание функции get_current_profile_id() если её нет
-- ============================================

CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$;

-- Миграция 1: Создание таблиц ставок и страховки
-- ============================================

begin;

-- ENUMS ----------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_type where typname = 'duel_bet_status') then
        create type duel_bet_status as enum (
            'pending',        -- создана хозяином, ждём подтверждения
            'confirmed',      -- оппонент принял, холд средств
            'active',         -- дуэль в процессе
            'settled',        -- завершена и выплачена
            'cancelled',      -- отменена до начала
            'under_review'    -- холд до модерации
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'duel_bet_result') then
        create type duel_bet_result as enum (
            'host_win',
            'opponent_win',
            'draw',
            'technical_draw',
            'cancelled'
        );
    end if;
end
$$;

-- TABLES ---------------------------------------------------------------------

create table if not exists duel_bets (
    id uuid primary key default gen_random_uuid(),
    duel_id uuid not null references duels(id) on delete cascade,
    host_user uuid not null references profiles(id) on delete cascade,
    opponent_user uuid not null references profiles(id) on delete cascade,
    bet_amount numeric(12,2) not null check (bet_amount >= 0),
    currency text not null default 'coins',
    host_insurance_enabled boolean not null default false,
    host_insurance_rate numeric(5,4) not null default 0,
    host_insurance_premium numeric(12,2) not null default 0,
    host_coverage_rate numeric(5,4) not null default 0,
    opponent_insurance_enabled boolean not null default false,
    opponent_insurance_rate numeric(5,4) not null default 0,
    opponent_insurance_premium numeric(12,2) not null default 0,
    opponent_coverage_rate numeric(5,4) not null default 0,
    max_potential_reward numeric(12,2),
    season_sp_host numeric(12,2) not null default 0,
    season_sp_opponent numeric(12,2) not null default 0,
    host_confirmed boolean not null default false,
    opponent_confirmed boolean not null default false,
    status duel_bet_status not null default 'pending',
    suspicious_flags jsonb not null default '[]'::jsonb,
    ip_hash_host text,
    ip_hash_opponent text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists duel_bet_history (
    id uuid primary key default gen_random_uuid(),
    bet_id uuid not null references duel_bets(id) on delete cascade,
    duel_id uuid not null,
    result duel_bet_result not null,
    payout_host numeric(12,2) not null default 0,
    payout_opponent numeric(12,2) not null default 0,
    season_sp_host numeric(12,2) not null default 0,
    season_sp_opponent numeric(12,2) not null default 0,
    insurance_refund_host numeric(12,2) not null default 0,
    insurance_refund_opponent numeric(12,2) not null default 0,
    processed_by uuid,
    processed_at timestamptz not null default now()
);

create table if not exists duel_bet_flags (
    id uuid primary key default gen_random_uuid(),
    bet_id uuid not null references duel_bets(id) on delete cascade,
    flag_type text not null,
    details jsonb,
    created_at timestamptz not null default now(),
    resolved boolean not null default false,
    resolved_at timestamptz,
    resolved_by uuid
);

-- INDEXES --------------------------------------------------------------------

create index if not exists duel_bets_duel_id_idx on duel_bets (duel_id);
create index if not exists duel_bets_users_idx on duel_bets (host_user, opponent_user);
create index if not exists duel_bets_status_idx on duel_bets (status);

create index if not exists duel_bet_history_duel_idx on duel_bet_history (duel_id);
create index if not exists duel_bet_history_result_idx on duel_bet_history (result);

create index if not exists duel_bet_flags_bet_idx on duel_bet_flags (bet_id);
create index if not exists duel_bet_flags_flag_type_idx on duel_bet_flags (flag_type);

-- RLS POLICIES --------------------------------------------------------------

alter table duel_bets enable row level security;
alter table duel_bet_history enable row level security;
alter table duel_bet_flags enable row level security;

-- Пользователи могут видеть свои ставки
create policy "Users can view their own bets"
on duel_bets for select
using (
    host_user = get_current_profile_id() or
    opponent_user = get_current_profile_id()
);

-- Пользователи могут видеть историю своих ставок
create policy "Users can view their own bet history"
on duel_bet_history for select
using (
    exists (
        select 1 from duel_bets
        where duel_bets.id = duel_bet_history.bet_id
        and (
            duel_bets.host_user = get_current_profile_id() or
            duel_bets.opponent_user = get_current_profile_id()
        )
    )
);

-- Пользователи могут видеть флаги своих ставок
create policy "Users can view flags for their bets"
on duel_bet_flags for select
using (
    exists (
        select 1 from duel_bets
        where duel_bets.id = duel_bet_flags.bet_id
        and (
            duel_bets.host_user = get_current_profile_id() or
            duel_bets.opponent_user = get_current_profile_id()
        )
    )
);

-- Service role может всё
create policy "Service can manage all bets"
on duel_bets for all
using (true)
with check (true);

create policy "Service can manage all bet history"
on duel_bet_history for all
using (true)
with check (true);

create policy "Service can manage all bet flags"
on duel_bet_flags for all
using (true)
with check (true);

commit;

-- Миграция 2: Расширение типов транзакций для страховки
-- ============================================

begin;

ALTER TABLE public.duel_transactions
  DROP CONSTRAINT IF EXISTS duel_transactions_transaction_type_check;

ALTER TABLE public.duel_transactions
  ADD CONSTRAINT duel_transactions_transaction_type_check
  CHECK (
    transaction_type IN (
      'bet',
      'win',
      'refund',
      'commission',
      'rematch_carry',
      'insurance_premium',
      'insurance_refund'
    )
  );

commit;

-- ============================================
-- Миграции применены успешно!
-- ============================================

