-- 0003_storage.sql — Avatar storage bucket + policies
-- Bucket is private; reads via signed URLs from server components.

insert into storage.buckets (id, name, public)
  values ('family-avatars', 'family-avatars', false)
  on conflict (id) do nothing;

-- Object naming convention: <family_id>/<child_id>.<ext>
-- Parent can read/write only objects whose top-level folder equals their family_id.

drop policy if exists avatars_read  on storage.objects;
drop policy if exists avatars_write on storage.objects;

create policy avatars_read on storage.objects for select
  using (
    bucket_id = 'family-avatars'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );

create policy avatars_write on storage.objects for all
  using (
    bucket_id = 'family-avatars'
    and (storage.foldername(name))[1] = auth_family_id()::text
  )
  with check (
    bucket_id = 'family-avatars'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );
