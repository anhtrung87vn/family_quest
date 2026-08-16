-- 0017_family_memories.sql — Family Memories + evidence deletion_reason
--
-- Adds:
--   1. deletion_reason column on task_evidence
--   2. family_memories table for promoted evidence
--   3. family-memories storage bucket (private, permanent)
--   4. memory_id column on task_evidence linking to family_memories

-- =========================================================
-- 1. Add deletion_reason to task_evidence
-- =========================================================
alter table task_evidence
  add column if not exists deletion_reason text
    check (deletion_reason in ('PARENT_DELETED', 'AUTO_EXPIRED', 'PROMOTED_TO_MEMORY', 'SYSTEM_CLEANUP'));

alter table task_evidence
  add column if not exists memory_id uuid;

-- =========================================================
-- 2. family_memories table
-- =========================================================
create table if not exists family_memories (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references families(id) on delete cascade,
  child_id           uuid not null references children(id) on delete cascade,

  -- Source reference
  source_type        text not null default 'evidence'
    check (source_type in ('evidence', 'manual')),
  source_id          uuid,                     -- task_evidence.id if from evidence

  -- Display
  title              text,
  caption            text,

  -- Media
  media_type         text not null
    check (media_type in ('photo', 'audio')),
  media_storage_path text not null,            -- path in family-memories bucket
  mime_type          text,
  file_size_bytes    integer,

  memory_date        date not null default current_date,

  created_by         uuid references users(id),
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz                -- soft-delete
);

-- Indexes
create index if not exists family_memories_family_idx
  on family_memories(family_id, created_at desc);

create index if not exists family_memories_child_idx
  on family_memories(child_id, created_at desc);

-- FK from task_evidence.memory_id → family_memories
alter table task_evidence
  add constraint task_evidence_memory_fk
  foreign key (memory_id) references family_memories(id)
  on delete set null;

-- =========================================================
-- 3. RLS for family_memories
-- =========================================================
alter table family_memories enable row level security;

create policy memories_family_read on family_memories for select
  using (family_id = auth_family_id() and deleted_at is null);

create policy memories_family_write on family_memories for all
  using (family_id = auth_family_id())
  with check (family_id = auth_family_id());

-- =========================================================
-- 4. family-memories storage bucket (private, permanent)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit)
  values ('family-memories', 'family-memories', false, 10485760)
  on conflict (id) do nothing;

-- Storage policies
create policy memories_storage_read on storage.objects for select
  using (
    bucket_id = 'family-memories'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );

create policy memories_storage_write on storage.objects for all
  using (
    bucket_id = 'family-memories'
    and (storage.foldername(name))[1] = auth_family_id()::text
  )
  with check (
    bucket_id = 'family-memories'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );
