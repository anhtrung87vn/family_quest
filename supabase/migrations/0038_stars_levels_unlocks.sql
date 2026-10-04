-- 0038_stars_levels_unlocks.sql — Make Stars meaningful for years.
--
-- Stars stay a non-spendable growth measure. This migration adds:
--  1. rewards.min_level — a reward is still paid in coins but stays locked
--     until the child reaches the level (levels come from lifetime_stars,
--     thresholds in lib/levels.ts).
--  2. child_level_ups — one row per level a child reaches; each level comes
--     with a privilege gift that a parent marks as given.
--  3. RESPONSIBILITY_WEEK star transactions — 1–2 stars for doing last week's
--     responsibilities consistently, so independent older children keep
--     earning stars after habits graduate.

-- =========================================================
-- 0. Backup
-- =========================================================
create table if not exists backup_0038_rewards as select * from rewards;

-- =========================================================
-- 1. Level-gated rewards
-- =========================================================
alter table rewards
  add column if not exists min_level integer check (min_level between 1 and 12);

update rewards r set min_level = v.lvl
from (values
  ('Friend sleepover', 4),
  ('Nice headphones', 4),
  ('Day trip', 5),
  ('Concert or event ticket', 5),
  ('Large LEGO set', 5),
  ('Bicycle', 5),
  ('Smart watch', 5),
  ('Bluetooth speaker', 5),
  ('New sneakers', 5),
  ('Special family resort trip', 6),
  ('Apple Watch', 7),
  ('iPad', 7),
  ('Singapore Adventure', 8)
) as v(name, lvl)
where r.name = v.name and r.min_level is null;

-- =========================================================
-- 2. Level-ups and their gifts
-- =========================================================
create table if not exists child_level_ups (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  level integer not null check (level between 2 and 12),
  reached_at timestamptz not null default now(),
  gifted_at timestamptz,
  gifted_by uuid references users(id),
  unique (child_id, level)
);
create index if not exists child_level_ups_pending_idx
  on child_level_ups (child_id) where gifted_at is null;

alter table child_level_ups enable row level security;
drop policy if exists child_level_ups_family on child_level_ups;
create policy child_level_ups_family on child_level_ups for all
  using (exists (
    select 1 from children c
    where c.id = child_level_ups.child_id
      and c.family_id = auth_family_id()
  ));

-- Levels already reached before this feature count as celebrated, so existing
-- children don't receive a pile of gifts at once. Thresholds mirror
-- lib/levels.ts at the time of this migration.
insert into child_level_ups (child_id, level, reached_at, gifted_at)
select c.id, v.level, now(), now()
from children c
join (values
  (2, 25), (3, 100), (4, 200), (5, 350), (6, 600), (7, 900),
  (8, 1300), (9, 1800), (10, 2700), (11, 3800), (12, 5200)
) as v(level, min_stars) on c.lifetime_stars >= v.min_stars
on conflict (child_id, level) do nothing;

-- =========================================================
-- 3. Weekly responsibility stars
-- =========================================================
alter table star_transactions drop constraint if exists star_transactions_transaction_type_check;
alter table star_transactions add constraint star_transactions_transaction_type_check
  check (transaction_type in (
    'TASK_STAR_REWARD','BADGE_BONUS','STREAK_BONUS','WEEKLY_CHALLENGE',
    'FAMILY_QUEST','MANUAL_ADJUSTMENT','CORRECTION','RESPONSIBILITY_WEEK'
  ));

-- One award per child per week (description carries the week's Monday).
create unique index if not exists star_transactions_responsibility_week_uniq
  on star_transactions (child_id, description)
  where transaction_type = 'RESPONSIBILITY_WEEK';
