-- 0009_phase4_family_experience.sql — Phase 4: Family Quests, Weekly Challenges, Reflection
-- Design refs: §12, §32, §33, §52, §53

-- =========================================================
-- Family Quests (design §12, §32)
-- A quest is a shared goal the whole family works on together.
-- =========================================================
create table if not exists family_quests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  target_count int not null default 1,
  current_count int not null default 0,
  coin_reward int not null default 0,
  star_reward int not null default 0,
  status text not null check (status in ('active','completed','cancelled')) default 'active',
  start_date date not null default current_date,
  end_date date,
  completed_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
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

create policy family_quests_family on family_quests for all
  using (family_id = auth_family_id());

create policy family_quest_members_read on family_quest_members for select
  using (exists (
    select 1 from family_quests fq where fq.id = family_quest_members.quest_id and fq.family_id = auth_family_id()
  ));

-- =========================================================
-- Weekly Challenges (design §33)
-- Auto-generated or parent-created challenges for bonus rewards.
-- =========================================================
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

create policy weekly_challenges_family on weekly_challenges for all
  using (family_id = auth_family_id());

create policy weekly_challenge_progress_read on weekly_challenge_progress for select
  using (exists (
    select 1 from weekly_challenges wc where wc.id = weekly_challenge_progress.challenge_id and wc.family_id = auth_family_id()
  ));

-- =========================================================
-- Weekly Reflection (design §53)
-- Parent writes a weekly summary for each child.
-- =========================================================
create table if not exists weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  week_start date not null,
  highlights text,
  improvements text,
  parent_message text,
  tasks_completed int not null default 0,
  coins_earned int not null default 0,
  stars_earned int not null default 0,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (child_id, week_start)
);

alter table weekly_reflections enable row level security;

create policy weekly_reflections_family on weekly_reflections for all
  using (family_id = auth_family_id());
