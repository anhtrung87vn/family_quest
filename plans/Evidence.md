# BloomQuest — Evidence System Implementation Plan

## 1. Objective

Allow children to attach completion evidence when submitting a quest. Evidence types are configurable per task and independent from `requires_approval`.

**Core philosophy**: Evidence should feel like sharing, not surveillance. Child-facing language uses friendly wording ("Show what you made!", "Tell us about it!") — never "proof" or "verification".

---

## 2. Outcome Contract

- **Outcome**: Children can attach photo, audio, text reflection, or choice reflection when completing a quest. Parents see evidence during approval, can download/save it, promote it to permanent memory, or delete it. Temporary media auto-expires after 7 days.
- **Constraints**:
  - No video in V1
  - No AI analysis, face recognition, voice analysis, public sharing
  - Media stored in private Supabase Storage bucket — never public URLs
  - Database stores metadata + `storage_path` only, not binary data
  - Deleting evidence must NOT affect task completion, coins, stars, or parent messages
  - Evidence configuration is independent from `requires_approval`
- **Non-goals**: AI image analysis, public sharing, surveillance features, video support
- **Acceptance criteria**:
  1. Parent configures evidence type on a task (photo / audio / text / choice / none / parent_observation)
  2. Child sees friendly evidence prompt matching configured type when submitting
  3. Photo evidence: child uploads/takes photo stored privately, parent sees it during approval
  4. Audio evidence: child records 30s (max 60s) stored privately, parent can play it
  5. Text reflection: child writes short text stored in DB, parent reads it
  6. Choice reflection: child picks from preset options stored in DB, parent sees selection
  7. Parent observation: no child-side evidence; parent fills in observation during approval
  8. Parent can: Save to device, Keep as Memory, Delete
  9. Evidence lifecycle: ACTIVE then PROMOTED or DELETED or EXPIRED
  10. Daily cron expires media older than 7 days
  11. Text/choice reflections persist (not subject to media cleanup)
  12. All existing task flows continue working unchanged

---

## 3. Codebase Context (Scout Summary)

- **Stack**: Next.js 15 App Router, TypeScript, Supabase (Postgres + Storage + Auth), next-intl, Tailwind
- **Child sessions**: PIN-based, not auth.users. All child writes via createAdminClient() (service-role)
- **Task submission flow**: submitTaskAction then submitTaskAsChild then submit_task PG function then task_completions row then optional auto_award_task
- **Parent approval**: approveCompletion then awardTask then coin/star ledger + parent_messages
- **Storage**: Private family-avatars bucket exists; path {family_id}/{child_id}.{ext}, signed URLs
- **Cron**: Single daily job at 0 22 * * * UTC for recurring assignment generation
- **Migrations**: Up to 0015_habit_system.sql
- **i18n**: messages/en.json + messages/vi.json

### Key files affected

| File | Role |
|------|------|
| `app/[locale]/child/(app)/actions.ts` | Child server actions (submitTaskAction) |
| `app/[locale]/child/(app)/home/page.tsx` | Child home task submit buttons |
| `app/[locale]/(parent)/approvals/actions.ts` | Parent approval actions |
| `app/[locale]/(parent)/approvals/page.tsx` | Parent approval UI |
| `app/[locale]/(parent)/tasks/actions.ts` | Task creation (createTask) |
| `app/[locale]/(parent)/tasks/page.tsx` | Task form UI |
| `lib/ledger.ts` | submitTaskAsChild wrapper |
| `supabase/migrations/0005_ledger_functions.sql` | submit_task PG function |
| `vercel.json` | Cron schedule |
| `messages/en.json` `messages/vi.json` | i18n strings |

---

## 4. Evidence Types

| Type | Child action | Storage | Expires | Config |
|------|-------------|---------|---------|--------|
| `none` | No evidence (default) | n/a | n/a | n/a |
| `photo` | Upload/take photo | Supabase Storage | 7 days | Optional or required |
| `audio` | Record audio clip | Supabase Storage | 7 days | Max 30s (default) 60s (max) |
| `text` | Write short reflection | DB column | Never | Max 500 chars |
| `choice` | Pick from preset options | DB column | Never | Standard set |
| `parent_observation` | Parent writes during approval | DB column | Never | n/a |

