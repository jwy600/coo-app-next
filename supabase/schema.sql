-- Supabase schema for threads, messages, and blocks.
-- Message content ordering uses block positions (Option B).

create table if not exists public.threads (
  id text primary key,
  title text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.messages (
  id text primary key,
  thread_id text not null references public.threads(id) on delete cascade,
  role text not null,
  created_at timestamptz not null,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.blocks (
  id text primary key,
  thread_id text not null references public.threads(id) on delete cascade,
  message_id text not null references public.messages(id) on delete cascade,
  position integer not null,
  type text not null,
  text text not null,
  edited boolean not null default false,
  selections jsonb not null default '[]'::jsonb,
  prev_text text,
  is_rewritten boolean not null default false
);

create index if not exists messages_thread_id_idx on public.messages(thread_id);
create index if not exists blocks_thread_id_idx on public.blocks(thread_id);
create index if not exists blocks_message_id_idx on public.blocks(message_id);
