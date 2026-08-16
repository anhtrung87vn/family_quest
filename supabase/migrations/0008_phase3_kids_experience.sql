-- 0008_phase3_kids_experience.sql — Phase 3: badges, streaks, levels
-- Design refs: §4.4 (levels), §5/§29 (dream reward), §46 (streaks + grace day)

-- =========================================================
-- Badges (design §4.4, §27 Phase 3)
-- =========================================================
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

-- Badges are readable by everyone (system data)
create policy badges_read on badges for select using (true);

-- child_badges: service-role writes; parents can read family-scoped
create policy child_badges_read on child_badges for select
  using (exists (select 1 from children c where c.id = child_badges.child_id and c.family_id = auth_family_id()));

-- =========================================================
-- Streaks (design §46 — grace-day logic)
-- =========================================================
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

-- =========================================================
-- Seed badges
-- =========================================================
insert into badges (slug, name_en, name_vi, description_en, description_vi, icon, category, condition_type, condition_value, star_bonus)
values
  -- Milestone badges (task count)
  ('first_quest', 'First Quest', 'Nhiệm Vụ Đầu Tiên', 'Complete your first task', 'Hoàn thành nhiệm vụ đầu tiên', '🌟', 'milestone', 'tasks_completed', 1, 1),
  ('quest_10', 'Quest Explorer', 'Nhà Thám Hiểm', 'Complete 10 tasks', 'Hoàn thành 10 nhiệm vụ', '🗺️', 'milestone', 'tasks_completed', 10, 2),
  ('quest_25', 'Quest Adventurer', 'Nhà Phiêu Lưu', 'Complete 25 tasks', 'Hoàn thành 25 nhiệm vụ', '⚔️', 'milestone', 'tasks_completed', 25, 3),
  ('quest_50', 'Quest Hero', 'Anh Hùng', 'Complete 50 tasks', 'Hoàn thành 50 nhiệm vụ', '🦸', 'milestone', 'tasks_completed', 50, 5),
  ('quest_100', 'Quest Legend', 'Huyền Thoại', 'Complete 100 tasks', 'Hoàn thành 100 nhiệm vụ', '👑', 'milestone', 'tasks_completed', 100, 10),
  -- Coin milestones
  ('coins_50', 'Coin Collector', 'Nhà Sưu Tập Xu', 'Earn 50 coins total', 'Tích lũy 50 xu', '💰', 'milestone', 'coins_earned', 50, 1),
  ('coins_200', 'Coin Hoarder', 'Kho Báu Xu', 'Earn 200 coins total', 'Tích lũy 200 xu', '🏦', 'milestone', 'coins_earned', 200, 3),
  ('coins_500', 'Coin Master', 'Vua Xu', 'Earn 500 coins total', 'Tích lũy 500 xu', '🤑', 'milestone', 'coins_earned', 500, 5),
  -- Streak badges
  ('streak_3', 'On Fire', 'Lửa Bùng', '3-day streak', 'Chuỗi 3 ngày', '🔥', 'streak', 'streak_days', 3, 2),
  ('streak_7', 'Unstoppable', 'Không Thể Cản', '7-day streak', 'Chuỗi 7 ngày', '⚡', 'streak', 'streak_days', 7, 5),
  ('streak_14', 'Legendary Streak', 'Chuỗi Huyền Thoại', '14-day streak', 'Chuỗi 14 ngày', '🏆', 'streak', 'streak_days', 14, 10),
  ('streak_30', 'Monthly Master', 'Bậc Thầy Tháng', '30-day streak', 'Chuỗi 30 ngày', '🌈', 'streak', 'streak_days', 30, 20),
  -- Special badges
  ('first_reward', 'First Treat', 'Phần Thưởng Đầu', 'Redeem your first reward', 'Đổi phần thưởng đầu tiên', '🎁', 'special', 'rewards_redeemed', 1, 1),
  ('dream_achieved', 'Dream Catcher', 'Người Bắt Giấc Mơ', 'Reach a dream reward', 'Đạt phần thưởng ước mơ', '✨', 'special', 'dream_achieved', 1, 10)
on conflict (slug) do nothing;