### Choice Reflection Preset Options (V1)

Standard set stored as enum values:
- `easy` — It was easy!
- `hard` — It was hard but I did it!
- `helped` — I got some help
- `learned` — I learned something new!
- `fun` — It was fun!
- `proud` — I am proud of this!

---

## 5. Database Schema

### Migration 0016_evidence_system.sql

#### 5.1 Extend tasks table

```sql
alter table tasks
  add column if not exists evidence_type text not null
    default 'none'
    check (evidence_type in ('none', 'photo', 'audio', 'text', 'choice', 'parent_observation'));

alter table tasks
  add column if not exists evidence_required boolean not null default false;

alter table tasks
  add column if not exists max_audio_seconds smallint not null default 30
    check (max_audio_seconds between 5 and 60);
```

#### 5.2 task_evidence table

```sql
create table task_evidence (
  id               uuid primary key default gen_random_uuid(),
  task_completion_id uuid not null references task_completions(id) on delete cascade,
  child_id         uuid not null references children(id) on delete cascade,
  family_id        uuid not null references families(id) on delete cascade,
  evidence_type    text not null
    check (evidence_type in ('photo', 'audio', 'text', 'choice', 'parent_observation')),
  storage_path     text,
  file_size        integer,
  mime_type        text,
  text_content     text,
  choice_value     text,
  audio_duration   smallint,
  status           text not null default 'active'
    check (status in ('active', 'promoted', 'deleted', 'expired')),
  expires_at       timestamptz,
  promoted_at      timestamptz,
  deleted_at       timestamptz,
  promoted_by      uuid references users(id),
  created_at       timestamptz not null default now()
);

create index task_evidence_completion_idx on task_evidence(task_completion_id);
create index task_evidence_child_idx on task_evidence(child_id, created_at desc);
create index task_evidence_expires_idx on task_evidence(expires_at)
  where status = 'active' and expires_at is not null;
create index task_evidence_family_promoted_idx on task_evidence(family_id, status)
  where status = 'promoted';
```

#### 5.3 RLS Policies

```sql
alter table task_evidence enable row level security;

create policy evidence_family_read on task_evidence for select
  using (family_id = auth_family_id());

create policy evidence_family_write on task_evidence for all
  using (family_id = auth_family_id())
  with check (family_id = auth_family_id());
```

#### 5.4 Storage Bucket

```sql
insert into storage.buckets (id, name, public, file_size_limit)
  values ('family-evidence', 'family-evidence', false, 10485760)
  on conflict (id) do nothing;
```

Storage policies (same pattern as family-avatars):

```sql
create policy evidence_read on storage.objects for select
  using (
    bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );

create policy evidence_write on storage.objects for all
  using (
    bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text
  )
  with check (
    bucket_id = 'family-evidence'
    and (storage.foldername(name))[1] = auth_family_id()::text
  );
```

Storage path convention: `{family_id}/{child_id}/{completion_id}.{ext}`

---

## 6. Evidence Lifecycle

```
                         ACTIVE
                      /    |     \
           Keep as   Delete  7-day cron
            Memory
              |        |        |
          PROMOTED  DELETED  EXPIRED
```

- **ACTIVE**: Default state. Photo/audio have expires_at = created_at + 7 days.
- **PROMOTED**: Parent selected Keep as Memory. expires_at cleared, promoted_at set. Media stays permanently.
- **DELETED**: Parent explicitly deleted. Media removed from storage bucket. Row remains for audit.
- **EXPIRED**: Cron set status after expires_at passed. Media removed from storage bucket.

Text and choice evidence: expires_at is NULL so they never expire and are not subject to media cleanup.

---

## 7. Security Rules

1. All child media is private (bucket public = false)
2. Parent access scoped to family_id = auth_family_id()
3. Child upload: server action verifies childId owns the assignment via getChildSession()
4. Signed URLs for media access (short-lived, 5-minute expiry)
5. Child can only upload evidence for their own assigned/claimed quest
6. Service-role key used for child-side uploads (child is not auth.users)
7. File size limit: 10MB per file (enforced at bucket level + server action)
8. Accepted MIME types: image/jpeg, image/png, image/webp, audio/webm, audio/mp4, audio/mpeg
9. No permanent public media URLs, always signed

