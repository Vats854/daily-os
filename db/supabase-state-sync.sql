create table if not exists public.daily_os_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.daily_os_states add column if not exists revision bigint not null default 0;

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

create or replace function public.save_daily_os_state(
  p_expected_revision bigint,
  p_next_state jsonb
)
returns table(state jsonb, updated_at timestamptz, revision bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_revision bigint;
begin
  select s.revision into current_revision
  from public.daily_os_states s
  where s.user_id = auth.uid()
  for update;

  if not found then
    if coalesce(p_expected_revision, 0) <> 0 then
      raise exception 'SYNC_CONFLICT' using errcode = 'P0001';
    end if;
    insert into public.daily_os_states(user_id, state, revision, updated_at)
    values (auth.uid(), p_next_state, 1, now());
  else
    if current_revision <> coalesce(p_expected_revision, 0) then
      raise exception 'SYNC_CONFLICT' using errcode = 'P0001';
    end if;
    update public.daily_os_states s
    set state = p_next_state,
        revision = current_revision + 1,
        updated_at = now()
    where s.user_id = auth.uid();
  end if;

  return query
  select s.state, s.updated_at, s.revision
  from public.daily_os_states s
  where s.user_id = auth.uid();
end;
$$;

grant execute on function public.save_daily_os_state(bigint, jsonb) to authenticated;
