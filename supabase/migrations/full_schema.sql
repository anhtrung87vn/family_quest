-- =============================================================
-- full_schema.sql — Complete BloomQuest Family DB schema
-- Consolidated from migrations 0001–0034 into final-state DDL.
-- Run this ONCE on a fresh Supabase project.
--
-- After running this file, also run (in order):
--   1. 0027_seed_curriculum.sql        (90 templates, ages 7-12)
--   2. 0028_seed_curriculum_teens.sql   (90 templates, ages 13-18)
--
-- NOTE: 0007_dev_seed is EXCLUDED (dev-only data).
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- §1  Extensions
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";


-- ─────────────────────────────────────────────────────────────
-- §2  Core tables (final column definitions — no ALTER needed)
-- ─────────────────────────────────────────────────────────────

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
  current_dream_reward_id uuid,  -- FK added after rewards table
  preferred_language text not null default 'en' check (preferred_language in ('en','vi')),
  lifetime_stars integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Phase 6: vacation mode
  vacation_mode boolean not null default false,
  vacation_start date,
  vacation_end date,
  -- Age system
  date_of_birth date
);
create index if not exists children_family_id_idx on children(family_id);

-- Tasks table — all columns from 0001 + 0012 (pool) + 0015 (habit) + 0016
-- (evidence) + 0023 (locale) + 0026 (curriculum) + 0029 (responsibility)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  name_vi text,
  description text,
  description_vi text,
  category text,
  coin_reward integer not null default 0 check (coin_reward >= 0),
  star_reward integer not null default 0 check (star_reward >= 0),
  difficulty smallint check (difficulty between 1 and 10),
  is_recurring boolean not null default false,
  recurrence_rule text,
  requires_approval boolean not null default true,
  is_system_template boolean not null default false,
  active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  -- Pool system (0012)
  in_pool boolean not null default false,
  pool_max_per_day integer,
  pool_max_per_week integer,
  -- Habit system (0015)
  behavior_type text not null default 'challenge'
    check (behavior_type in ('responsibility','habit_building','challenge','character','family')),
  availability_type text not null default 'assigned_only'
    check (availability_type in ('assigned_only','choice_pool','both')),
  -- Evidence system (0016)
  evidence_type text not null default 'none'
    check (evidence_type in ('none','photo','audio','text','choice','parent_observation')),
  evidence_required boolean not null default false,
  max_audio_seconds smallint not null default 30
    check (max_audio_seconds between 5 and 60),
  -- Curriculum schema (0026)
  skill_domain text
    check (skill_domain in (
      'LEARNING','SELF_MANAGEMENT','LIFE_HOME','MONEY',
      'COMMUNICATION','CHARACTER_FAMILY','HEALTH','DIGITAL',
      'WORLD_INDEPENDENCE'
    )),
  skill_subdomain text,
  min_age integer check (min_age between 4 and 21),
  recommended_age integer check (recommended_age between 4 and 21),
  max_age integer check (max_age between 4 and 21),
  independence_level text
    check (independence_level in ('GUIDED','SUPPORTED','INDEPENDENT')),
  estimated_minutes integer check (estimated_minutes between 1 and 480),
  recommended_frequency text,
  requires_supervision boolean not null default false,
  development_goal text,
  development_goal_vi text,
  parent_tip text,
  parent_tip_vi text,
  template_key text,
  source_template_key text,
  skill_ladder_key text,
  skill_ladder_level integer check (skill_ladder_level between 1 and 20),
  -- Responsibility events (0029)
  responsibility_policy text not null default 'NONE'
    check (responsibility_policy in ('NONE','REPAIR_REQUIRED','COMPLETE_BEFORE_PRIVILEGE','PARENT_DECIDES'))
);
create index if not exists tasks_family_id_idx on tasks(family_id);
create index if not exists tasks_pool_idx on tasks(family_id, in_pool, active) where in_pool = true;
create index if not exists tasks_behavior_type_idx on tasks(family_id, behavior_type) where active = true;
create unique index if not exists tasks_template_key_uniq
  on tasks(template_key) where template_key is not null and is_system_template = true;
create index if not exists tasks_curriculum_idx
  on tasks(skill_domain, recommended_age) where is_system_template = true and active = true;

create table if not exists task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  due_date date,
  status text not null check (status in ('todo','submitted','approved','rejected','expired')) default 'todo',
  created_at timestamptz not null default now(),
  -- Assignment source tracking (0015)
  assignment_source text not null default 'parent'
    check (assignment_source in ('parent','choice_pool','family','system'))
);
create index if not exists task_assignments_child_status_idx on task_assignments(child_id, status);
create index if not exists task_assignments_task_idx on task_assignments(task_id);
create index if not exists task_assignments_child_due_idx on task_assignments(child_id, due_date);

create table if not exists task_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references task_assignments(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references users(id),
  status text not null check (status in ('submitted','approved','rejected')) default 'submitted',
  parent_note text,
  celebration_message text,
  photo_url text
);
create index if not exists task_completions_assignment_idx on task_completions(assignment_id);
create index if not exists task_completions_status_idx on task_completions(status);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  name_vi text,
  description text,
  description_vi text,
  category text,
  coin_cost integer not null check (coin_cost > 0),
  image_url text,
  requires_approval boolean not null default true,
  dream_eligible boolean not null default false,
  is_system_template boolean not null default false,
  active boolean not null default true,
  stock integer,
  created_at timestamptz not null default now(),
  link_url text
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
create index if not exists reward_redemptions_status_idx on reward_redemptions(status);

-- FK: children.current_dream_reward_id → rewards
alter table children
  drop constraint if exists children_current_dream_reward_fk;
alter table children
  add constraint children_current_dream_reward_fk
  foreign key (current_dream_reward_id) references rewards(id) on delete set null;

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

create table if not exists child_pin_attempts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  ip text,
  success boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists child_pin_attempts_child_time_idx
  on child_pin_attempts(child_id, attempted_at desc);


-- ─────────────────────────────────────────────────────────────
-- §3  Views & helper functions
-- ─────────────────────────────────────────────────────────────

create or replace view child_balances as
  select
    c.id as child_id,
    coalesce((select sum(amount) from coin_transactions where child_id = c.id), 0)::int as coin_balance,
    coalesce((select sum(amount) from star_transactions where child_id = c.id), 0)::int as star_balance
  from children c;

create or replace function auth_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.users where id = auth.uid()
$$;

create or replace function child_age(dob date)
returns integer
language sql immutable as $$
  select extract(year from age(current_date, dob))::integer
$$;

create or replace function child_age_by_id(p_child_id uuid)
returns integer
language sql stable as $$
  select child_age(date_of_birth) from children where id = p_child_id
$$;


-- ─────────────────────────────────────────────────────────────
-- §4  Row-Level Security — all tables
-- ─────────────────────────────────────────────────────────────

alter table families           enable row level security;
alter table users              enable row level security;
alter table user_preferences   enable row level security;
alter table children           enable row level security;
alter table tasks              enable row level security;
alter table task_assignments   enable row level security;
alter table task_completions   enable row level security;
alter table rewards            enable row level security;
alter table reward_redemptions enable row level security;
alter table coin_transactions  enable row level security;
alter table star_transactions  enable row level security;
alter table child_pin_attempts enable row level security;

create policy families_select on families for select
  using (id = auth_family_id());

create policy users_select on users for select using (id = auth.uid());
create policy users_update on users for update using (id = auth.uid());

create policy user_prefs_all on user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy children_family_read on children for select
  using (family_id = auth_family_id());
create policy children_family_write on children for all
  using (family_id = auth_family_id()) with check (family_id = auth_family_id());

create policy tasks_family_read on tasks for select
  using (family_id = auth_family_id());
create policy tasks_family_write on tasks for all
  using (family_id = auth_family_id()) with check (family_id = auth_family_id());

create policy rewards_family_read on rewards for select
  using (family_id = auth_family_id());
create policy rewards_family_write on rewards for all
  using (family_id = auth_family_id()) with check (family_id = auth_family_id());