---

## 8. Implementation Phases

### Phase 1 — Schema + Storage (Migration)

**Deliverables:**
- supabase/migrations/0016_evidence_system.sql
- family-evidence storage bucket with RLS policies
- tasks.evidence_type, tasks.evidence_required, tasks.max_audio_seconds columns
- task_evidence table with indexes + RLS

**Acceptance:**
- Migration applies cleanly on existing DB
- Existing tasks default to evidence_type = none, evidence_required = false
- No existing behavior changes

---

### Phase 2 — Child Evidence Submission

**Deliverables:**
- Update submitTaskAction to accept evidence data (FormData with file/text/choice)
- New server action uploadEvidenceAction for file uploads (photo/audio)
- Photo upload: accept from camera/file
- Audio recording: EvidenceAudioRecorder client component using MediaRecorder API
- Text reflection: simple textarea
- Choice reflection: button group with preset options
- Evidence prompt UI integrated into task submit flow on child home page

**Child-facing wording:**

| Type | Prompt (en) | Prompt (vi) |
|------|-------------|-------------|
| photo | Show what you made! | Cho moi nguoi xem nao! |
| audio | Tell us about it! | Ke cho moi nguoi nghe nao! |
| text | What did you learn? | Con da hoc duoc gi? |
| choice | How was it? | Con thay the nao? |
| parent_observation | (no child prompt) | (no child prompt) |

**Task submit flow change:**

```
Current:  [Done!] -> submitTaskAction -> completion created
New:      [Done!] -> evidence modal/section appears ->
          child provides evidence -> submitTaskAction + evidence -> completion created
```

If evidence_required = false: child sees prompt but can skip (Skip button).
If evidence_required = true: child must provide evidence before submission is accepted.

**Key implementation details:**
- Photo/audio upload to family-evidence/{family_id}/{child_id}/{completion_id}.{ext} via service-role
- Server action validates: child session, assignment ownership, file type, file size
- task_evidence row inserted with status = active, expires_at = now() + 7 days for media
- Text/choice evidence: expires_at = null (persist forever)

**Acceptance:**
- Child can submit a photo when completing a photo-evidence task
- Child can record and submit up to 30s audio clip
- Child can type a text reflection
- Child can pick a choice reflection
- Evidence is stored correctly in bucket/DB
- Existing non-evidence tasks continue working unchanged

---

### Phase 3 — Parent Review + Evidence Management

**Deliverables:**
- Update parent approvals page to show submitted evidence inline
- Photo: display as inline image (signed URL)
- Audio: embed audio player (signed URL)
- Text: show text content
- Choice: show selected option with emoji
- Parent observation: text input during approval
- Parent actions:
  - Save to device: download link (signed URL with Content-Disposition: attachment)
  - Keep as Memory: promotes evidence to permanent (status = promoted)
  - Delete: marks as deleted, removes file from storage

**New server actions in approvals:**

```typescript
promoteEvidenceAction(formData)   // Keep as Memory
deleteEvidenceAction(formData)    // Delete
parentObservationAction(formData) // Submit parent observation evidence
```

**Parent observation flow:**
- Task has evidence_type = parent_observation
- Child submits normally (no evidence prompt)
- Parent sees "What did you observe?" input during approval
- Parent fills in observation, stored as task_evidence with evidence_type = parent_observation

**Acceptance:**
- Parent sees photo/audio/text/choice evidence during task approval
- Parent can download media to device
- Parent can promote evidence to permanent memory
- Parent can delete evidence without affecting completion/coins/stars
- Deleting evidence removes file from storage bucket but keeps metadata row
- Parent can add observation for parent_observation tasks

---

### Phase 4 — Cleanup Cron Job

**Deliverables:**
- New API route: app/api/cron/cleanup-evidence/route.ts
- Runs daily (add to vercel.json)
- Logic:
  1. Query task_evidence where status = active AND expires_at < now()
  2. For each: delete file from family-evidence bucket
  3. Update status = expired, deleted_at = now()
- Log summary: { expired: N, errors: N }

**Acceptance:**
- Cron expires media older than 7 days
- Promoted media is not expired
- Text/choice evidence is never expired (no expires_at)
- Storage bucket files are actually deleted
- task_evidence rows remain for audit trail

