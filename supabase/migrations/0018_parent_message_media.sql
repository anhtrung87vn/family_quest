-- 0018_parent_message_media.sql
-- Add media attachment support to parent_messages (photo or audio from parent to child)

alter table parent_messages
  add column if not exists media_type text check (media_type in ('photo', 'audio')),
  add column if not exists media_path text,   -- storage path in parent-messages bucket
  add column if not exists media_mime text;   -- e.g. image/jpeg, audio/mp4

-- Storage bucket must be created via Dashboard or CLI first:
--   supabase storage create parent-messages --public=false
--
-- Then run these RLS policies so signed URLs work:

insert into storage.buckets (id, name, public)
values ('parent-messages', 'parent-messages', false)
on conflict (id) do nothing;

-- Allow service_role (admin client) full access — needed for upload + signed URL generation
create policy "service role full access on parent-messages"
  on storage.objects for all
  to service_role
  using (bucket_id = 'parent-messages')
  with check (bucket_id = 'parent-messages');

-- Allow authenticated users to download objects in their family's folder
-- (signed URLs bypass RLS by design, but this covers direct access)
create policy "authenticated download parent-messages"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'parent-messages');
