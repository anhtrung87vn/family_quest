-- 0002_rls.sql — Row-Level Security
-- Rule: parents can read/write only rows in their family.
-- Child mode writes go through service-role in server actions (PIN-gated), so no direct child policies.

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

-- families: parent can read own family; insert during onboarding is done via service-role.
drop policy if exists families_select on families;
create policy families_select on families for select
  using (id = auth_family_id());

-- users: parent sees own row only.
drop policy if exists users_select on users;
create policy users_select on users for select using (id = auth.uid());
drop policy if exists users_update on users;
create policy users_update on users for update using (id = auth.uid());

-- user_preferences: owner only.
drop policy if exists user_prefs_all on user_preferences;
create policy user_prefs_all on user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Family-scoped tables (parents in the family)
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'children','tasks','task_assignments','task_completions',
    'rewards','reward_redemptions','coin_transactions','star_transactions'
  ]) loop
    execute format('drop policy if exists %I_family_read on %I', t, t);
    execute format('drop policy if exists %I_family_write on %I', t, t);
  end loop;
end $$;

-- children/tasks/rewards use family_id directly
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

-- Assignments / completions / redemptions / ledgers derive family via child_id -> children.family_id
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

-- Ledgers: read-only for parents; inserts happen via service-role (SECURITY DEFINER functions in Phase 2).
create policy coin_transactions_family_read on coin_transactions for select
  using (exists (select 1 from children c where c.id = coin_transactions.child_id and c.family_id = auth_family_id()));

create policy star_transactions_family_read on star_transactions for select
  using (exists (select 1 from children c where c.id = star_transactions.child_id and c.family_id = auth_family_id()));
