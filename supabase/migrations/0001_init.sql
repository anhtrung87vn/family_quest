-- 0001_init.sql — BloomQuest Family core schema (Phase 1)
-- Design refs: §19–§21 + Star Transaction Model.

create extension if not exists "pgcrypto";

-- =========================
-- Core
-- =========================
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null check (role in ('parent')) default 'parent',
  created_at timestamptz not null default now()
);
create index if not exists users_family_id_idx on users(family_id);

create table if not exists user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  language text not null default 'en' check (language in ('en','vi'))
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  grade smallint,
  avatar_url text,
  pin_hash text not null,
  current_dream_reward_id uuid,
  preferred_language text not null default 'en' check (preferred_language in ('en','vi')),
  lifetime_stars integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists children_family_id_idx on children(family_id);

-- =========================
-- Tasks
-- =========================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  description text,
  category text,
  coin_reward integer not null default 0 check (coin_reward >= 0),
  star_reward integer not null default 0 check (star_reward >= 0),
  difficulty smallint check (difficulty between 1 and 3),
  is_recurring boolean not null default false,
  recurrence_rule text,
  requires_approval boolean not null default true,
  is_system_template boolean not null default false,
  active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists tasks_family_id_idx on tasks(family_id);

create table if not exists task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  due_date date,
  status text not null check (status in ('todo','submitted','approved','rejected','expired')) default 'todo',
  created_at timestamptz not null default now()
);
create index if not exists task_assignments_child_status_idx on task_assignments(child_id, status);
create index if not exists task_assignments_task_idx on task_assignments(task_id);

create table if not exists task_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references task_assignments(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references users(id),
  status text not null check (status in ('submitted','approved','rejected')) default 'submitted',
  parent_note text,
  celebration_message text
);
create index if not exists task_completions_assignment_idx on task_completions(assignment_id);

-- =========================
-- Rewards
-- =========================
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  description text,
  category text,
  coin_cost integer not null check (coin_cost > 0),
  image_url text,
  requires_approval boolean not null default true,
  dream_eligible boolean not null default false,
  is_system_template boolean not null default false,
  active boolean not null default true,
  stock integer,
  created_at timestamptz not null default now()
);
create index if not exists rewards_family_id_idx on rewards(family_id);

create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references rewards(id) on delete restrict,
  child_id uuid not null references children(id) on delete cascade,
  coin_cost integer not null,
  status text not null check (status in ('requested','approved','rejected','fulfilled','cancelled')) default 'requested',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references users(id)
);
create index if not exists reward_redemptions_child_status_idx on reward_redemptions(child_id, status);

alter table children
  drop constraint if exists children_current_dream_reward_fk;
alter table children
  add constraint children_current_dream_reward_fk
  foreign key (current_dream_reward_id) references rewards(id) on delete set null;

-- =========================
-- Ledgers (immutable — enforce no update/delete via RLS + policy)
-- =========================
create table if not exists coin_transactions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  amount integer not null,
  transaction_type text not null check (transaction_type in (
    'TASK_REWARD','BONUS','REWARD_REDEMPTION','MANUAL_ADJUSTMENT',
    'CORRECTION','STREAK_BONUS','FAMILY_QUEST'
  )),
  reference_id uuid,
  description text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists coin_transactions_child_created_idx
  on coin_transactions (child_id, created_at desc);

create table if not exists star_transactions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  amount integer not null,
  transaction_type text not null check (transaction_type in (
    'TASK_STAR_REWARD','BADGE_BONUS','STREAK_BONUS','WEEKLY_CHALLENGE',
    'FAMILY_QUEST','MANUAL_ADJUSTMENT','CORRECTION'
  )),
  reference_id uuid,
  description text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists star_transactions_child_created_idx
  on star_transactions (child_id, created_at desc);

create or replace view child_balances as
  select
    c.id as child_id,
    coalesce((select sum(amount) from coin_transactions where child_id = c.id), 0)::int as coin_balance,
    coalesce((select sum(amount) from star_transactions where child_id = c.id), 0)::int as star_balance
  from children c;

-- =========================
-- Helper: family_id of current auth.user
-- =========================
create or replace function auth_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.users where id = auth.uid()
$$;
