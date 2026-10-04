-- 0029_responsibility_events.sql — Responsibility, Repair & Logical Consequence schema
-- Adds responsibility_policy to tasks and creates responsibility_events table.

-- 1. Add responsibility_policy to tasks
alter table tasks
  add column if not exists responsibility_policy text
    not null default 'NONE';

-- Add CHECK constraint separately for idempotency
do $$ begin
  alter table tasks add constraint tasks_responsibility_policy_check
    check (responsibility_policy in ('NONE', 'REPAIR_REQUIRED', 'COMPLETE_BEFORE_PRIVILEGE', 'PARENT_DECIDES'));
exception when duplicate_object then null;
end $$;

-- 2. Create responsibility_events table
create table if not exists responsibility_events (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references families(id) on delete cascade,
  child_id           uuid not null references children(id) on delete cascade,
  task_id            uuid not null references tasks(id) on delete cascade,
  task_assignment_id uuid references task_assignments(id) on delete set null,
  task_completion_id uuid references task_completions(id) on delete set null,

  event_type         text not null check (event_type in (
    'FORGOTTEN', 'NEEDED_HELP', 'EXCUSED', 'REFUSED', 'REMINDER'
  )),
  status             text not null default 'OPEN' check (status in (
    'OPEN', 'RESOLVED', 'CANCELLED'
  )),

  occurred_at        timestamptz not null default now(),
  resolved_at        timestamptz,

  created_by         uuid references users(id),
  parent_note        text,
  reminder_count     integer not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 3. RLS
alter table responsibility_events enable row level security;

-- Parent read: family scoped
create policy resp_events_family_read on responsibility_events
  for select
  using (family_id = auth_family_id());

-- Parent write: family scoped
create policy resp_events_family_write on responsibility_events
  for all
  using (family_id = auth_family_id())
  with check (family_id = auth_family_id());

-- 4. Indexes
create index if not exists resp_events_family_idx
  on responsibility_events(family_id);

create index if not exists resp_events_child_status_idx
  on responsibility_events(child_id, status);

create index if not exists resp_events_task_idx
  on responsibility_events(task_id);

create index if not exists resp_events_child_occurred_idx
  on responsibility_events(child_id, occurred_at desc);

-- 5. Backfill: system responsibility templates get REPAIR_REQUIRED
update tasks set responsibility_policy = 'REPAIR_REQUIRED'
  where is_system_template = true
    and behavior_type = 'responsibility'
    and responsibility_policy = 'NONE';

-- Homework-type habit_building templates get COMPLETE_BEFORE_PRIVILEGE
update tasks set responsibility_policy = 'COMPLETE_BEFORE_PRIVILEGE'
  where is_system_template = true
    and name in ('Finish Homework', 'Screen Time Self-Control')
    and responsibility_policy = 'NONE';
