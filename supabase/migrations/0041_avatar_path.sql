-- 0041_avatar_path.sql — Stable child avatar URLs.
--
-- children.avatar_url used to hold a 30-day signed URL for the private
-- family-avatars bucket, so photos disappeared about a month after upload.
-- Now the storage object path lives in avatar_path and avatar_url points to
-- the app route /api/avatar/<child id>, which signs a fresh URL on each view.

create table if not exists backup_0041_children_avatar as
  select id, avatar_url from children;

alter table children add column if not exists avatar_path text;

-- Recover the object path from existing signed URLs:
--   …/storage/v1/object/sign/family-avatars/<family>/<child>.<ext>?token=…
update children
set avatar_path = substring(avatar_url from 'family-avatars/([^?]+)')
where avatar_path is null
  and avatar_url like '%/family-avatars/%';

update children
set avatar_url = '/api/avatar/' || id || '?v=' || floor(extract(epoch from now()))::bigint
where avatar_path is not null
  and avatar_url not like '/api/avatar/%';
