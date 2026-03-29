-- Create ton_storage table for persistent TonConnect session storage in Mini App
create table if not exists ton_storage (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    key text not null,
    value text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(user_id, key)
);

-- Create index for faster lookups
create index if not exists idx_ton_storage_user_id_key on ton_storage(user_id, key);

-- Enable RLS
alter table ton_storage enable row level security;

-- RLS: Users can only read/write their own storage
create policy "Users can read their own ton_storage"
    on ton_storage for select
    using (auth.uid() = user_id);

create policy "Users can create/update their own ton_storage"
    on ton_storage for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own ton_storage"
    on ton_storage for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own ton_storage"
    on ton_storage for delete
    using (auth.uid() = user_id);
