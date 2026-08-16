-- 0010_phase6_post_launch.sql — Phase 6: Adventure map, collections, themes, photo proof, vacation
-- Design refs: §44 (adventure map), §48 (collections), §43.3 (monthly themes), §51 (treasure box)

-- =========================================================
-- Collections (design §48)
-- =========================================================
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

-- =========================================================
-- Adventure Map (design §44)
-- Nodes represent milestones on a visual progression path.
-- =========================================================
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

-- =========================================================
-- Monthly Themes (design §43.3)
-- =========================================================
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

-- =========================================================
-- Photo Proof (for task completion evidence)
-- =========================================================
alter table task_completions add column if not exists photo_url text;

-- =========================================================
-- Vacation Mode (per child, pauses streaks)
-- =========================================================
alter table children add column if not exists vacation_mode boolean not null default false;
alter table children add column if not exists vacation_start date;
alter table children add column if not exists vacation_end date;

-- =========================================================
-- Weekly Treasure Box (design §51)
-- Random non-paid reward for weekly consistency
-- =========================================================
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
