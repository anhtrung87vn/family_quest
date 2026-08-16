-- 0005_ledger_functions.sql — Phase 2 transactional ledger operations
-- Design refs: §5 Ledger Rules, §21 Star Transaction Model.
-- All functions are SECURITY DEFINER + family-scope guarded via auth_family_id().

-- =========================================================
-- PIN attempts (rate limiting for child login)
-- =========================================================
create table if not exists child_pin_attempts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  ip text,
  success boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists child_pin_attempts_child_time_idx
  on child_pin_attempts(child_id, attempted_at desc);

alter table child_pin_attempts enable row level security;
-- No client-side policies; only service-role writes/reads.

-- =========================================================
-- award_task(completion_id) — approves a task_completion,
-- flips assignment to 'approved', inserts coin/star ledger rows.
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

  select t.coin_reward, t.star_reward
    into v_coin, v_star
  from tasks t where t.id = v_task_id;

  update task_completions
     set status = 'approved',
         approved_at = now(),
         approved_by = v_actor,
         parent_note = coalesce(p_note, parent_note)
   where id = p_completion_id
     and status = 'submitted';

  update task_assignments set status = 'approved' where id = v_assignment_id;

  if coalesce(v_coin, 0) > 0 then
    insert into coin_transactions(child_id, amount, transaction_type, reference_id, description, created_by)
    values (v_child_id, v_coin, 'TASK_REWARD', p_completion_id, 'Task approved', v_actor);
  end if;

  if coalesce(v_star, 0) > 0 then
    insert into star_transactions(child_id, amount, transaction_type, reference_id, description, created_by)
    values (v_child_id, v_star, 'TASK_STAR_REWARD', p_completion_id, 'Task approved', v_actor);
    update children set lifetime_stars = lifetime_stars + v_star where id = v_child_id;
  end if;
end $$;

