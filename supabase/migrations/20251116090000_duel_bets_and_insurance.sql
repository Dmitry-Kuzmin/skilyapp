-- Duel bets & insurance schema
-- Depends on profiles, duels, duel_players tables and helper get_current_profile_id()

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

-- TRIGGERS -------------------------------------------------------------------

create or replace function set_duel_bets_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_duel_bets_updated_at on duel_bets;
create trigger trg_duel_bets_updated_at
before update on duel_bets
for each row execute procedure set_duel_bets_updated_at();

-- RLS ------------------------------------------------------------------------

alter table duel_bets enable row level security;
alter table duel_bet_history enable row level security;
alter table duel_bet_flags enable row level security;

-- Политика: участники дуэли видят и обновляют свои ставки
do $$
begin
    if not exists (
        select 1 from pg_policies
        where tablename = 'duel_bets' and policyname = 'duel_bets_participants_rw'
    ) then
        create policy duel_bets_participants_rw
        on duel_bets
        using (
            host_user = get_current_profile_id()
            or opponent_user = get_current_profile_id()
        )
        with check (
            host_user = get_current_profile_id()
            or opponent_user = get_current_profile_id()
        );
    end if;
end
$$;

-- История доступна участникам и модераторам (роль service_role)
do $$
begin
    if not exists (
        select 1 from pg_policies
        where tablename = 'duel_bet_history' and policyname = 'duel_bet_history_participants_ro'
    ) then
        create policy duel_bet_history_participants_ro
        on duel_bet_history
        for select
        using (
            exists (
                select 1 from duel_bets
                where duel_bets.id = duel_bet_history.bet_id
                and (
                    duel_bets.host_user = get_current_profile_id()
                    or duel_bets.opponent_user = get_current_profile_id()
                )
            )
        );
    end if;
end
$$;

-- Flags доступны только сервису и модерации (используем auth.role())
do $$
begin
    if not exists (
        select 1 from pg_policies
        where tablename = 'duel_bet_flags' and policyname = 'duel_bet_flags_moderation'
    ) then
        create policy duel_bet_flags_moderation
        on duel_bet_flags
        using (auth.role() = 'service_role')
        with check (auth.role() = 'service_role');
    end if;
end
$$;

commit;

