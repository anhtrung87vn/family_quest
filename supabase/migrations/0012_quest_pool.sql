-- 0012_quest_pool.sql — Quest Pool (Choice Quest) system.
-- Design: hybrid model where parents assign Core Quests + children self-select
-- from a curated Choice Quest pool.
--
-- Approach:
--   • tasks table gets `in_pool` + `pool_max_per_day` + `pool_max_per_week`
--   • children get per-child pool config (max claims/day)
--   • pool_claims tracks claims with date so limits can be enforced
--   • Claiming creates a task_assignment (same flow as core quests)
--   • pool_refresh_used tracks today's 1 refresh/day per child

-- =========================================================
-- 1. Extend tasks table
-- =========================================================
alter table tasks
  add column if not exists in_pool          boolean not null default false,
  add column if not exists pool_max_per_day integer,
  add column if not exists pool_max_per_week integer;

-- index for pool queries (family pool, active, in_pool)
create index if not exists tasks_pool_idx on tasks(family_id, in_pool, active)
  where in_pool = true;

-- =========================================================
-- 2. Per-child pool configuration
-- =========================================================
create table if not exists child_pool_config (
  child_id          uuid primary key references children(id) on delete cascade,
  max_claims_per_day integer not null default 1,
  pool_size          integer not null default 4,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table child_pool_config enable row level security;

create policy child_pool_config_family on child_pool_config for all
  using (exists (
    select 1 from children c
    where c.id = child_pool_config.child_id
      and c.family_id = auth_family_id()
  ));

-- =========================================================
-- 3. Pool claims — one row per child per assignment claimed from pool
-- =========================================================
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
  using (exists (
    select 1 from children c
    where c.id = pool_claims.child_id
      and c.family_id = auth_family_id()
  ));

-- =========================================================
-- 4. Pool refresh tracker — 1 refresh/day per child
-- =========================================================
create table if not exists pool_refresh_log (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children(id) on delete cascade,
  refresh_date date not null default current_date,
  created_at   timestamptz not null default now(),
  unique (child_id, refresh_date)
);

alter table pool_refresh_log enable row level security;

create policy pool_refresh_log_family on pool_refresh_log for all
  using (exists (
    select 1 from children c
    where c.id = pool_refresh_log.child_id
      and c.family_id = auth_family_id()
  ));

-- =========================================================
-- 5. Pool recommendation seed (30 choice-quest templates)
--    Stored under the nil-UUID family (system templates).
--    `in_pool = true` marks them as pool templates.
--    `requires_approval` follows the design defaults above.
-- =========================================================
insert into tasks (
  family_id, name, description, category, coin_reward, star_reward,
  difficulty, requires_approval, in_pool, pool_max_per_day, is_system_template
)
values
  -- 📚 Learning
  ('00000000-0000-0000-0000-000000000000',
   'Learn about a country', 'Read about a country and share 3 fun facts',
   'learning', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Read for fun', 'Read any book you enjoy for 20 minutes',
   'learning', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Learn 5 new words', 'Learn 5 new English words and use them in a sentence',
   'learning', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Mini research project', 'Pick a topic you love and research it for 15 minutes',
   'learning', 12, 4, 3, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'English speaking practice', 'Practice speaking English for 10 minutes',
   'learning', 8, 2, 2, true, true, 1, true),

  -- 🎨 Creativity
  ('00000000-0000-0000-0000-000000000000',
   'Draw something new', 'Draw a picture of anything you imagine',
   'creativity', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Music practice', 'Practice an instrument or sing for 15 minutes',
   'creativity', 6, 1, 2, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Write a short story', 'Write a story with at least 5 sentences',
   'creativity', 8, 2, 2, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Make something with your hands', 'Build or craft something creative',
   'creativity', 6, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Design a greeting card', 'Make a card for someone you love',
   'creativity', 5, 2, 1, false, true, 1, true),

  -- ❤️ Kindness / Family
  ('00000000-0000-0000-0000-000000000000',
   'Help someone today', 'Do something helpful without being asked',
   'family', 5, 2, 1, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Write a thank-you note', 'Write a thank-you to someone who helped you',
   'family', 5, 2, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Call or chat with grandparents', 'Spend 10+ minutes talking with grandparents',
   'family', 5, 2, 1, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Help a sibling', 'Help your sister/brother with something useful',
   'family', 5, 3, 2, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Do a random act of kindness', 'Surprise someone with a kind gesture',
   'family', 6, 3, 1, true, true, 1, true),

  -- 🌱 Responsibility
  ('00000000-0000-0000-0000-000000000000',
   'Water the plants', 'Water all the plants at home',
   'responsibility', 3, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Tidy one space', 'Pick one area and make it neat and organized',
   'responsibility', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Set the table for dinner', 'Set up all plates, cups and chopsticks/forks',
   'responsibility', 4, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Prepare tomorrow''s school bag', 'Pack everything needed for tomorrow',
   'responsibility', 4, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Screen time self-control', 'Stop screen time when the agreed time is up',
   'responsibility', 8, 3, 2, true, true, 1, true),

  -- 🏃 Health / Activity
  ('00000000-0000-0000-0000-000000000000',
   'Go for a walk or bike ride', 'Get outside and move for at least 20 minutes',
   'health', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Exercise for 20 minutes', 'Do jumping jacks, stretches, or any exercise',
   'health', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Choose a healthy snack', 'Pick a healthy snack instead of junk food',
   'health', 3, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Drink enough water today', 'Drink at least 6 glasses of water',
   'health', 3, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Outdoor play', 'Play outside or in the garden for 30 minutes',
   'health', 5, 1, 1, false, true, 1, true),

  -- 🧭 Explore / Curiosity
  ('00000000-0000-0000-0000-000000000000',
   'Watch a nature documentary', 'Watch a nature or science video and share what you learned',
   'learning', 5, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Cook or bake something simple', 'Help prepare a simple snack or dish',
   'responsibility', 6, 2, 2, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Learn a fun fact and share it', 'Find one amazing fact and tell the family',
   'learning', 4, 1, 1, false, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Teach someone something', 'Teach a parent or sibling something you know well',
   'family', 8, 3, 2, true, true, 1, true),
  ('00000000-0000-0000-0000-000000000000',
   'Try something new today', 'Do one activity you''ve never tried before',
   'learning', 6, 2, 2, false, true, 1, true)
on conflict do nothing;
