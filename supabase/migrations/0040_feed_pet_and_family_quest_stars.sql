-- 0040_feed_pet_and_family_quest_stars.sql
--
-- 1. "Feed a Pet" is a daily duty toward the child's own pet, so it is a
--    responsibility (0 coins, 0 stars per completion; it counts toward the
--    weekly responsibility stars) rather than a character quest. Family copies
--    cloned from older templates are already responsibilities.
--
-- 2. Family quests paid 40–100 stars per child, sized for the old 6-level
--    ladder. With 12 levels (level 6 = 600 stars, ~35 stars/week) one family
--    quest would jump a child a whole level. Scale them to a week's worth of
--    effort (5–25 stars). Family copies are updated only while they still hold
--    the old template value.

create table if not exists backup_0040_tasks as
  select * from tasks where name = 'Feed a Pet';
create table if not exists backup_0040_family_quests as
  select * from family_quests;

-- =========================================================
-- 1. Feed a Pet → responsibility
-- =========================================================
update tasks set
  behavior_type = 'responsibility',
  category = 'responsibility',
  coin_reward = 0,
  star_reward = 0
where name = 'Feed a Pet'
  and (is_system_template = true or source_template_key = 'BQ-CHAR-FEED-PET-A08')
  and behavior_type = 'character';

-- =========================================================
-- 2. Family quest stars (per child)
-- =========================================================
update family_quests f set star_reward = v.new_stars
from (values
  ('Read 5 Books Together',     80, 20),
  ('Family Walk Week',          60, 10),
  ('Screen-Free Evening',       70, 10),
  ('Math Masters',             100, 25),
  ('English Conversation Week', 80, 10),
  ('Game Night x4',             60,  5),
  ('Cook Together',             50, 10),
  ('Family Reading Week',       50, 10),
  ('Tidy House Challenge',      40, 10),
  ('Morning Routine Streak',    50, 10)
) as v(title, old_stars, new_stars)
where f.title = v.title
  and (f.is_system_template = true or f.star_reward = v.old_stars);
