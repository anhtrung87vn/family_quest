-- 0011_quest_templates.sql — Add is_system_template to family_quests + seed starter templates.
-- Quest templates live under the nil-UUID family (same pattern as tasks/rewards).
-- Parents clone them into their own family via the "Add from templates" button.

alter table family_quests
  add column if not exists is_system_template boolean not null default false;

-- Allow anyone (any authenticated parent) to read system templates
drop policy if exists family_quests_system_read on family_quests;
create policy family_quests_system_read on family_quests for select
  using (is_system_template = true);

-- Seed starter quest templates under nil-UUID family
insert into family_quests (family_id, title, description, target_count, coin_reward, star_reward, is_system_template, status)
values
  -- Reading quests
  ('00000000-0000-0000-0000-000000000000', 'Family Reading Week', 'Everyone reads for 20 minutes every day this week', 7, 200, 50, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Read 5 Books Together', 'Family reads 5 books — each member picks one', 5, 300, 80, true, 'active'),
  -- Chores & responsibility
  ('00000000-0000-0000-0000-000000000000', 'Tidy House Challenge', 'Keep the house tidy for 5 days in a row', 5, 150, 40, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Morning Routine Streak', 'Complete the morning routine perfectly for 7 days', 7, 200, 50, true, 'active'),
  -- Health & activity
  ('00000000-0000-0000-0000-000000000000', 'Family Walk Week', 'Go for a family walk every day for a week', 7, 200, 60, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Screen-Free Evening', 'Have 5 screen-free family evenings this month', 5, 250, 70, true, 'active'),
  -- Learning
  ('00000000-0000-0000-0000-000000000000', 'Math Masters', 'Complete 30 math practice sessions as a family', 30, 400, 100, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'English Conversation Week', 'Speak only English at dinner for 5 days', 5, 300, 80, true, 'active'),
  -- Fun & bonding
  ('00000000-0000-0000-0000-000000000000', 'Game Night x4', 'Play 4 family board game nights this month', 4, 200, 60, true, 'active'),
  ('00000000-0000-0000-0000-000000000000', 'Cook Together', 'Cook a meal together as a family 3 times', 3, 150, 50, true, 'active')
on conflict do nothing;
