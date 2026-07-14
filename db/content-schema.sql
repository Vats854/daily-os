-- Normalized content layer for Daily OS.
-- Run after db/supabase-state-sync.sql. The legacy JSON state remains available
-- while the app migrates object by object.

create table if not exists public.note_folders (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id text,
  title text not null check (char_length(title) between 1 and 120),
  icon text not null default 'notebook-pen',
  tone text not null default 'blue',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, parent_id) references public.note_folders(user_id, id) on delete cascade
);

create table if not exists public.notes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id text,
  title text not null default 'Без названия',
  body text not null default '',
  tags text[] not null default '{}',
  source_type text not null default 'manual',
  source_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, folder_id) references public.note_folders(user_id, id) on delete restrict
);

create index if not exists note_folders_user_parent_idx on public.note_folders(user_id, parent_id, position);
create index if not exists notes_user_folder_updated_idx on public.notes(user_id, folder_id, updated_at desc);
create index if not exists notes_search_idx on public.notes using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')));
create index if not exists notes_tags_idx on public.notes using gin (tags);

alter table public.note_folders enable row level security;
alter table public.notes enable row level security;

drop policy if exists "Users manage own note folders" on public.note_folders;
create policy "Users manage own note folders" on public.note_folders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own notes" on public.notes;
create policy "Users manage own notes" on public.notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
