create table if not exists public.daily_os_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.daily_os_states enable row level security;

drop policy if exists "Users can read own Daily OS state" on public.daily_os_states;
create policy "Users can read own Daily OS state"
on public.daily_os_states
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own Daily OS state" on public.daily_os_states;
create policy "Users can insert own Daily OS state"
on public.daily_os_states
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own Daily OS state" on public.daily_os_states;
create policy "Users can update own Daily OS state"
on public.daily_os_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
