-- 0022_reward_images_bucket.sql — Public bucket for reward images

insert into storage.buckets (id, name, public)
  values ('reward-images', 'reward-images', true)
  on conflict (id) do nothing;

drop policy if exists reward_images_read  on storage.objects;
drop policy if exists reward_images_write on storage.objects;

create policy reward_images_read on storage.objects for select
  using (bucket_id = 'reward-images');

create policy reward_images_write on storage.objects for all
  using (bucket_id = 'reward-images')
  with check (bucket_id = 'reward-images');