create policy task_assignments_family_read on task_assignments for select
  using (exists (select 1 from children c where c.id = task_assignments.child_id and c.family_id = auth_family_id()));
create policy task_assignments_family_write on task_assignments for all
  using (exists (select 1 from children c where c.id = task_assignments.child_id and c.family_id = auth_family_id()))
  with check (exists (select 1 from children c where c.id = task_assignments.child_id and c.family_id = auth_family_id()));

create policy task_completions_family_read on task_completions for select
  using (exists (
    select 1 from task_assignments a
    join children c on c.id = a.child_id
    where a.id = task_completions.assignment_id and c.family_id = auth_family_id()
  ));
create policy task_completions_family_write on task_completions for all
  using (exists (
    select 1 from task_assignments a
    join children c on c.id = a.child_id
    where a.id = task_completions.assignment_id and c.family_id = auth_family_id()
  ))
  with check (exists (
    select 1 from task_assignments a
    join children c on c.id = a.child_id
    where a.id = task_completions.assignment_id and c.family_id = auth_family_id()
  ));

create policy reward_redemptions_family_read on reward_redemptions for select
  using (exists (select 1 from children c where c.id = reward_redemptions.child_id and c.family_id = auth_family_id()));
create policy reward_redemptions_family_write on reward_redemptions for all
  using (exists (select 1 from children c where c.id = reward_redemptions.child_id and c.family_id = auth_family_id()))
  with check (exists (select 1 from children c where c.id = reward_redemptions.child_id and c.family_id = auth_family_id()));

create policy coin_transactions_family_read on coin_transactions for select
  using (exists (select 1 from children c where c.id = coin_transactions.child_id and c.family_id = auth_family_id()));

create policy star_transactions_family_read on star_transactions for select
  using (exists (select 1 from children c where c.id = star_transactions.child_id and c.family_id = auth_family_id()));


-- ─────────────────────────────────────────────────────────────
-- §5  Storage buckets & policies
-- ─────────────────────────────────────────────────────────────

-- Family avatars
insert into storage.buckets (id, name, public)
  values ('family-avatars', 'family-avatars', false)
  on conflict (id) do nothing;

create policy avatars_read on storage.objects for select
  using (bucket_id = 'family-avatars'
    and (storage.foldername(name))[1] = auth_family_id()::text);

create policy avatars_write on storage.objects for all
  using (bucket_id = 'family-avatars'
    and (storage.foldername(name))[1] = auth_family_id()::text)
  with check (bucket_id = 'family-avatars'
    and (storage.foldername(name))[1] = auth_family_id()::text);

-- Family evidence
insert into storage.buckets (id, name, public, file_size_limit)
  values ('family-evidence', 'family-evidence', false, 10485760)
  on conflict (id) do nothing;

create policy evidence_storage_read on storage.objects for select
  using (bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text);

create policy evidence_storage_write on storage.objects for all
  using (bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text)
  with check (bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text);

-- Family memories
insert into storage.buckets (id, name, public, file_size_limit)
  values ('family-memories', 'family-memories', false, 10485760)
  on conflict (id) do nothing;

create policy memories_storage_read on storage.objects for select
  using (bucket_id = 'family-memories'
    and (storage.foldername(name))[1] = auth_family_id()::text);

create policy memories_storage_write on storage.objects for all
  using (bucket_id = 'family-memories'
    and (storage.foldername(name))[1] = auth_family_id()::text)
  with check (bucket_id = 'family-memories'
    and (storage.foldername(name))[1] = auth_family_id()::text);

-- Parent messages
insert into storage.buckets (id, name, public)
  values ('parent-messages', 'parent-messages', false)
  on conflict (id) do nothing;

create policy "service role full access on parent-messages"
  on storage.objects for all to service_role
  using (bucket_id = 'parent-messages')
  with check (bucket_id = 'parent-messages');

create policy "authenticated download parent-messages"
  on storage.objects for select to authenticated
  using (bucket_id = 'parent-messages');

-- Reward images
insert into storage.buckets (id, name, public)
  values ('reward-images', 'reward-images', true)
  on conflict (id) do nothing;

create policy reward_images_read on storage.objects for select
  using (bucket_id = 'reward-images');

create policy reward_images_write on storage.objects for all
  using (bucket_id = 'reward-images')
  with check (bucket_id = 'reward-images');


-- ─────────────────────────────────────────────────────────────
-- §6  Habit system — reward progression & effective_rewards
-- ─────────────────────────────────────────────────────────────

