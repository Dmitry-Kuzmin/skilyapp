-- AI chat history: persistent messages across devices
create table if not exists ai_chat_messages (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references profiles(id) on delete cascade not null,
  conversation_id text not null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  image_url       text,
  rating          smallint,
  created_at      timestamptz default now()
);

create index if not exists ai_chat_messages_profile_conv_idx
  on ai_chat_messages (profile_id, conversation_id, created_at);

alter table ai_chat_messages enable row level security;

create policy "users see own chat messages"
  on ai_chat_messages for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Storage bucket for chat image uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "users upload own chat images"
  on storage.objects for insert
  with check (bucket_id = 'chat-images' and auth.uid() is not null);

create policy "chat images are public"
  on storage.objects for select
  using (bucket_id = 'chat-images');

create policy "users delete own chat images"
  on storage.objects for delete
  using (bucket_id = 'chat-images' and auth.uid() is not null);
