-- 0037_ticket_prices_and_unpaid_kindness.sql
--
-- 1. Cinemas and theme parks in Vietnam price "child" tickets by height
--    (~1.3–1.4m), which children reach around age 11. Split the two rewards:
--    the original row keeps the child price for ages 6–10, and an "(11+)"
--    variant carries the adult ticket price for ages 11–17.
--      Movie theater      : child ticket ~65k  + popcorn share ~50k = 115 coins
--      Movie theater (11+): adult ticket ~100k + popcorn share ~50k = 150 coins
--      Theme park         : child ticket ~220k + food share ~60k    = 280 coins
--      Theme park (11+)   : adult ticket ~300k + food share ~60k    = 360 coins
--    Families that already have the base reward also get the 11+ variant.
--
-- 2. Family copies cloned before 0034 still pay coins for kindness and
--    household routines that 0034 set to 0 on the templates. Zero them, but
--    only where the copy still holds the original seeded value.
--    Family quest completion now really pays coins (see lib/ledger.ts), so
--    this keeps "don't pay for kindness" true for those quests.

create table if not exists backup_0037_rewards as
  select * from rewards where name in ('Movie theater', 'Theme park');
create table if not exists backup_0037_tasks as
  select * from tasks where is_system_template = false and source_template_key in (
    'BQ-CHAR-INTERVIEW-GRANDPARENTS-A09', 'BQ-CHAR-GAME-NIGHT-A10', 'BQ-CHAR-CREATE-USEFUL-A12',
    'BQ-CHAR-ORGANIZE-ACTIVITY-A14', 'BQ-CHAR-LEAD-ACTIVITY-A17', 'BQ-CHAR-LEARN-FROM-PARENT-A18');
create table if not exists backup_0037_family_quests as
  select * from family_quests where title in ('Tidy House Challenge', 'Morning Routine Streak');

-- =========================================================
-- 1a. Templates: child-price rows now cover ages 6–10
-- =========================================================
update rewards set
  coin_cost = 115, reference_price_vnd = 115000,
  min_age = 6, recommended_age = 8, max_age = 10,
  description = 'Cinema trip (child ticket + popcorn)',
  description_vi = 'Đi xem phim ở rạp (vé trẻ em + bắp nước)'
where is_system_template = true and name = 'Movie theater';

update rewards set
  coin_cost = 280, reference_price_vnd = 280000,
  min_age = 6, recommended_age = 8, max_age = 10,
  description = 'Theme park day (child ticket + share of food)',
  description_vi = 'Một ngày ở công viên giải trí (vé trẻ em + phần ăn uống)'
where is_system_template = true and name = 'Theme park';

-- =========================================================
-- 1b. Templates: adult-ticket variants for ages 11–17
-- =========================================================
insert into rewards (
  family_id, template_key, name, name_vi, description, description_vi, category,
  reference_price_vnd, coin_cost, min_age, recommended_age, max_age, dream_eligible,
  requires_approval, is_system_template, active
) values
  ('00000000-0000-0000-0000-000000000000', 'BQ-RWD-MOVIE-THEATER-11', 'Movie theater (11+)', 'Đi Rạp Chiếu Phim (11+)',
   'Cinema trip (adult ticket + popcorn)', 'Đi xem phim ở rạp (vé người lớn + bắp nước)', 'experience',
   150000, 150, 11, 13, 17, false, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'BQ-RWD-THEME-PARK-11', 'Theme park (11+)', 'Công Viên Giải Trí (11+)',
   'Theme park day (adult ticket + share of food)', 'Một ngày ở công viên giải trí (vé người lớn + phần ăn uống)', 'experience',
   360000, 360, 11, 13, 17, false, true, true, true)
on conflict do nothing;

-- =========================================================
-- 1c. Family copies: same split, only where still untouched
-- =========================================================
update rewards set
  coin_cost = case when coin_cost = 130 then 115 else coin_cost end,
  reference_price_vnd = case when reference_price_vnd = 130000 then 115000 else reference_price_vnd end,
  recommended_age = 8, max_age = 10
where is_system_template = false and name = 'Movie theater' and min_age = 6 and max_age = 17;

update rewards set recommended_age = 8, max_age = 10
where is_system_template = false and name = 'Theme park' and min_age = 6 and max_age = 15;

insert into rewards (
  family_id, source_template_key, name, name_vi, description, description_vi, category,
  reference_price_vnd, coin_cost, min_age, recommended_age, max_age, dream_eligible,
  requires_approval, is_system_template, active
)
select base.family_id, tpl.template_key, tpl.name, tpl.name_vi, tpl.description, tpl.description_vi, tpl.category,
       tpl.reference_price_vnd, tpl.coin_cost, tpl.min_age, tpl.recommended_age, tpl.max_age, tpl.dream_eligible,
       tpl.requires_approval, false, true
from rewards base
join rewards tpl
  on tpl.is_system_template = true
 and tpl.name = base.name || ' (11+)'
where base.is_system_template = false
  and base.active = true
  and base.name in ('Movie theater', 'Theme park')
  and not exists (
    select 1 from rewards x
    where x.family_id = base.family_id and x.name = tpl.name and x.active = true
  );

-- =========================================================
-- 2a. Kindness quests cloned before 0034 (original seeded coin values)
-- =========================================================
update tasks t set coin_reward = 0
from (values
  ('BQ-CHAR-INTERVIEW-GRANDPARENTS-A09', 8),
  ('BQ-CHAR-GAME-NIGHT-A10', 8),
  ('BQ-CHAR-CREATE-USEFUL-A12', 8),
  ('BQ-CHAR-ORGANIZE-ACTIVITY-A14', 10),
  ('BQ-CHAR-LEAD-ACTIVITY-A17', 15),
  ('BQ-CHAR-LEARN-FROM-PARENT-A18', 10)
) as v(key, old_coin)
where t.is_system_template = false and t.source_template_key = v.key and t.coin_reward = v.old_coin;

-- =========================================================
-- 2b. Household-routine family quests (templates already 0 since 0034)
-- =========================================================
update family_quests set coin_reward = 0
where is_system_template = false
  and ((title = 'Tidy House Challenge' and coin_reward = 150)
    or (title = 'Morning Routine Streak' and coin_reward = 200));
