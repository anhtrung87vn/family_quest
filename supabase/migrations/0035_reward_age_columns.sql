-- 0035_reward_age_columns.sql — Age range + reference price for rewards
--
-- Rewards get the same age contract as tasks (min/recommended/max) so the
-- child shop and "send by age" can match a child's date of birth.
-- reference_price_vnd records the real-world price a template's coin_cost is
-- derived from (1 coin ≈ 1,000đ). template_key / source_template_key mirror
-- tasks so family copies can be traced back to their system template.

alter table rewards
  add column if not exists min_age integer check (min_age between 4 and 21),
  add column if not exists recommended_age integer check (recommended_age between 4 and 21),
  add column if not exists max_age integer check (max_age between 4 and 21),
  add column if not exists reference_price_vnd integer check (reference_price_vnd >= 0),
  add column if not exists template_key text,
  add column if not exists source_template_key text;

create unique index if not exists rewards_template_key_uniq
  on rewards(template_key)
  where template_key is not null and is_system_template = true;