-- =========================================================
-- reject_task(completion_id, note)
-- =========================================================
create or replace function reject_task(p_completion_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_child_family uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'reject_task: not authenticated'; end if;

  select tc.assignment_id, c.family_id
    into v_assignment_id, v_child_family
  from task_completions tc
  join task_assignments a on a.id = tc.assignment_id
  join children c on c.id = a.child_id
  where tc.id = p_completion_id
  for update;

  if v_child_family is null or v_child_family <> auth_family_id() then
    raise exception 'reject_task: family scope violation';
  end if;

  update task_completions
     set status = 'rejected', parent_note = p_note, approved_by = v_actor, approved_at = now()
   where id = p_completion_id;

  update task_assignments set status = 'rejected' where id = v_assignment_id;
end $$;

-- =========================================================
-- redeem_reward(redemption_id) — approves reward redemption,
-- inserts negative coin_transactions row; rejects on insufficient balance.
-- =========================================================
create or replace function redeem_reward(p_redemption_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_family_id uuid;
  v_cost int;
  v_balance int;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'redeem_reward: not authenticated'; end if;

  select r.child_id, r.coin_cost, c.family_id
    into v_child_id, v_cost, v_family_id
  from reward_redemptions r
  join children c on c.id = r.child_id
  where r.id = p_redemption_id
  for update;

  if v_family_id is null or v_family_id <> auth_family_id() then
    raise exception 'redeem_reward: family scope violation';
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from coin_transactions where child_id = v_child_id;

  if v_balance < v_cost then
    raise exception 'redeem_reward: insufficient balance (% < %)', v_balance, v_cost;
  end if;

  update reward_redemptions
     set status = 'approved', approved_at = now(), approved_by = v_actor
   where id = p_redemption_id and status = 'requested';

  insert into coin_transactions(child_id, amount, transaction_type, reference_id, description, created_by)
  values (v_child_id, -v_cost, 'REWARD_REDEMPTION', p_redemption_id, 'Reward redeemed', v_actor);
end $$;

-- =========================================================
-- reject_redemption(redemption_id, note)
-- =========================================================
create or replace function reject_redemption(p_redemption_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'reject_redemption: not authenticated'; end if;

  select c.family_id into v_family_id
  from reward_redemptions r
  join children c on c.id = r.child_id
  where r.id = p_redemption_id
  for update;

  if v_family_id is null or v_family_id <> auth_family_id() then
    raise exception 'reject_redemption: family scope violation';
  end if;

  update reward_redemptions
     set status = 'rejected', approved_by = v_actor, approved_at = now()
   where id = p_redemption_id and status = 'requested';
end $$;

-- =========================================================
-- manual_adjust_coins(child_id, amount, reason)
-- Positive or negative; requires reason.
-- =========================================================
create or replace function manual_adjust_coins(p_child_id uuid, p_amount int, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'manual_adjust_coins: not authenticated'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'manual_adjust_coins: reason required';
  end if;
  if p_amount = 0 then
    raise exception 'manual_adjust_coins: amount must be non-zero';
  end if;

  select family_id into v_family_id from children where id = p_child_id;
  if v_family_id is null or v_family_id <> auth_family_id() then
    raise exception 'manual_adjust_coins: family scope violation';
  end if;

  insert into coin_transactions(child_id, amount, transaction_type, description, created_by)
  values (p_child_id, p_amount, 'MANUAL_ADJUSTMENT', p_reason, v_actor);
end $$;

-- =========================================================
-- Submit a task (child mode) — inserts task_completion, flips assignment.
-- Called via server action running as service_role, so we pass p_child_id explicitly
-- and skip the auth.uid() check. Family scope guaranteed by PIN session.
-- =========================================================
create or replace function submit_task(p_assignment_id uuid, p_child_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_status text;
  v_requires_approval boolean;
  v_task_id uuid;
  v_completion_id uuid;
begin
  select a.child_id, a.status, t.requires_approval, t.id
    into v_child_id, v_status, v_requires_approval, v_task_id
  from task_assignments a
  join tasks t on t.id = a.task_id
  where a.id = p_assignment_id
  for update;

  if v_child_id is null then raise exception 'submit_task: assignment not found'; end if;
  if v_child_id <> p_child_id then raise exception 'submit_task: child mismatch'; end if;
  if v_status not in ('todo','rejected') then
    raise exception 'submit_task: invalid state %', v_status;
  end if;

  update task_assignments set status = 'submitted' where id = p_assignment_id;

  insert into task_completions(assignment_id, status)
  values (p_assignment_id, 'submitted')
  returning id into v_completion_id;

  -- If task does not require approval, auto-approve now.
  if v_requires_approval = false then
    perform auto_award_task(v_completion_id);
  end if;

  return v_completion_id;
end $$;

-- Internal auto-award (skips auth.uid check; only called from submit_task).
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
begin
  select tc.assignment_id, a.child_id, a.task_id
    into v_assignment_id, v_child_id, v_task_id
  from task_completions tc
  join task_assignments a on a.id = tc.assignment_id
  where tc.id = p_completion_id;

  select t.coin_reward, t.star_reward into v_coin, v_star from tasks t where t.id = v_task_id;

  update task_completions set status = 'approved', approved_at = now() where id = p_completion_id;
  update task_assignments set status = 'approved' where id = v_assignment_id;

  if coalesce(v_coin, 0) > 0 then
    insert into coin_transactions(child_id, amount, transaction_type, reference_id, description)
    values (v_child_id, v_coin, 'TASK_REWARD', p_completion_id, 'Auto-approved');
  end if;
  if coalesce(v_star, 0) > 0 then
    insert into star_transactions(child_id, amount, transaction_type, reference_id, description)
    values (v_child_id, v_star, 'TASK_STAR_REWARD', p_completion_id, 'Auto-approved');
    update children set lifetime_stars = lifetime_stars + v_star where id = v_child_id;
  end if;
end $$;

-- =========================================================
-- request_redemption(reward_id, child_id) — child requests a reward.
-- Snapshots coin_cost at request time; balance re-checked at approval.
-- =========================================================
create or replace function request_redemption(p_reward_id uuid, p_child_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_reward_family uuid;
  v_active boolean;
  v_cost int;
  v_requires_approval boolean;
  v_stock int;
  v_balance int;
  v_redemption_id uuid;
begin
  select family_id into v_family_id from children where id = p_child_id;
  select family_id, coin_cost, requires_approval, active, stock
    into v_reward_family, v_cost, v_requires_approval, v_active, v_stock
  from rewards where id = p_reward_id for update;

  if v_reward_family is null then raise exception 'request_redemption: reward not found'; end if;
  if v_reward_family <> v_family_id then raise exception 'request_redemption: family mismatch'; end if;
  if v_active is not true then raise exception 'request_redemption: reward inactive'; end if;
  if v_stock is not null and v_stock <= 0 then raise exception 'request_redemption: out of stock'; end if;

  select coalesce(sum(amount), 0) into v_balance
  from coin_transactions where child_id = p_child_id;
  if v_balance < v_cost then
    raise exception 'request_redemption: insufficient balance';
  end if;

  insert into reward_redemptions(reward_id, child_id, coin_cost, status)
  values (p_reward_id, p_child_id, v_cost, case when v_requires_approval then 'requested' else 'approved' end)
  returning id into v_redemption_id;

  if v_stock is not null then
    update rewards set stock = stock - 1 where id = p_reward_id;
  end if;

  if v_requires_approval = false then
    insert into coin_transactions(child_id, amount, transaction_type, reference_id, description)
    values (p_child_id, -v_cost, 'REWARD_REDEMPTION', v_redemption_id, 'Auto-approved redemption');
    update reward_redemptions set approved_at = now() where id = v_redemption_id;
  end if;

  return v_redemption_id;
end $$;

-- Grants: authenticated (parents) can call parent-facing functions.
-- Child-facing functions (submit_task, request_redemption) are only called via service-role.
grant execute on function award_task(uuid, text) to authenticated;
grant execute on function reject_task(uuid, text) to authenticated;
grant execute on function redeem_reward(uuid) to authenticated;
grant execute on function reject_redemption(uuid, text) to authenticated;
grant execute on function manual_adjust_coins(uuid, int, text) to authenticated;
