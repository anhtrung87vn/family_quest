-- 0015_habit_system.sql — Motivation-Safe Task System (BloomQuest Habit Plan)
--
-- Adds behavior_type, availability_type, assignment_source,
-- child_task_reward_progress, and updated ledger functions that
-- respect habit-fading reward stages.
--
-- Backward compatibility: existing tasks default to
--   behavior_type = 'challenge', availability_type = 'assigned_only'
-- so current behavior is preserved.

-- =========================================================
-- 1. Extend tasks table with behavior + availability types
-- =========================================================
alter table tasks
  add column if not exists behavior_type text not null
    default 'challenge'
    check (behavior_type in (
      'responsibility', 'habit_building', 'challenge', 'character', 'family'
    ));

alter table tasks
  add column if not exists availability_type text not null
    default 'assigned_only'
    check (availability_type in ('assigned_only', 'choice_pool', 'both'));

-- Migrate existing in_pool = true tasks to availability_type
update tasks
  set availability_type = 'choice_pool'
  where in_pool = true
    and availability_type = 'assigned_only';

-- Index for behavior-based queries
create index if not exists tasks_behavior_type_idx on tasks(family_id, behavior_type)
  where active = true;

-- =========================================================
-- 2. Extend task_assignments with assignment_source
-- =========================================================
alter table task_assignments
  add column if not exists assignment_source text not null
    default 'parent'
    check (assignment_source in ('parent', 'choice_pool', 'family', 'system'));

-- Backfill: mark existing pool_claims assignments as choice_pool
update task_assignments
  set assignment_source = 'choice_pool'
  where id in (select assignment_id from pool_claims);

-- Backfill: mark recurring (cron-generated) as system
update task_assignments
  set assignment_source = 'system'
  where id in (
    select ta.id from task_assignments ta
    join tasks t on t.id = ta.task_id
    where t.is_recurring = true
  )
  and assignment_source = 'parent';

