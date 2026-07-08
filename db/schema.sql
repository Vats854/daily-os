create table users (
  id uuid primary key,
  email text unique,
  timezone text not null default 'Europe/Moscow',
  morning_planning_time time not null default '09:00',
  evening_review_time time not null default '21:30',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table areas (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  key text not null check (key in ('work', 'personal', 'health')),
  title text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create table projects (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  title text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'done', 'archived')),
  progress integer not null default 0 check (progress between 0 and 100),
  journey_stage text not null default 'call' check (journey_stage in ('call', 'commitment', 'preparation', 'trial', 'crisis', 'result', 'integration')),
  journey_status text not null default 'active' check (journey_status in ('active', 'watch', 'blocked', 'complete')),
  stage_reason text,
  next_transition text,
  last_stage_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_stage_events (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  from_stage text check (from_stage in ('call', 'commitment', 'preparation', 'trial', 'crisis', 'result', 'integration')),
  to_stage text not null check (to_stage in ('call', 'commitment', 'preparation', 'trial', 'crisis', 'result', 'integration')),
  reason text not null,
  evidence jsonb not null default '[]',
  proposed_by text not null default 'assistant' check (proposed_by in ('assistant', 'user', 'system')),
  status text not null default 'needs_confirmation' check (status in ('needs_confirmation', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);

create table project_obstacles (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,
  text text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  area_id uuid references areas(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'inbox' check (status in ('inbox', 'backlog', 'this_week', 'today', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  estimated_minutes integer not null default 30,
  due_date date,
  needs_review boolean not null default false,
  created_by text not null default 'user' check (created_by in ('user', 'assistant', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table daily_plans (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  plan_date date not null,
  focus text not null,
  status text not null default 'steady' check (status in ('steady', 'low_energy', 'overloaded')),
  energy text not null default 'medium' check (energy in ('low', 'medium', 'high')),
  review_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create table weekly_plans (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  week_start date not null,
  focus jsonb not null default '[]',
  review_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table notes (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  type text not null default 'note' check (type in ('note', 'idea', 'health_signal', 'daily_context', 'learning')),
  text text not null,
  source_inbox_item_id uuid,
  created_at timestamptz not null default now()
);

create table inbox_items (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  raw_text text not null,
  parsed_kind text not null,
  parsed_payload jsonb not null,
  status text not null default 'processed' check (status in ('new', 'processed', 'needs_review', 'discarded')),
  created_at timestamptz not null default now()
);

create table calendar_events (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  external_calendar_id text not null,
  external_event_id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'readonly_calendar',
  created_at timestamptz not null default now(),
  unique (user_id, external_calendar_id, external_event_id)
);

create table assistant_actions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  inbox_item_id uuid references inbox_items(id) on delete set null,
  action_type text not null,
  target_type text not null,
  target_id uuid,
  summary text not null,
  reason text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'needs_review', 'reverted')),
  created_at timestamptz not null default now()
);

create table memory_items (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  key text not null,
  text text not null,
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  source_type text not null default 'assistant_action',
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_status_idx on tasks(user_id, status);
create index tasks_user_priority_idx on tasks(user_id, priority);
create index projects_user_stage_idx on projects(user_id, journey_stage);
create index project_stage_events_project_created_idx on project_stage_events(project_id, created_at desc);
create index project_obstacles_project_status_idx on project_obstacles(project_id, status);
create index calendar_events_user_start_idx on calendar_events(user_id, starts_at);
create index assistant_actions_user_created_idx on assistant_actions(user_id, created_at desc);
create index memory_items_user_key_idx on memory_items(user_id, key);
