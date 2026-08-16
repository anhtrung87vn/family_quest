-- 0014_parent_messages.sql — Parent Recognition & Encouragement System
--
-- parent_messages: stores all parent→child messages:
--   QUEST_APPROVAL  — attached to a task_completion when parent approves
--   WEEKLY_JOURNAL  — attached to a weekly_reflection
--   GENERAL         — standalone note from parent to child
--
-- Children mark messages read; can react with a single emoji.

create table if not exists parent_messages (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  child_id       uuid not null references children(id) on delete cascade,
  parent_user_id uuid references users(id) on delete set null,
  message_type   text not null check (message_type in (
                   'QUEST_APPROVAL', 'WEEKLY_JOURNAL', 'GENERAL'
                 )),
  message        text not null,
  reference_id   uuid,       -- task_completion.id or weekly_reflection.id
  read_at        timestamptz,
  reaction       text check (reaction in ('❤️', '😊', '🌟')),
  created_at     timestamptz not null default now()
);

create index if not exists parent_messages_child_idx on parent_messages(child_id, created_at desc);
create index if not exists parent_messages_unread_idx on parent_messages(child_id, read_at) where read_at is null;

alter table parent_messages enable row level security;

-- Parents in the family can read and write messages
create policy parent_messages_family on parent_messages for all
  using (family_id = auth_family_id());

-- Allow service-role (admin client used by child SSR pages) to bypass RLS
-- This is safe: the admin client is only used server-side.
-- (service_role bypasses RLS by default — this comment is for documentation)

-- =========================================================
-- Rename weekly_reflections.improvements → growth_note
-- to match the softer "growth conversation" wording.
-- Keep improvements as a generated alias for BC.
-- =========================================================
alter table weekly_reflections
  rename column improvements to growth_note;

-- child_read_at on weekly_reflections so child can mark as read
alter table weekly_reflections
  add column if not exists child_read_at timestamptz;
