-- 0021_reward_media.sql — Add image and link fields to rewards

alter table rewards
  add column if not exists image_url text,
  add column if not exists link_url  text;
