create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.calendar_notification_deliveries (
  delivery_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.calendar_notification_deliveries enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx
on public.push_subscriptions(user_id);

-- Run the deployed calendar-push Edge Function every minute from Supabase Cron.
-- Store the project URL and service role key in Vault; do not place secrets here.