create table if not exists child_task_reward_progress (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references children(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  reward_stage    text not null default 'full_reward'
    check (reward_stage in ('full_reward','reduced_reward','stars_only','graduated')),
  completions     int not null default 0,
  started_at      timestamptz not null default now(),
  stage_changed_at timestamptz not null default now(),
  graduated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (child_id, task_id)
);
create index if not exists child_task_reward_progress_child_idx on child_task_reward_progress(child_id);

alter table child_task_reward_progress enable row level security;

create policy child_task_reward_progress_family on child_task_reward_progress for all
  using (exists (select 1 from children c where c.id = child_task_reward_progress.child_id and c.family_id = auth_family_id()));

create or replace function effective_rewards(p_coin int, p_star int, p_stage text)
returns table(eff_coin int, eff_star int) language sql immutable as $$
  select
    case p_stage
      when 'full_reward'    then p_coin
      when 'reduced_reward' then greatest(floor(p_coin * 0.4)::int, 0)
      when 'stars_only'     then 0
      when 'graduated'      then 0
      else p_coin
    end,
    case p_stage
      when 'full_reward'    then p_star
      when 'reduced_reward' then p_star
      when 'stars_only'     then case when p_star > 0 then greatest(floor(p_star * 0.5)::int, 1) else 0 end
      when 'graduated'      then 0
      else p_star
    end;
$$;


-- ─────────────────────────────────────────────────────────────
-- §7  Ledger functions — FINAL versions (habit-aware from 0015)
-- ─────────────────────────────────────────────────────────────

create or replace function award_task(p_completion_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid; v_assignment_id uuid; v_child_id uuid; v_task_id uuid;
  v_coin int; v_star int; v_behavior text; v_stage text; v_eff_coin int; v_eff_star int;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'award_task: not authenticated'; end if;
  select tc.assignment_id, a.child_id, a.task_id into v_assignment_id, v_child_id, v_task_id
  from task_completions tc join task_assignments a on a.id = tc.assignment_id
  where tc.id = p_completion_id for update;
  if v_assignment_id is null then raise exception 'award_task: completion % not found', p_completion_id; end if;
  select c.family_id into v_family_id from children c where c.id = v_child_id;
  if v_family_id is null or v_family_id <> auth_family_id() then raise exception 'award_task: family scope violation'; end if;
  select t.coin_reward, t.star_reward, t.behavior_type into v_coin, v_star, v_behavior from tasks t where t.id = v_task_id;
  v_stage := 'full_reward';
  if v_behavior = 'habit_building' then
    select p.reward_stage into v_stage from child_task_reward_progress p where p.child_id = v_child_id and p.task_id = v_task_id;
    v_stage := coalesce(v_stage, 'full_reward');
  elsif v_behavior = 'responsibility' then
    v_stage := coalesce((select p.reward_stage from child_task_reward_progress p where p.child_id = v_child_id and p.task_id = v_task_id), 'graduated');
  end if;
  select er.eff_coin, er.eff_star into v_eff_coin, v_eff_star from effective_rewards(v_coin, v_star, v_stage) er;
  update task_completions set status = 'approved', approved_at = now(), approved_by = v_actor,
    parent_note = coalesce(p_note, parent_note) where id = p_completion_id and status = 'submitted';
  update task_assignments set status = 'approved' where id = v_assignment_id;
  if coalesce(v_eff_coin, 0) > 0 then
    insert into coin_transactions(child_id, amount, transaction_type, reference_id, description, created_by)
    values (v_child_id, v_eff_coin, 'TASK_REWARD', p_completion_id, 'Task approved', v_actor);
  end if;
  if coalesce(v_eff_star, 0) > 0 then
    insert into star_transactions(child_id, amount, transaction_type, reference_id, description, created_by)
    values (v_child_id, v_eff_star, 'TASK_STAR_REWARD', p_completion_id, 'Task approved', v_actor);
    update children set lifetime_stars = lifetime_stars + v_eff_star where id = v_child_id;
  end if;
  insert into child_task_reward_progress (child_id, task_id, completions) values (v_child_id, v_task_id, 1)
  on conflict (child_id, task_id) do update set completions = child_task_reward_progress.completions + 1, updated_at = now();
end $$;

create or replace function auto_award_task(p_completion_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_assignment_id uuid; v_child_id uuid; v_task_id uuid;
  v_coin int; v_star int; v_behavior text; v_stage text; v_eff_coin int; v_eff_star int;
begin
  select tc.assignment_id, a.child_id, a.task_id into v_assignment_id, v_child_id, v_task_id
  from task_completions tc join task_assignments a on a.id = tc.assignment_id where tc.id = p_completion_id;
  select t.coin_reward, t.star_reward, t.behavior_type into v_coin, v_star, v_behavior from tasks t where t.id = v_task_id;
  v_stage := 'full_reward';
  if v_behavior = 'habit_building' then
    select p.reward_stage into v_stage from child_task_reward_progress p where p.child_id = v_child_id and p.task_id = v_task_id;
    v_stage := coalesce(v_stage, 'full_reward');
  elsif v_behavior = 'responsibility' then
    v_stage := coalesce((select p.reward_stage from child_task_reward_progress p where p.child_id = v_child_id and p.task_id = v_task_id), 'graduated');
  end if;
  select er.eff_coin, er.eff_star into v_eff_coin, v_eff_star from effective_rewards(v_coin, v_star, v_stage) er;
  update task_completions set status = 'approved', approved_at = now() where id = p_completion_id;
  update task_assignments set status = 'approved' where id = v_assignment_id;
  if coalesce(v_eff_coin, 0) > 0 then
    insert into coin_transactions(child_id, amount, transaction_type, reference_id, description)
    values (v_child_id, v_eff_coin, 'TASK_REWARD', p_completion_id, 'Auto-approved');
  end if;
  if coalesce(v_eff_star, 0) > 0 then
    insert into star_transactions(child_id, amount, transaction_type, reference_id, description)
    values (v_child_id, v_eff_star, 'TASK_STAR_REWARD', p_completion_id, 'Auto-approved');
    update children set lifetime_stars = lifetime_stars + v_eff_star where id = v_child_id;
  end if;
  insert into child_task_reward_progress (child_id, task_id, completions) values (v_child_id, v_task_id, 1)
  on conflict (child_id, task_id) do update set completions = child_task_reward_progress.completions + 1, updated_at = now();
end $$;

create or replace function reject_task(p_completion_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_assignment_id uuid; v_child_family uuid; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'reject_task: not authenticated'; end if;
  select tc.assignment_id, c.family_id into v_assignment_id, v_child_family
  from task_completions tc join task_assignments a on a.id = tc.assignment_id
  join children c on c.id = a.child_id where tc.id = p_completion_id for update;
  if v_child_family is null or v_child_family <> auth_family_id() then raise exception 'reject_task: family scope violation'; end if;
  update task_completions set status = 'rejected', parent_note = p_note, approved_by = v_actor, approved_at = now() where id = p_completion_id;
  update task_assignments set status = 'rejected' where id = v_assignment_id;
end $$;

create or replace function redeem_reward(p_redemption_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_child_id uuid; v_family_id uuid; v_cost int; v_balance int; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'redeem_reward: not authenticated'; end if;
  select r.child_id, r.coin_cost, c.family_id into v_child_id, v_cost, v_family_id
  from reward_redemptions r join children c on c.id = r.child_id where r.id = p_redemption_id for update;
  if v_family_id is null or v_family_id <> auth_family_id() then raise exception 'redeem_reward: family scope violation'; end if;
  select coalesce(sum(amount), 0) into v_balance from coin_transactions where child_id = v_child_id;
  if v_balance < v_cost then raise exception 'redeem_reward: insufficient balance (% < %)', v_balance, v_cost; end if;
  update reward_redemptions set status = 'approved', approved_at = now(), approved_by = v_actor
    where id = p_redemption_id and status = 'requested';
  insert into coin_transactions(child_id, amount, transaction_type, reference_id, description, created_by)
  values (v_child_id, -v_cost, 'REWARD_REDEMPTION', p_redemption_id, 'Reward redeemed', v_actor);
end $$;

create or replace function reject_redemption(p_redemption_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'reject_redemption: not authenticated'; end if;
  select c.family_id into v_family_id from reward_redemptions r join children c on c.id = r.child_id
    where r.id = p_redemption_id for update;
  if v_family_id is null or v_family_id <> auth_family_id() then raise exception 'reject_redemption: family scope violation'; end if;
  update reward_redemptions set status = 'rejected', approved_by = v_actor, approved_at = now()
    where id = p_redemption_id and status = 'requested';
end $$;

create or replace function manual_adjust_coins(p_child_id uuid, p_amount int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'manual_adjust_coins: not authenticated'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'manual_adjust_coins: reason required'; end if;
  if p_amount = 0 then raise exception 'manual_adjust_coins: amount must be non-zero'; end if;
  select family_id into v_family_id from children where id = p_child_id;
  if v_family_id is null or v_family_id <> auth_family_id() then raise exception 'manual_adjust_coins: family scope violation'; end if;
  insert into coin_transactions(child_id, amount, transaction_type, description, created_by)
  values (p_child_id, p_amount, 'MANUAL_ADJUSTMENT', p_reason, v_actor);
end $$;

create or replace function submit_task(p_assignment_id uuid, p_child_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_child_id uuid; v_status text; v_requires_approval boolean; v_task_id uuid; v_completion_id uuid;
begin
  select a.child_id, a.status, t.requires_approval, t.id into v_child_id, v_status, v_requires_approval, v_task_id
  from task_assignments a join tasks t on t.id = a.task_id where a.id = p_assignment_id for update;
  if v_child_id is null then raise exception 'submit_task: assignment not found'; end if;
  if v_child_id <> p_child_id then raise exception 'submit_task: child mismatch'; end if;
  if v_status not in ('todo','rejected') then raise exception 'submit_task: invalid state %', v_status; end if;
  update task_assignments set status = 'submitted' where id = p_assignment_id;
  insert into task_completions(assignment_id, status) values (p_assignment_id, 'submitted') returning id into v_completion_id;
  if v_requires_approval = false then perform auto_award_task(v_completion_id); end if;
  return v_completion_id;
end $$;

create or replace function request_redemption(p_reward_id uuid, p_child_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid; v_reward_family uuid; v_active boolean; v_cost int;
  v_requires_approval boolean; v_stock int; v_balance int; v_redemption_id uuid;
begin
  select family_id into v_family_id from children where id = p_child_id;
  select family_id, coin_cost, requires_approval, active, stock into v_reward_family, v_cost, v_requires_approval, v_active, v_stock
    from rewards where id = p_reward_id for update;
  if v_reward_family is null then raise exception 'request_redemption: reward not found'; end if;
  if v_reward_family <> v_family_id then raise exception 'request_redemption: family mismatch'; end if;
  if v_active is not true then raise exception 'request_redemption: reward inactive'; end if;
  if v_stock is not null and v_stock <= 0 then raise exception 'request_redemption: out of stock'; end if;
  select coalesce(sum(amount), 0) into v_balance from coin_transactions where child_id = p_child_id;
  if v_balance < v_cost then raise exception 'request_redemption: insufficient balance'; end if;
  insert into reward_redemptions(reward_id, child_id, coin_cost, status)
  values (p_reward_id, p_child_id, v_cost, case when v_requires_approval then 'requested' else 'approved' end)
  returning id into v_redemption_id;
  if v_stock is not null then update rewards set stock = stock - 1 where id = p_reward_id; end if;
  if v_requires_approval = false then
    insert into coin_transactions(child_id, amount, transaction_type, reference_id, description)
    values (p_child_id, -v_cost, 'REWARD_REDEMPTION', v_redemption_id, 'Auto-approved redemption');
    update reward_redemptions set approved_at = now() where id = v_redemption_id;
  end if;
  return v_redemption_id;
end $$;

grant execute on function award_task(uuid, text) to authenticated;
grant execute on function reject_task(uuid, text) to authenticated;
grant execute on function redeem_reward(uuid) to authenticated;
grant execute on function reject_redemption(uuid, text) to authenticated;
grant execute on function manual_adjust_coins(uuid, int, text) to authenticated;


-- ─────────────────────────────────────────────────────────────
-- §8  Badges, streaks, levels
-- ─────────────────────────────────────────────────────────────

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_vi text not null,
  description_en text,
  description_vi text,
  icon text not null default '🏅',
  category text not null check (category in ('milestone','streak','special')) default 'milestone',
  condition_type text not null,
  condition_value int not null default 0,
  star_bonus int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists child_badges (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (child_id, badge_id)
);
create index if not exists child_badges_child_idx on child_badges(child_id);

alter table child_badges enable row level security;
alter table badges enable row level security;

create policy badges_read on badges for select using (true);
create policy child_badges_read on child_badges for select
  using (exists (select 1 from children c where c.id = child_badges.child_id and c.family_id = auth_family_id()));

create table if not exists child_streaks (
  child_id uuid primary key references children(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_completion_date date,
  grace_used boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table child_streaks enable row level security;

create policy child_streaks_read on child_streaks for select
  using (exists (select 1 from children c where c.id = child_streaks.child_id and c.family_id = auth_family_id()));


-- ─────────────────────────────────────────────────────────────
-- §9  Family quests, weekly challenges, reflections
-- ─────────────────────────────────────────────────────────────

create table if not exists family_quests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  title_vi text,
  description text,
  description_vi text,
  target_count int not null default 1,
  current_count int not null default 0,
  coin_reward int not null default 0,
  star_reward int not null default 0,
  status text not null check (status in ('active','completed','cancelled')) default 'active',
  start_date date not null default current_date,
  end_date date,
  completed_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  is_system_template boolean not null default false
);

create table if not exists family_quest_members (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references family_quests(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  contributions int not null default 0,
  joined_at timestamptz not null default now(),
  unique (quest_id, child_id)
);

alter table family_quests enable row level security;
alter table family_quest_members enable row level security;

create policy family_quests_family on family_quests for all using (family_id = auth_family_id());
create policy family_quests_system_read on family_quests for select
  using (is_system_template = true);

create policy family_quest_members_read on family_quest_members for select
  using (exists (
    select 1 from family_quests fq where fq.id = family_quest_members.quest_id and fq.family_id = auth_family_id()
  ));

create table if not exists weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  challenge_type text not null check (challenge_type in ('tasks_count','category_focus','streak','custom')) default 'custom',
  target_value int not null default 1,
  coin_bonus int not null default 0,
  star_bonus int not null default 0,
  week_start date not null default (date_trunc('week', current_date)::date),
  week_end date not null default ((date_trunc('week', current_date) + interval '6 days')::date),
  status text not null check (status in ('active','completed','expired')) default 'active',
  created_at timestamptz not null default now()
);

create table if not exists weekly_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references weekly_challenges(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  current_value int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (challenge_id, child_id)
);

alter table weekly_challenges enable row level security;
alter table weekly_challenge_progress enable row level security;

create policy weekly_challenges_family on weekly_challenges for all using (family_id = auth_family_id());
create policy weekly_challenge_progress_read on weekly_challenge_progress for select
  using (exists (
    select 1 from weekly_challenges wc where wc.id = weekly_challenge_progress.challenge_id and wc.family_id = auth_family_id()
  ));

create table if not exists weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  week_start date not null,
  highlights text,
  growth_note text,
  parent_message text,
  tasks_completed int not null default 0,
  coins_earned int not null default 0,
  stars_earned int not null default 0,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  child_read_at timestamptz,
  unique (child_id, week_start)
);

alter table weekly_reflections enable row level security;
create policy weekly_reflections_family on weekly_reflections for all using (family_id = auth_family_id());


-- ─────────────────────────────────────────────────────────────
-- §10  Phase 6: collections, adventure map, themes, vacation, treasure box
-- ─────────────────────────────────────────────────────────────

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_vi text not null,
  description_en text,
  description_vi text,
  icon text not null default '📦',
  total_items int not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists child_collection_items (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  item_index int not null,
  earned_at timestamptz not null default now(),
  unique (child_id, collection_id, item_index)
);

alter table collections enable row level security;
alter table child_collection_items enable row level security;

create policy collections_read on collections for select using (true);
create policy child_collection_items_read on child_collection_items for select
  using (exists (select 1 from children c where c.id = child_collection_items.child_id and c.family_id = auth_family_id()));

create table if not exists adventure_map_nodes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_vi text not null,
  description_en text,
  description_vi text,
  icon text not null default '📍',
  position_index int not null default 0,
  unlock_condition_type text not null check (unlock_condition_type in ('level','tasks','stars','badge')),
  unlock_condition_value int not null default 0,
  reward_type text check (reward_type in ('coins','stars','badge','collection_item')),
  reward_value int,
  created_at timestamptz not null default now()
);

create table if not exists child_adventure_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  node_id uuid not null references adventure_map_nodes(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (child_id, node_id)
);

alter table adventure_map_nodes enable row level security;
alter table child_adventure_progress enable row level security;

create policy adventure_nodes_read on adventure_map_nodes for select using (true);
create policy child_adventure_read on child_adventure_progress for select
  using (exists (select 1 from children c where c.id = child_adventure_progress.child_id and c.family_id = auth_family_id()));

create table if not exists monthly_themes (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  name_en text not null,
  name_vi text not null,
  description_en text,
  description_vi text,
  icon text not null default '🎨',
  color text not null default '#f59e0b',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table monthly_themes enable row level security;
create policy monthly_themes_read on monthly_themes for select using (true);

create table if not exists treasure_box_history (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  week_start date not null,
  reward_type text not null check (reward_type in ('coins','stars','badge','collection_item')),
  reward_value int not null default 0,
  description text,
  opened_at timestamptz not null default now(),
  unique (child_id, week_start)
);

alter table treasure_box_history enable row level security;
create policy treasure_box_read on treasure_box_history for select
  using (exists (select 1 from children c where c.id = treasure_box_history.child_id and c.family_id = auth_family_id()));


-- ─────────────────────────────────────────────────────────────
-- §11  Pool system tables
-- ─────────────────────────────────────────────────────────────

create table if not exists child_pool_config (
  child_id          uuid primary key references children(id) on delete cascade,
  max_claims_per_day integer not null default 1,
  pool_size          integer not null default 4,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table child_pool_config enable row level security;

create policy child_pool_config_family on child_pool_config for all
  using (exists (select 1 from children c where c.id = child_pool_config.child_id and c.family_id = auth_family_id()));

create table if not exists pool_claims (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  task_id       uuid not null references tasks(id) on delete cascade,
  assignment_id uuid not null references task_assignments(id) on delete cascade,
  claimed_date  date not null default current_date,
  created_at    timestamptz not null default now()
);

create index if not exists pool_claims_child_date_idx on pool_claims(child_id, claimed_date);
create index if not exists pool_claims_task_child_date_idx on pool_claims(task_id, child_id, claimed_date);

alter table pool_claims enable row level security;

create policy pool_claims_family on pool_claims for all
  using (exists (select 1 from children c where c.id = pool_claims.child_id and c.family_id = auth_family_id()));

create table if not exists pool_refresh_log (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  refresh_date date not null default current_date,
  created_at   timestamptz not null default now(),
  unique (child_id, refresh_date)
);

alter table pool_refresh_log enable row level security;

create policy pool_refresh_log_family on pool_refresh_log for all
  using (exists (select 1 from children c where c.id = pool_refresh_log.child_id and c.family_id = auth_family_id()));

-- Auto-create pool config when a child is inserted
create or replace function create_child_pool_config()
returns trigger language plpgsql security definer as $$
declare
  v_max_claims integer; v_pool_size integer;
begin
  if new.grade >= 6 then v_max_claims := 2; v_pool_size := 6;
  else v_max_claims := 1; v_pool_size := 4;
  end if;
  insert into child_pool_config (child_id, max_claims_per_day, pool_size)
  values (new.id, v_max_claims, v_pool_size) on conflict (child_id) do nothing;
  return new;
end;
$$;

drop trigger if exists child_pool_config_trigger on children;
create trigger child_pool_config_trigger
  after insert on children
  for each row execute function create_child_pool_config();


-- ─────────────────────────────────────────────────────────────
-- §12  Parent messages
-- ─────────────────────────────────────────────────────────────

create table if not exists parent_messages (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  child_id       uuid not null references children(id) on delete cascade,
  parent_user_id uuid references users(id) on delete set null,
  message_type   text not null check (message_type in ('QUEST_APPROVAL', 'WEEKLY_JOURNAL', 'GENERAL')),
  message        text not null,
  reference_id   uuid,
  read_at        timestamptz,
  reaction       text check (reaction in ('❤️', '😊', '🌟')),
  created_at     timestamptz not null default now(),
  -- Media (photo/audio)
  media_type text check (media_type in ('photo','audio')),
  media_path text,
  media_mime text,
  audio_path text,
  audio_mime text
);

create index if not exists parent_messages_child_idx on parent_messages(child_id, created_at desc);
create index if not exists parent_messages_unread_idx on parent_messages(child_id, read_at) where read_at is null;

alter table parent_messages enable row level security;

create policy parent_messages_family on parent_messages for all
  using (family_id = auth_family_id());


-- ─────────────────────────────────────────────────────────────
-- §13  Evidence system
-- ─────────────────────────────────────────────────────────────

create table if not exists task_evidence (
  id                 uuid primary key default gen_random_uuid(),
  task_completion_id uuid not null references task_completions(id) on delete cascade,
  child_id           uuid not null references children(id) on delete cascade,
  family_id          uuid not null references families(id) on delete cascade,
  evidence_type      text not null check (evidence_type in ('photo','audio','text','choice','parent_observation')),
  storage_path       text,
  file_size          integer,
  mime_type          text,
  text_content       text,
  choice_value       text,
  audio_duration     smallint,
  status             text not null default 'active' check (status in ('active','promoted','deleted','expired')),
  expires_at         timestamptz,
  promoted_at        timestamptz,
  deleted_at         timestamptz,
  promoted_by        uuid references users(id),
  created_at         timestamptz not null default now(),
  -- Memory system
  deletion_reason text
    check (deletion_reason in ('PARENT_DELETED','AUTO_EXPIRED','PROMOTED_TO_MEMORY','SYSTEM_CLEANUP')),
  memory_id uuid
);

create index if not exists task_evidence_completion_idx on task_evidence(task_completion_id);
create index if not exists task_evidence_child_idx on task_evidence(child_id, created_at desc);
create index if not exists task_evidence_expires_idx on task_evidence(expires_at) where status = 'active' and expires_at is not null;
create index if not exists task_evidence_family_promoted_idx on task_evidence(family_id, status) where status = 'promoted';

alter table task_evidence enable row level security;

create policy evidence_family_read on task_evidence for select using (family_id = auth_family_id());
create policy evidence_family_write on task_evidence for all
  using (family_id = auth_family_id()) with check (family_id = auth_family_id());


-- ─────────────────────────────────────────────────────────────
-- §14  Family memories
-- ─────────────────────────────────────────────────────────────

create table if not exists family_memories (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references families(id) on delete cascade,
  child_id           uuid not null references children(id) on delete cascade,
  source_type        text not null default 'evidence' check (source_type in ('evidence','manual')),
  source_id          uuid,
  title              text,
  caption            text,
  media_type         text not null check (media_type in ('photo','audio')),
  media_storage_path text not null,
  mime_type          text,
  file_size_bytes    integer,
  memory_date        date not null default current_date,
  created_by         uuid references users(id),
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create index if not exists family_memories_family_idx on family_memories(family_id, created_at desc);
create index if not exists family_memories_child_idx on family_memories(child_id, created_at desc);

-- FK from task_evidence.memory_id → family_memories
alter table task_evidence
  add constraint task_evidence_memory_fk
  foreign key (memory_id) references family_memories(id) on delete set null;

alter table family_memories enable row level security;

create policy memories_family_read on family_memories for select
  using (family_id = auth_family_id() and deleted_at is null);
create policy memories_family_write on family_memories for all
  using (family_id = auth_family_id()) with check (family_id = auth_family_id());


-- ─────────────────────────────────────────────────────────────
-- §15  Responsibility events
-- ─────────────────────────────────────────────────────────────

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

alter table responsibility_events enable row level security;

create policy resp_events_family_read on responsibility_events
  for select using (family_id = auth_family_id());
create policy resp_events_family_write on responsibility_events
  for all using (family_id = auth_family_id()) with check (family_id = auth_family_id());

create index if not exists resp_events_family_idx
  on responsibility_events(family_id);
create index if not exists resp_events_child_status_idx
  on responsibility_events(child_id, status);
create index if not exists resp_events_task_idx
  on responsibility_events(task_id);
create index if not exists resp_events_child_occurred_idx
  on responsibility_events(child_id, occurred_at desc);
create index if not exists responsibility_events_family_child_time_idx
  on responsibility_events(family_id, child_id, occurred_at desc);


-- ─────────────────────────────────────────────────────────────
-- §16  System Templates sentinel family + seed data
-- ─────────────────────────────────────────────────────────────

insert into families(id, name)
values ('00000000-0000-0000-0000-000000000000', 'System Templates')
on conflict (id) do nothing;

-- ·····························································
-- §16a  Badge templates
-- ·····························································

insert into badges (slug, name_en, name_vi, description_en, description_vi, icon, category, condition_type, condition_value, star_bonus)
values
  ('first_quest', 'First Quest', 'Nhiệm Vụ Đầu Tiên', 'Complete your first task', 'Hoàn thành nhiệm vụ đầu tiên', '🌟', 'milestone', 'tasks_completed', 1, 1),
  ('quest_10', 'Quest Explorer', 'Nhà Thám Hiểm', 'Complete 10 tasks', 'Hoàn thành 10 nhiệm vụ', '🗺️', 'milestone', 'tasks_completed', 10, 2),
  ('quest_25', 'Quest Adventurer', 'Nhà Phiêu Lưu', 'Complete 25 tasks', 'Hoàn thành 25 nhiệm vụ', '⚔️', 'milestone', 'tasks_completed', 25, 3),
  ('quest_50', 'Quest Hero', 'Anh Hùng', 'Complete 50 tasks', 'Hoàn thành 50 nhiệm vụ', '🦸', 'milestone', 'tasks_completed', 50, 5),
  ('quest_100', 'Quest Legend', 'Huyền Thoại', 'Complete 100 tasks', 'Hoàn thành 100 nhiệm vụ', '👑', 'milestone', 'tasks_completed', 100, 10),
  ('coins_50', 'Coin Collector', 'Nhà Sưu Tập Xu', 'Earn 50 coins total', 'Tích lũy 50 xu', '💰', 'milestone', 'coins_earned', 50, 1),
  ('coins_200', 'Coin Hoarder', 'Kho Báu Xu', 'Earn 200 coins total', 'Tích lũy 200 xu', '🏦', 'milestone', 'coins_earned', 200, 3),
  ('coins_500', 'Coin Master', 'Vua Xu', 'Earn 500 coins total', 'Tích lũy 500 xu', '🤑', 'milestone', 'coins_earned', 500, 5),
  ('streak_3', 'On Fire', 'Lửa Bùng', '3-day streak', 'Chuỗi 3 ngày', '🔥', 'streak', 'streak_days', 3, 2),
  ('streak_7', 'Unstoppable', 'Không Thể Cản', '7-day streak', 'Chuỗi 7 ngày', '⚡', 'streak', 'streak_days', 7, 5),
  ('streak_14', 'Legendary Streak', 'Chuỗi Huyền Thoại', '14-day streak', 'Chuỗi 14 ngày', '🏆', 'streak', 'streak_days', 14, 10),
  ('streak_30', 'Monthly Master', 'Bậc Thầy Tháng', '30-day streak', 'Chuỗi 30 ngày', '🌈', 'streak', 'streak_days', 30, 20),
  ('first_reward', 'First Treat', 'Phần Thưởng Đầu', 'Redeem your first reward', 'Đổi phần thưởng đầu tiên', '🎁', 'special', 'rewards_redeemed', 1, 1),
  ('dream_achieved', 'Dream Catcher', 'Người Bắt Giấc Mơ', 'Reach a dream reward', 'Đạt phần thưởng ước mơ', '✨', 'special', 'dream_achieved', 1, 10)
on conflict (slug) do nothing;

-- ·····························································
-- §16b  Reward templates (with Vietnamese)
-- ·····························································

insert into rewards(family_id, name, name_vi, description, description_vi, category, coin_cost, requires_approval, dream_eligible, is_system_template)
values
 ('00000000-0000-0000-0000-000000000000','Sticker','Nhãn Dán','A fun sticker','Một nhãn dán vui','small',30,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Favorite snack','Đồ Ăn Vặt Yêu Thích','Choose a favorite snack','Chọn một món ăn vặt yêu thích','small',60,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Ice cream','Kem','Enjoy an ice cream treat','Một que kem hoặc ly kem','small',100,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Choose tonight''s dessert','Chọn Món Tráng Miệng','Pick what dessert the family has','Chọn món tráng miệng tối nay','small',100,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Choose family movie','Chọn Phim Gia Đình','Pick the family movie','Chọn bộ phim cho cả nhà cùng xem','small',120,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Extra 20 min screen time','Thêm 20 Phút Màn Hình','Extra 20 minutes of screen time','Thêm 20 phút xem màn hình','small',150,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Small stationery item','Đồ Dùng Học Tập Nhỏ','A pen, eraser, or notebook','Một món đồ dùng học tập nhỏ tự chọn','small',150,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Cute notebook','Sổ Tay Dễ Thương','A cute new notebook','Một cuốn sổ tay dễ thương để ghi chép','small',200,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Small toy','Đồ Chơi Nhỏ','A small toy or trinket','Một món đồ chơi nhỏ tự chọn','small',300,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Bubble tea','Trà Sữa Trân Châu','Bubble tea or favorite drink','Một ly trà sữa trân châu','medium',250,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Choose weekend breakfast','Chọn Bữa Sáng Cuối Tuần','Pick what the family eats for breakfast','Chọn thực đơn bữa sáng cuối tuần','medium',300,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Movie theater','Đi Rạp Chiếu Phim','A trip to the movies','Đi xem phim tại rạp','medium',500,true,false,true),
 ('00000000-0000-0000-0000-000000000000','New book','Sách Mới','A new book of your choice','Chọn một cuốn sách mới','medium',500,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Small LEGO set','Bộ LEGO Nhỏ','A small LEGO set','Một bộ LEGO nhỏ','medium',700,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Art supplies','Đồ Vẽ / Mỹ Thuật','Art or craft supplies','Bộ đồ vẽ hoặc đồ mỹ thuật','medium',700,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Eat at favorite restaurant','Đi Ăn Nhà Hàng Yêu Thích','Dinner at a favorite restaurant','Đi ăn tại nhà hàng yêu thích','medium',800,true,false,true),
 ('00000000-0000-0000-0000-000000000000','New T-shirt','Áo Mới','A new T-shirt of your choice','Chọn một chiếc áo mới','medium',1000,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Toy or accessory','Đồ Chơi Hoặc Phụ Kiện','A toy or accessory','Đồ chơi hoặc phụ kiện tự chọn','medium',1000,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Family activity of choice','Hoạt Động Gia Đình Tự Chọn','Choose a family activity','Chọn một hoạt động gia đình vào cuối tuần','medium',1200,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Large LEGO set','Bộ LEGO Lớn','A large LEGO set','Một bộ LEGO lớn','large',2000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Nice headphones','Tai Nghe','A nice pair of headphones','Một chiếc tai nghe mới','large',2500,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Day trip','Chuyến Đi Ngày','Day trip chosen by child','Một chuyến đi chơi trong ngày cùng gia đình','large',2500,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Theme park','Công Viên Giải Trí','Theme park or special activity day','Đi công viên giải trí','large',3000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Smart watch','Đồng Hồ Thông Minh','A smart watch','Một chiếc đồng hồ thông minh','large',5000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Bicycle','Xe Đạp','A new bicycle','Một chiếc xe đạp mới','dream',5000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Apple Watch','Apple Watch','Apple Watch or similar device','Apple Watch hoặc thiết bị tương tự','dream',6000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','iPad','Máy Tính Bảng','An iPad','Máy tính bảng (iPad hoặc tương đương)','dream',8000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Special family resort trip','Chuyến Du Lịch Đặc Biệt','A special family resort trip','Chuyến du lịch đặc biệt cùng gia đình','dream',10000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Singapore Adventure','Khám Phá Singapore','A family trip to Singapore','Chuyến du lịch gia đình đến Singapore','dream',15000,true,true,true)
on conflict do nothing;

-- ·····························································
-- §16c  Quest templates (with corrected coins — 0011 + 0034 merged)
--
-- "Morning Routine Streak" & "Tidy House Challenge" have coin_reward = 0
-- because they track basic responsibilities (philosophy: responsibilities
-- don't earn Quest Coins).
-- ·····························································

insert into family_quests (
  family_id, title, title_vi, description, description_vi,
  target_count, coin_reward, star_reward, is_system_template, status
) values
  ('00000000-0000-0000-0000-000000000000', 'Family Reading Week', 'Tuần Đọc Sách Gia Đình',
   'Everyone reads for 20 minutes every day this week', 'Mọi người đọc sách 20 phút mỗi ngày trong tuần',
   7, 200, 50, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Read 5 Books Together', null,
   'Family reads 5 books — each member picks one', null,
   5, 300, 80, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Tidy House Challenge', 'Dọn Nhà Cuối Tuần',
   'Keep the house tidy for 5 days in a row', 'Cùng nhau dọn dẹp nhà cửa vào cuối tuần',
   5, 0, 40, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Morning Routine Streak', null,
   'Complete the morning routine perfectly for 7 days', null,
   7, 0, 50, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Family Walk Week', null,
   'Go for a family walk every day for a week', null,
   7, 200, 60, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Screen-Free Evening', 'Thử Thách Không Màn Hình',
   'Have 5 screen-free family evenings this month', 'Không dùng màn hình sau 8 giờ tối trong một tuần',
   5, 250, 70, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Math Masters', null,
   'Complete 30 math practice sessions as a family', null,
   30, 400, 100, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'English Conversation Week', null,
   'Speak only English at dinner for 5 days', null,
   5, 300, 80, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Game Night x4', null,
   'Play 4 family board game nights this month', null,
   4, 200, 60, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Cook Together', null,
   'Cook a meal together as a family 3 times', null,
   3, 150, 50, true, 'active')
on conflict do nothing;

-- ·····························································
-- §16d  Pool choice-quest templates
--       (corrected behavior_type, coins, ages — 0012+0032+0034 merged)
--
-- NOTE: Legacy task templates from 0006 are NOT included.
-- They are fully superseded by the 180 curriculum templates
-- in 0027/0028. Only pool templates (child choice quests)
-- and curriculum templates are active for new databases.
-- ·····························································

insert into tasks (
  family_id, name, name_vi, description, description_vi,
  category, coin_reward, star_reward, difficulty, requires_approval,
  in_pool, pool_max_per_day, is_system_template,
  behavior_type, availability_type, skill_domain,
  min_age, recommended_age, max_age
) values
  -- Learning pool
  ('00000000-0000-0000-0000-000000000000',
   'Learn about a country', 'Tìm Hiểu Về Một Đất Nước',
   'Read about a country and share 3 fun facts', 'Đọc về một đất nước và chia sẻ 3 điều thú vị',
   'learning', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 7, 9, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Read for fun', 'Đọc Sách Yêu Thích',
   'Read any book you enjoy for 20 minutes', 'Đọc bất kỳ cuốn sách nào con thích trong 20 phút',
   'learning', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 6, 8, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Learn 5 new words', 'Học 5 Từ Mới Tiếng Anh',
   'Learn 5 new English words and use them in a sentence', 'Học 5 từ tiếng Anh mới và dùng trong câu',
   'learning', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 6, 7, 12),

  ('00000000-0000-0000-0000-000000000000',
   'Mini research project', 'Dự Án Nghiên Cứu Nhỏ',
   'Pick a topic you love and research it for 15 minutes', 'Nghiên cứu một chủ đề và trình bày kết quả',
   'learning', 12, 4, 3, true, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 8, 10, 15),

  ('00000000-0000-0000-0000-000000000000',
   'English speaking practice', 'Luyện Nói Tiếng Anh',
   'Practice speaking English for 10 minutes', 'Luyện nói tiếng Anh ít nhất 5 phút',
   'learning', 8, 2, 2, true, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 7, 8, 14),

  -- Creativity pool
  ('00000000-0000-0000-0000-000000000000',
   'Draw something new', 'Vẽ Sáng Tạo',
   'Draw a picture of anything you imagine', 'Vẽ hoặc tô màu một bức tranh theo ý thích',
   'creativity', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 5, 7, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Music practice', 'Luyện Nhạc',
   'Practice an instrument or sing for 15 minutes', 'Luyện nhạc cụ ít nhất 15 phút',
   'creativity', 6, 1, 2, true, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 6, 8, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Write a short story', 'Viết Truyện Ngắn',
   'Write a story with at least 5 sentences', 'Viết một câu chuyện ngắn sáng tạo',
   'creativity', 8, 2, 2, true, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 7, 9, 15),

  ('00000000-0000-0000-0000-000000000000',
   'Make something with your hands', 'Làm Đồ Thủ Công',
   'Build or craft something creative', 'Tự tay làm một món đồ hoặc sản phẩm sáng tạo',
   'creativity', 6, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 5, 7, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Design a greeting card', 'Thiết Kế Thiệp',
   'Make a card for someone you love', 'Thiết kế và vẽ một tấm thiệp cho người thân',
   'creativity', 5, 2, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 5, 7, 14),

  -- Family/Kindness pool — coins = 0, behavior_type = character
  ('00000000-0000-0000-0000-000000000000',
   'Help someone today', 'Giúp Đỡ Người Khác',
   'Do something helpful without being asked', 'Chủ động giúp đỡ một thành viên trong gia đình',
   'family', 0, 2, 1, true, true, 1, true,
   'character', 'choice_pool', 'CHARACTER_FAMILY', 5, 7, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Write a thank-you note', 'Nói Lời Cảm Ơn',
   'Write a thank-you to someone who helped you', 'Nói lời cảm ơn chân thành với người thân',
   'family', 0, 2, 1, false, true, 1, true,
   'character', 'choice_pool', 'CHARACTER_FAMILY', 6, 8, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Call or chat with grandparents', 'Gọi Ông Bà',
   'Spend 10+ minutes talking with grandparents', 'Gọi điện thăm ông bà hoặc người thân',
   'family', 0, 2, 1, true, true, 1, true,
   'character', 'choice_pool', 'CHARACTER_FAMILY', 6, 8, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Help a sibling', 'Giúp Em / Anh Chị',
   'Help your sister/brother with something useful', 'Giúp đỡ anh chị em trong gia đình',
   'family', 0, 3, 2, true, true, 1, true,
   'character', 'choice_pool', 'CHARACTER_FAMILY', 6, 8, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Do a random act of kindness', 'Làm Điều Tốt Bất Ngờ',
   'Surprise someone with a kind gesture', 'Bất ngờ làm điều tốt cho ai đó',
   'family', 0, 3, 1, true, true, 1, true,
   'character', 'choice_pool', 'CHARACTER_FAMILY', 6, 8, 18),

  -- Responsibility pool — coins = 0, behavior_type = responsibility
  ('00000000-0000-0000-0000-000000000000',
   'Water the plants', 'Chăm Sóc Cây',
   'Water all the plants at home', 'Tưới cây hoặc chăm sóc cây trong nhà',
   'responsibility', 0, 0, 1, false, true, 1, true,
   'responsibility', 'choice_pool', 'LIFE_HOME', 5, 7, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Tidy one space', 'Dọn Đồ Đạc',
   'Pick one area and make it neat and organized', 'Tự cất đồ đạc vào đúng chỗ mà không cần nhắc',
   'responsibility', 0, 0, 1, false, true, 1, true,
   'responsibility', 'choice_pool', 'LIFE_HOME', 5, 7, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Set the table for dinner', 'Bày Bàn Ăn',
   'Set up all plates, cups and chopsticks/forks', 'Bày bàn ăn trước bữa cơm',
   'responsibility', 0, 0, 1, false, true, 1, true,
   'responsibility', 'choice_pool', 'LIFE_HOME', 5, 7, 14),

  -- Habit-building pool — small coins to build habit, then fade
  ('00000000-0000-0000-0000-000000000000',
   'Prepare tomorrow''s school bag', 'Chuẩn Bị Cặp Sách',
   'Pack everything needed for tomorrow', 'Chuẩn bị cặp sách cho ngày hôm sau mà không cần nhắc nhở',
   'responsibility', 4, 1, 1, false, true, 1, true,
   'habit_building', 'choice_pool', 'LIFE_HOME', 6, 8, 12),

  ('00000000-0000-0000-0000-000000000000',
   'Screen time self-control', 'Kiểm Soát Thời Gian Màn Hình',
   'Stop screen time when the agreed time is up', 'Tự tắt máy khi hết giờ mà không cần nhắc',
   'responsibility', 8, 3, 2, true, true, 1, true,
   'habit_building', 'choice_pool', 'SELF_MANAGEMENT', 7, 9, 15),

  -- Health pool
  ('00000000-0000-0000-0000-000000000000',
   'Go for a walk or bike ride', 'Chơi Ngoài Trời',
   'Get outside and move for at least 20 minutes', 'Chơi ngoài trời ít nhất 30 phút',
   'health', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'HEALTH', 6, 8, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Exercise for 20 minutes', 'Tập Thể Dục 20 Phút',
   'Do jumping jacks, stretches, or any exercise', 'Tập thể dục hoặc vận động ít nhất 20 phút',
   'health', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'HEALTH', 5, 8, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Choose a healthy snack', 'Ăn Vặt Lành Mạnh',
   'Pick a healthy snack instead of junk food', 'Chọn một món ăn vặt lành mạnh thay vì đồ ngọt',
   'health', 3, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'HEALTH', 5, 7, 12),

  -- Habit-building pool (health)
  ('00000000-0000-0000-0000-000000000000',
   'Drink enough water today', 'Uống Đủ Nước',
   'Drink at least 6 glasses of water', 'Uống đủ 8 ly nước trong ngày',
   'health', 3, 1, 1, false, true, 1, true,
   'habit_building', 'choice_pool', 'HEALTH', 5, 7, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Outdoor play', 'Chơi Ngoài Trời',
   'Play outside or in the garden for 30 minutes', 'Chơi ngoài trời ít nhất 30 phút',
   'health', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'HEALTH', 5, 7, 14),

  -- Explore / Curiosity pool
  ('00000000-0000-0000-0000-000000000000',
   'Watch a nature documentary', 'Học Điều Thú Vị Về Thế Giới',
   'Watch a nature or science video and share what you learned', 'Tìm hiểu một điều thú vị và kể lại',
   'learning', 5, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 6, 8, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Cook or bake something simple', 'Giúp Nấu Ăn',
   'Help prepare a simple snack or dish', 'Giúp chuẩn bị hoặc nấu một bữa ăn đơn giản',
   'responsibility', 6, 2, 2, true, true, 1, true,
   'challenge', 'choice_pool', 'LIFE_HOME', 7, 9, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Learn a fun fact and share it', 'Học Điều Thú Vị Về Thế Giới',
   'Find one amazing fact and tell the family', 'Tìm hiểu một điều thú vị và kể lại',
   'learning', 4, 1, 1, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 5, 7, 14),

  ('00000000-0000-0000-0000-000000000000',
   'Teach someone something', 'Dạy Em Điều Gì Đó',
   'Teach a parent or sibling something you know well', 'Kiên nhẫn dạy em một kỹ năng hoặc bài học',
   'family', 0, 3, 2, true, true, 1, true,
   'character', 'choice_pool', 'CHARACTER_FAMILY', 8, 10, 18),

  ('00000000-0000-0000-0000-000000000000',
   'Try something new today', 'Thử Điều Mới',
   'Do one activity you''ve never tried before', 'Thử một hoạt động mới mà con chưa từng làm',
   'learning', 6, 2, 2, false, true, 1, true,
   'challenge', 'choice_pool', 'LEARNING', 6, 8, 16)
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────
-- §17  Vietnamese locale updates for cloned family tasks
--      (covers tasks/rewards already cloned to families via ILIKE)
-- ─────────────────────────────────────────────────────────────

-- Task ILIKE updates — safe to run repeatedly, covers both system and clones
update tasks set name_vi = 'Uống Đủ Nước', description_vi = 'Uống đủ 8 ly nước trong ngày'
  where name ilike '%drink%water%' and name_vi is null;
update tasks set name_vi = 'Giúp Nấu Ăn', description_vi = 'Giúp chuẩn bị hoặc nấu một bữa ăn đơn giản'
  where (name ilike '%cook%simple%' or name ilike '%cook or bake%') and name_vi is null;

-- Reward ILIKE updates — covers cloned reward names
update rewards set name_vi = 'Đồ Ăn Vặt Yêu Thích', description_vi = 'Chọn một món ăn vặt yêu thích'
  where name ilike '%favorite snack%' and name_vi is null;
update rewards set name_vi = 'Kem', description_vi = 'Một que kem hoặc ly kem'
  where name ilike '%ice cream%' and name_vi is null;
update rewards set name_vi = 'Chọn Món Tráng Miệng', description_vi = 'Chọn món tráng miệng tối nay'
  where name ilike '%choose%dessert%' and name_vi is null;
update rewards set name_vi = 'Chọn Phim Gia Đình', description_vi = 'Chọn bộ phim cho cả nhà cùng xem'
  where (name ilike '%choose%movie%' or name ilike '%family movie%') and name_vi is null;
update rewards set name_vi = 'Thêm 20 Phút Màn Hình', description_vi = 'Thêm 20 phút xem màn hình'
  where (name ilike '%extra%min%screen%' or name ilike '%screen time%') and name_vi is null;
update rewards set name_vi = 'Trà Sữa Trân Châu', description_vi = 'Một ly trà sữa trân châu'
  where name ilike '%bubble tea%' and name_vi is null;
update rewards set name_vi = 'Sách Mới', description_vi = 'Chọn một cuốn sách mới'
  where name ilike '%new book%' and name_vi is null;
update rewards set name_vi = 'Bộ LEGO Nhỏ', description_vi = 'Một bộ LEGO nhỏ'
  where name ilike '%small lego%' and name_vi is null;
update rewards set name_vi = 'Bộ LEGO Lớn', description_vi = 'Một bộ LEGO lớn'
  where name ilike '%large lego%' and name_vi is null;
update rewards set name_vi = 'Đồ Vẽ / Mỹ Thuật', description_vi = 'Bộ đồ vẽ hoặc đồ mỹ thuật'
  where name ilike '%art supplies%' and name_vi is null;
update rewards set name_vi = 'Đi Rạp Chiếu Phim', description_vi = 'Đi xem phim tại rạp'
  where name ilike '%movie theater%' and name_vi is null;
update rewards set name_vi = 'Đi Ăn Nhà Hàng Yêu Thích', description_vi = 'Đi ăn tại nhà hàng yêu thích'
  where name ilike '%favorite restaurant%' and name_vi is null;
update rewards set name_vi = 'Hoạt Động Gia Đình Tự Chọn', description_vi = 'Chọn một hoạt động gia đình vào cuối tuần'
  where name ilike '%family activity%' and name_vi is null;
update rewards set name_vi = 'Chuyến Đi Ngày', description_vi = 'Một chuyến đi chơi trong ngày cùng gia đình'
  where name ilike '%day trip%' and name_vi is null;
update rewards set name_vi = 'Công Viên Giải Trí', description_vi = 'Đi công viên giải trí'
  where name ilike '%theme park%' and name_vi is null;
update rewards set name_vi = 'Tai Nghe', description_vi = 'Một chiếc tai nghe mới'
  where name ilike '%headphone%' and name_vi is null;
update rewards set name_vi = 'Đồng Hồ Thông Minh', description_vi = 'Một chiếc đồng hồ thông minh'
  where (name ilike '%smart watch%' or name ilike '%apple watch%') and name_vi is null;
update rewards set name_vi = 'Máy Tính Bảng', description_vi = 'Máy tính bảng (iPad hoặc tương đương)'
  where (name ilike '%ipad%' or name ilike '%tablet%') and name_vi is null;
update rewards set name_vi = 'Xe Đạp', description_vi = 'Một chiếc xe đạp mới'
  where name ilike '%bicycle%' and name_vi is null;
update rewards set name_vi = 'Chuyến Du Lịch Đặc Biệt', description_vi = 'Chuyến du lịch đặc biệt cùng gia đình'
  where (name ilike '%resort trip%' or name ilike '%singapore%' or name ilike '%adventure%') and name_vi is null;
update rewards set name_vi = 'Nhãn Dán', description_vi = 'Một bộ nhãn dán vui nhộn'
  where name ilike '%sticker%' and name_vi is null;
update rewards set name_vi = 'Đồ Dùng Học Tập Nhỏ', description_vi = 'Một món đồ dùng học tập nhỏ tự chọn'
  where name ilike '%stationery%' and name_vi is null;
update rewards set name_vi = 'Sổ Tay Dễ Thương', description_vi = 'Một cuốn sổ tay dễ thương để ghi chép'
  where name ilike '%notebook%' and name_vi is null;
update rewards set name_vi = 'Đồ Chơi Nhỏ', description_vi = 'Một món đồ chơi nhỏ tự chọn'
  where (name ilike '%small toy%' or name ilike '%toy or accessory%') and name_vi is null;
update rewards set name_vi = 'Chọn Bữa Sáng Cuối Tuần', description_vi = 'Chọn thực đơn bữa sáng cuối tuần'
  where name ilike '%weekend breakfast%' and name_vi is null;
update rewards set name_vi = 'Áo Mới', description_vi = 'Chọn một chiếc áo mới'
  where (name ilike '%t-shirt%' or name ilike '%new shirt%') and name_vi is null;
update rewards set name_vi = 'Đồ Chơi Hoặc Phụ Kiện', description_vi = 'Đồ chơi hoặc phụ kiện tự chọn'
  where name ilike '%toy or accessory%' and name_vi is null;


-- ─────────────────────────────────────────────────────────────
-- §18  Curriculum seed data (180 templates)
--
-- Run these two files AFTER this script:
--   0027_seed_curriculum.sql        — 90 templates for ages 7-12
--   0028_seed_curriculum_teens.sql  — 90 templates for ages 13-18
--
-- They contain all curriculum columns inline (behavior_type,
-- skill_domain, ages, Vietnamese translations, development goals,
-- parent tips, skill ladders) and use ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────

-- Placeholder: \i 0027_seed_curriculum.sql
-- Placeholder: \i 0028_seed_curriculum_teens.sql


-- ═══════════════════════════════════════════════════════════════
-- END OF CONSOLIDATED SCHEMA
-- ═══════════════════════════════════════════════════════════════