---

### Phase 5 — Task Creation UI + i18n

**Deliverables:**
- Update parent task creation form with evidence configuration:
  - Evidence type dropdown
  - Evidence required toggle
  - Max audio seconds (shown only for audio type)
- i18n strings for en.json + vi.json covering:
  - Child evidence prompts
  - Parent evidence review labels
  - Evidence management actions
  - Choice reflection options

**Acceptance:**
- Parent can set evidence type when creating a task
- All UI strings are localized in en + vi
- Existing tasks show evidence_type = none (no change)

---

## 9. Backward Compatibility Rules

1. All existing tasks: default evidence_type = none, evidence_required = false, no change to current behavior
2. submitTaskAction: when evidence_type = none, works exactly as today
3. submit_task PG function: unchanged, evidence is handled at application layer not in PG function
4. approveCompletion: continues working, evidence display is additive
5. No changes to coin/star ledger logic, parent_messages, badges, streaks
6. Deleting evidence never cascades to task_completions, transactions, or messages

---

## 10. File Changes Summary

| File | Change |
|------|--------|
| `supabase/migrations/0016_evidence_system.sql` | New: schema + bucket + RLS |
| `app/[locale]/child/(app)/actions.ts` | Modify submitTaskAction to handle evidence |
| `app/[locale]/child/(app)/home/page.tsx` | Add evidence UI per task type |
| `components/ui/EvidenceCapture.tsx` | New: client component for photo/audio/text/choice |
| `components/ui/AudioRecorder.tsx` | New: client component for audio recording |
| `app/[locale]/(parent)/tasks/actions.ts` | Update createTaskSchema + createTask |
| `app/[locale]/(parent)/tasks/page.tsx` | Add evidence config to task form |
| `app/[locale]/(parent)/approvals/page.tsx` | Show evidence in approval cards |
| `app/[locale]/(parent)/approvals/actions.ts` | Add promote/delete/observation actions |
| `app/api/cron/cleanup-evidence/route.ts` | New: daily evidence expiry job |
| `vercel.json` | Add cleanup-evidence cron schedule |
| `messages/en.json` | Evidence i18n strings |
| `messages/vi.json` | Evidence i18n strings |
| `docs/db-schema.md` | Document evidence tables |

---

## 11. Choice Reflection Display

| Value | Emoji | English | Vietnamese |
|-------|-------|---------|------------|
| easy | happy face | It was easy! | De lam! |
| hard | strong arm | It was hard but I did it! | Kho nhung con lam duoc! |
| helped | handshake | I got some help | Con duoc giup mot chut |
| learned | lightbulb | I learned something new! | Con hoc duoc dieu moi! |
| fun | party | It was fun! | Vui lam! |
| proud | star | I am proud of this! | Con tu hao ve viec nay! |

---

## 12. MVP Acceptance Scenario

1. Parent creates task "Mini Research Project" with evidence_type = photo, evidence_required = true
2. Parent creates task "Read 20 Minutes" with evidence_type = choice, evidence_required = false
3. Parent creates task "Music Practice" with evidence_type = audio, max_audio_seconds = 30
4. Parent creates task "Help Sister" with evidence_type = parent_observation
5. Berry opens Home, taps Done on "Mini Research Project"
6. Berry sees "Show what you made!" prompt, takes/uploads photo
7. Photo uploads to family-evidence/{family_id}/{berry_id}/{completion_id}.jpg
8. task_evidence row created with status = active, expires_at = now + 7 days
9. Berry taps Done on "Read 20 Minutes", sees choice reflection, picks "It was fun!", submits
10. Parent opens Approvals, sees "Mini Research Project" with inline photo
11. Parent taps Keep as Memory, status becomes promoted, expires_at cleared
12. Parent approves task, coins/stars awarded, parent message sent (unaffected by evidence)
13. 7 days later: cron runs, no action on promoted photo; non-promoted active media would expire
14. Berry taps Done on "Music Practice", records 15s audio, submits
15. Parent plays audio in approval view, approves, downloads audio to phone
16. Parent approves "Help Sister", types "Berry helped July with her homework" as observation

If this scenario works correctly, the evidence system is complete.