-- =========================================================
-- 3. child_task_reward_progress — per-child habit fading
-- =========================================================
create table if not exists child_task_reward_progress (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references children(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  reward_stage    text not null default 'full_reward'
    check (reward_stage in ('full_reward', 'reduced_reward', 'stars_only', 'graduated')),
  completions     int not null default 0,
  started_at      timestamptz not null default now(),
  stage_changed_at timestamptz not null default now(),
  graduated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (child_id, task_id)
);

create index if not exists child_task_reward_progress_child_idx
  on child_task_reward_progress(child_id);

alter table child_task_reward_progress enable row level security;

create policy child_task_reward_progress_family on child_task_reward_progress for all
  using (exists (
    select 1 from children c
    where c.id = child_task_reward_progress.child_id
      and c.family_id = auth_family_id()
  ));

-- =========================================================
-- 4. Helper: compute effective rewards based on stage
-- =========================================================
create or replace function effective_rewards(
  p_coin int, p_star int, p_stage text
)
returns table(eff_coin int, eff_star int)
language sql immutable as $$
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

-- =========================================================
-- 5. Updated award_task — respects reward stage
-- =========================================================
create or replace function award_task(p_completion_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_assignment_id uuid;
  v_child_id uuid;
  v_task_id uuid;
  v_coin int;
  v_star int;
  v_behavior text;
  v_stage text;
  v_eff_coin int;
  v_eff_star int;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'award_task: not authenticated';
  end if;

  select tc.assignment_id, a.child_id, a.task_id
    into v_assignment_id, v_child_id, v_task_id
  from task_completions tc
  join task_assignments a on a.id = tc.assignment_id
  where tc.id = p_completion_id
  for update;

  if v_assignment_id is null then
    raise exception 'award_task: completion % not found', p_completion_id;
  end if;

  select c.family_id into v_family_id from children c where c.id = v_child_id;
  if v_family_id is null or v_family_id <> auth_family_id() then
    raise exception 'award_task: family scope violation';
  end if;

  select t.coin_reward, t.star_reward, t.behavior_type
    into v_coin, v_star, v_behavior
  from tasks t where t.id = v_task_id;

  -- Check reward stage for habit_building tasks
  v_stage := 'full_reward';
  if v_behavior = 'habit_building' then
    select p.reward_stage into v_stage
    from child_task_reward_progress p
    where p.child_id = v_child_id and p.task_id = v_task_id;
    v_stage := coalesce(v_stage, 'full_reward');
  elsif v_behavior = 'responsibility' then
    -- Responsibilities default to graduated (no rewards)
    v_stage := coalesce(
      (select p.reward_stage from child_task_reward_progress p
       where p.child_id = v_child_id and p.task_id = v_task_id),
      'graduated'
    );
  end if;

  -- Compute effective rewards
  select er.eff_coin, er.eff_star
    into v_eff_coin, v_eff_star
  from effective_rewards(v_coin, v_star, v_stage) er;

  update task_completions
     set status = 'approved',
         approved_at = now(),
         approved_by = v_actor,
         parent_note = coalesce(p_note, parent_note)
   where id = p_completion_id
     and status = 'submitted';

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

  -- Increment completion counter for habit tracking
  insert into child_task_reward_progress (child_id, task_id, completions)
  values (v_child_id, v_task_id, 1)
  on conflict (child_id, task_id)
  do update set completions = child_task_reward_progress.completions + 1,
               updated_at = now();
end $$;

-- =========================================================
-- 6. Updated auto_award_task — respects reward stage
-- =========================================================
create or replace function auto_award_task(p_completion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_child_id uuid;
  v_task_id uuid;
  v_coin int;
  v_star int;
  v_behavior text;
  v_stage text;
  v_eff_coin int;
  v_eff_star int;
begin
  select tc.assignment_id, a.child_id, a.task_id
    into v_assignment_id, v_child_id, v_task_id
  from task_completions tc
  join task_assignments a on a.id = tc.assignment_id
  where tc.id = p_completion_id;

  select t.coin_reward, t.star_reward, t.behavior_type
    into v_coin, v_star, v_behavior
  from tasks t where t.id = v_task_id;

  -- Check reward stage for habit_building tasks
  v_stage := 'full_reward';
  if v_behavior = 'habit_building' then
    select p.reward_stage into v_stage
    from child_task_reward_progress p
    where p.child_id = v_child_id and p.task_id = v_task_id;
    v_stage := coalesce(v_stage, 'full_reward');
  elsif v_behavior = 'responsibility' then
    v_stage := coalesce(
      (select p.reward_stage from child_task_reward_progress p
       where p.child_id = v_child_id and p.task_id = v_task_id),
      'graduated'
    );
  end if;

  -- Compute effective rewards
  select er.eff_coin, er.eff_star
    into v_eff_coin, v_eff_star
  from effective_rewards(v_coin, v_star, v_stage) er;

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

  -- Increment completion counter for habit tracking
  insert into child_task_reward_progress (child_id, task_id, completions)
  values (v_child_id, v_task_id, 1)
  on conflict (child_id, task_id)
  do update set completions = child_task_reward_progress.completions + 1,
               updated_at = now();
end $$;

-- =========================================================
-- 7. Update system templates with behavior_type + availability_type
--    Aligned with Habit.md philosophy.
--    Only update system templates (family_id = nil UUID).
--    Do NOT touch family-created tasks.
-- =========================================================

-- 🌱 Responsibility templates — assigned_only, no rewards
update tasks set behavior_type = 'responsibility', availability_type = 'assigned_only'
  where is_system_template = true
    and name in (
      'Make My Bed', 'Put Away Belongings', 'Clear My Plate',
      'Put Dirty Clothes Away', 'Brush Teeth', 'Take Care of Plants'
    );

-- 🌿 Habit building templates — both (assigned + can be in pool)
update tasks set behavior_type = 'habit_building', availability_type = 'both'
  where is_system_template = true
    and name in (
      'Prepare School Bag', 'Keep Desk Organized', 'Finish Homework',
      'Fold My Clothes', 'Clean My Room', 'Screen Time Self-Control',
      'Sleep on Time'
    );

-- 🎯 Challenge templates — most in choice_pool or both
update tasks set behavior_type = 'challenge', availability_type = 'both'
  where is_system_template = true
    and name in (
      'Read 20 Minutes', 'Read 30 Minutes', 'English Reading',
      'Learn 5 New English Words', 'Learn 10 New English Words',
      'English Speaking Practice', 'Math Practice',
      'Beautiful Handwriting', 'Tell Me What You Learned',
      'Review Today''s Lessons', 'Music Practice',
      'Exercise 20 Minutes', 'Outdoor Play', 'Bike Ride',
      'Swimming Practice', 'Healthy Snack Choice',
      'Plan My Week', 'Prepare for Tomorrow'
    );

-- 🎯 Big challenges — choice_pool only
update tasks set behavior_type = 'challenge', availability_type = 'choice_pool'
  where is_system_template = true
    and name in (
      'Finish One Book', 'Mini Research Project',
      'Draw Something Creative', 'Learn About a Country'
    );

-- ❤️ Character / family templates
update tasks set behavior_type = 'character', availability_type = 'both'
  where is_system_template = true
    and category = 'family';

-- =========================================================
-- 8. Re-grant permissions
-- =========================================================
grant execute on function award_task(uuid, text) to authenticated;
