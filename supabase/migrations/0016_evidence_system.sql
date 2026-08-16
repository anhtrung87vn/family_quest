-- 0016_evidence_system.sql — Evidence System for Task Completions
--
-- Allows children to attach evidence (photo, audio, text, choice)
-- when completing quests. Parents can review, promote to permanent
-- memory, or delete. Media auto-expires after 7 days.
--
-- Backward compatibility: existing tasks default to
--   evidence_type = 'none', evidence_required = false
-- so current behavior is preserved.

-- =========================================================
-- 1. Extend tasks table with evidence configuration
-- =========================================================
alter table tasks
  add column if not exists evidence_type text not null
    default 'none'
    check (evidence_type in ('none', 'photo', 'audio', 'text', 'choice', 'parent_observation'));

alter table tasks
  add column if not exists evidence_required boolean not null default false;

alter table tasks
  add column if not exists max_audio_seconds smallint not null default 30
    check (max_audio_seconds between 5 and 60);

-- =========================================================
-- 2. task_evidence table — stores evidence metadata
-- =========================================================
create table if not exists task_evidence (
  id                 uuid primary key default gen_random_uuid(),
  task_completion_id uuid not null references task_completions(id) on delete cascade,
  child_id           uuid not null references children(id) on delete cascade,
  family_id          uuid not null references families(id) on delete cascade,

  -- Evidence content
  evidence_type      text not null
    check (evidence_type in ('photo', 'audio', 'text', 'choice', 'parent_observation')),
  storage_path       text,                    -- photo/audio: path in family-evidence bucket
  file_size          integer,                 -- bytes
  mime_type          text,                    -- e.g. image/jpeg, audio/webm
  text_content       text,                    -- text/parent_observation reflections
  choice_value       text,                    -- choice reflection value
  audio_duration     smallint,                -- seconds, for audio type

  -- Lifecycle
  status             text not null default 'active'
    check (status in ('active', 'promoted', 'deleted', 'expired')),
  expires_at         timestamptz,             -- null for text/choice; set for photo/audio
  promoted_at        timestamptz,             -- when parent chose "Keep as Memory"
  deleted_at         timestamptz,             -- when parent or cron deleted
  promoted_by        uuid references users(id),

  created_at         timestamptz not null default now()
);

-- Indexes
create index if not exists task_evidence_completion_idx
  on task_evidence(task_completion_id);

create index if not exists task_evidence_child_idx
  on task_evidence(child_id, created_at desc);

create index if not exists task_evidence_expires_idx
  on task_evidence(expires_at)
  where status = 'active' and expires_at is not null;

create index if not exists task_evidence_family_promoted_idx
  on task_evidence(family_id, status)
  where status = 'promoted';

-- =========================================================
-- 3. RLS policies for task_evidence
-- =========================================================
alter table task_evidence enable row level security;

-- Parents can read evidence for their family
create policy evidence_family_read on task_evidence for select
  using (family_id = auth_family_id());

-- Parents can manage evidence for their family
create policy evidence_family_write on task_evidence for all
  using (family_id = auth_family_id())
  with check (family_id = auth_family_id());

-- =========================================================
-- 4. Storage bucket for evidence media (private)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit)
  values ('family-evidence', 'family-evidence', false, 10485760)
  on conflict (id) do nothing;

-- Storage policies: family-scoped read/write
drop policy if exists evidence_storage_read on storage.objects;
drop policy if exists evidence_storage_write on storage.objects;

create policy evidence_storage_read on storage.objects for select
  using (
    bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );

create policy evidence_storage_write on storage.objects for all
  using (
    bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text
  )
  with check (
    bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );
