BloomQuest — Completion Evidence Implementation Plan v2
1. Final Evidence Lifecycle
Child submits Photo / Audio
        ↓
Temporary Evidence
        ↓
Private Supabase Storage
        ↓
Expires in 7 days
        │
        ├── ⬇️ Download
        │      ↓
        │   Save copy to PC / Mobile
        │
        │   Original still expires after 7 days
        │
        ├── ❤️ Keep as Memory
        │      ↓
        │   Family Memory
        │   No 7-day expiration
        │
        ├── 🗑️ Delete Now
        │      ↓
        │   Delete media immediately
        │
        └── No action
               ↓
            Day 7+
               ↓
          Automatic deletion
2. Parent Evidence Actions

Every photo/audio evidence view must provide:

⬇️ Lưu về thiết bị
❤️ Giữ làm kỷ niệm
🗑️ Xóa

English:

⬇️ Save to device
❤️ Keep as Memory
🗑️ Delete

These actions should be available from:

Parent approval screen.
Task completion detail.
Child activity/history while evidence still exists.
Family Memory screen where applicable.
3. Save to Device

Implement:

⬇️ Save to device

for:

📷 Photo
🎤 Audio

Expected behavior:

Desktop

Browser downloads file to the user's normal download location.

Example:

Berry-Drawing-2026-08-15.webp

or:

Berry-English-Speaking-2026-08-15.webm
Mobile

Use the browser/device's normal file-save mechanism.

Depending on browser/OS this may present:

Save to Files
Download
Share
Open in...

Do not build native filesystem access specifically for iOS/Android in V1.

The PWA should use normal browser-supported download/share behavior.

4. Important Download Rule

Downloading must not modify retention.

Example:

Evidence created:
Aug 15

Expiration:
Aug 22

Parent downloads:
Aug 17

Expiration remains:
Aug 22

Do not automatically convert downloaded evidence into a Memory.

These are separate actions:

⬇️ Save to device
≠
❤️ Keep as Memory
5. Secure Download Architecture

Do not expose permanent public URLs.

Flow:

Parent taps Download
        ↓
Server validates Parent session
        ↓
Validate Family ownership
        ↓
Validate Evidence ownership
        ↓
Generate temporary authorized access
        ↓
Return/download media

For example conceptually:

GET /api/evidence/:id/download

Server must derive:

family_id
child_id
storage_path

from database.

Never trust those values from browser parameters.

6. Download Filename

Generate human-readable filenames server-side.

Examples:

Berry-Drawing-2026-08-15.webp
July-English-Speaking-2026-08-15.webm

Sanitize all filename components.

Do not use storage UUID as the downloaded filename unless necessary.

Storage itself should continue using anonymous paths:

completion-evidence/
  family_uuid/
    child_uuid/
      completion_uuid/
        <uuid>.webm
7. Delete Evidence Immediately

Add:

🗑️ Xóa

Parent must be able to remove temporary media before the 7-day expiration.

Flow:

Parent
  ↓
Delete
  ↓
Confirmation
  ↓
Server authorization
  ↓
Delete Storage object
  ↓
Mark evidence deleted

Confirmation:

🗑️ Xóa bản ghi âm này?

Bản ghi sẽ bị xóa khỏi BloomQuest
và không thể khôi phục.

Nếu muốn giữ lại, hãy tải về thiết bị
trước khi xóa.

[ Hủy ]
[ Xóa ]

For photo:

🗑️ Xóa ảnh này?
8. Delete Does NOT Delete Task Completion

Critical rule:

DELETE EVIDENCE
≠
DELETE TASK COMPLETION

For example:

📚 Read 20 minutes
Completed: Aug 15
Approved: Yes
Coins: +5
Stars: +1
Audio evidence: Deleted

The task completion remains in history.

Coins/Stars remain unchanged.

Parent messages remain unchanged.

Only media is removed.

9. Database State After Delete

Do not immediately delete the completion_evidence database row.

Keep metadata for auditing/debugging:

completion_evidence

id
task_completion_id
evidence_type

storage_path = null or retained for audit according to implementation
created_at
expires_at

deleted_at
deletion_reason

Suggested:

deletion_reason:
PARENT_DELETED
AUTO_EXPIRED
PROMOTED_TO_MEMORY

Possible enum:

PARENT_DELETED
AUTO_EXPIRED
PROMOTED_TO_MEMORY
SYSTEM_CLEANUP
10. Recommended Evidence Status

Add:

status

Values:

ACTIVE
PROMOTED
DELETED
EXPIRED

Example lifecycle:

ACTIVE
   │
   ├── ❤️ Keep as Memory
   │        ↓
   │    PROMOTED
   │
   ├── 🗑 Parent Delete
   │        ↓
   │     DELETED
   │
   └── expires_at reached
            ↓
         EXPIRED

This is cleaner than trying to infer everything from deleted_at.

11. Child Delete Permissions

V1 rule:

Before submitting

Child can:

📷 Retake
🎤 Record again
🗑 Remove

Example:

▶ Recording 00:22

[ 🔄 Record Again ]
[ 🗑 Remove ]
[ ✅ Use Recording ]
After submitting

Do not let child directly delete submitted evidence in V1.

Once:

SUBMITTED

Parent manages:

⬇️ Download
❤️ Keep as Memory
🗑 Delete

This prevents inconsistent behavior such as:

Parent opens task for approval
        ↓
Child deletes audio simultaneously

This can be reconsidered later.

12. Parent Approval Screen — Updated

Photo example:

👧 Berry

🎨 Draw Something

┌────────────────────────┐
│                        │
│        PHOTO           │
│                        │
└────────────────────────┘

🪙 +5   ⭐ +2

Temporary media
Auto-delete in 5 days

[ ⬇️ Save ]
[ ❤️ Memory ]
[ 🗑️ Delete ]

❤️ Encouragement:
[ Great work! ▼ ]

[ ✅ Approve ]

Audio:

👧 Berry

🎤 English Speaking

▶ ━━━━━━━━ 00:22

Auto-delete in 5 days

[ ⬇️ Save ]
[ ❤️ Memory ]
[ 🗑️ Delete ]

[ ❤️ Add Message ]
[ ✅ Approve ]
13. Evidence Detail Screen

If Parent clicks evidence:

← Berry's English Speaking

🎤 Recording

▶ ━━━━━━━━━━━ 00:22

Created
15 Aug 2026

Task
English Speaking Challenge

Expiration
22 Aug 2026
7-day temporary evidence

────────────────

⬇️ Save to device

❤️ Keep as Memory

🗑️ Delete evidence

Keep destructive action visually separate from the other two.

14. Family Memory Screen

For promoted content:

❤️ FAMILY MEMORY

🍳 Berry's First Pancakes

15 Aug 2026

[ PHOTO ]

Dad:
"She made these almost by herself!"

[ ⬇️ Save to device ]

[ 🗑️ Delete Memory ]

There is no:

Auto-delete in 7 days

for memories.

15. Deleting a Family Memory

Memory deletion is separate from evidence deletion.

Flow:

Parent selects:

🗑 Delete Memory
        ↓
Confirmation
        ↓
Delete private Storage object
        ↓
Soft-delete Family Memory record

Confirmation should make the consequence clear:

Delete this memory?

This media will be removed from
BloomQuest permanently.

Consider saving it to your device first.

[ Cancel ]
[ Delete Memory ]
16. Download Memory

Family Memories should also support:

⬇️ Save to device

This is especially useful if parent later wants to clean BloomQuest storage while keeping family media offline.

Example flow:

❤️ Memory
    ↓
⬇️ Save to PC
    ↓
🗑 Delete from BloomQuest

This allows the family to keep its own archive outside Supabase.

17. Optional Future Feature: Bulk Download

Do not implement in V1, but design so this can be added later:

Family Memories

[ ⬇️ Download All ]

Potential result:

BloomQuest-Berry-2026.zip

containing:

Photos/
Audio/
memory-index.json

This could later become part of the existing family data export feature.

But V1 should only implement individual media download.

18. Updated Storage Policy

Use two private buckets:

Supabase Storage

1. completion-evidence
   ├── temporary
   ├── 7-day lifetime
   ├── download allowed to Parent
   └── delete allowed to Parent


2. family-memories
   ├── explicit Parent selection
   ├── no automatic expiration
   ├── download allowed to Parent
   └── delete allowed to Parent

Both:

PRIVATE

Never public.

19. Updated Database Schema
completion_evidence
id
family_id
child_id
task_id
task_completion_id

evidence_type

storage_path
mime_type
file_size_bytes
duration_seconds

text_content
choice_value

status

created_at
expires_at

promoted_to_memory_at
memory_id

deleted_at
deletion_reason

Suggested:

status:
ACTIVE
PROMOTED
DELETED
EXPIRED
20. family_memories
id
family_id
child_id

source_type
source_id

title
caption

media_type
media_storage_path
mime_type
file_size_bytes

memory_date

created_by
created_at

deleted_at
21. Server Operations

Add server actions/API operations conceptually equivalent to:

createEvidenceUpload()
submitCompletionWithEvidence()

getEvidenceForParent()
getEvidenceDownload()

deleteEvidence()

promoteEvidenceToMemory()

getMemoryDownload()
deleteMemory()

cleanupExpiredEvidence()

Do not perform Supabase privileged Storage operations directly from the child client.

22. deleteEvidence() Rules

Server must validate:

Authenticated Parent
        ↓
Parent belongs to Family
        ↓
Evidence belongs to Family
        ↓
Evidence status == ACTIVE

Then:

Delete Storage object
        ↓
status = DELETED
deleted_at = NOW()
deletion_reason = PARENT_DELETED

If Storage object is already missing:

do not fail catastrophically

Update record appropriately and log the inconsistency.

23. getEvidenceDownload() Rules

Validate:

Parent authenticated
Family ownership valid
Evidence ACTIVE
Storage object exists

Then provide short-lived authorized download access.

Download must not:

change status
change expires_at
set keep_as_memory
create duplicate file in Supabase

It is read-only.

24. Promote to Memory

For:

❤️ Keep as Memory

server flow:

Validate Parent
       ↓
Validate ACTIVE Evidence
       ↓
Create Family Memory
       ↓
Copy/move media to family-memories
       ↓
Verify new media exists
       ↓
Update Evidence:

status = PROMOTED
memory_id = ...
promoted_to_memory_at = NOW()
       ↓
Delete temporary storage copy

Be careful about partial failures.

Do not delete temporary object until memory copy is confirmed.

25. Automatic 7-Day Cleanup

Daily cron:

/api/cron/cleanup-evidence

Query:

status = ACTIVE
AND expires_at <= NOW()

Process:

Delete Storage object
       ↓
status = EXPIRED
deleted_at = NOW()
deletion_reason = AUTO_EXPIRED

Never process:

PROMOTED
DELETED
EXPIRED

records again.

26. UI After Media Has Been Deleted

Task history should not show broken image/audio components.

Instead:

📚 English Speaking
15 Aug

✅ Completed
🪙 +6 ⭐ +3

🎤 Recording expired
Temporary recordings are kept for 7 days.

If parent deleted it:

🎤 Recording deleted

If promoted:

❤️ Saved to Family Memories
[ View Memory ]
27. Reflection Handling Remains Different

The 7-day/delete/download system primarily applies to:

📷 Photo
🎤 Audio

Text/choice reflections can remain with task history.

Example:

💡 Berry said:

"The dolphin is a mammal."

No significant Storage cost.

Parent may still be allowed to remove a text reflection later for privacy, but that can use ordinary database deletion/soft-deletion rather than Storage logic.

28. Updated Child Media Limits

Keep:

📷 Photos

Max dimension:
~1600 px

Compressed before upload

Target:
< 1 MB

Audio:

🎤 Audio

Default:
30 seconds

Absolute maximum:
60 seconds

Video:

❌ Not supported V1
29. Parent Media Management

Add under:

Settings
→ Privacy & Storage

Display:

📷 & 🎤 Completion Evidence

Evidence is automatically deleted
7 days after upload.

Current temporary storage:
18 items
12.4 MB

❤️ Family Memories:
8 items
9.1 MB

Possible actions:

[ View Temporary Evidence ]

[ View Family Memories ]

No retention selector needed.

Seven days remains the system policy.

30. Optional “Delete All Temporary Evidence”

I recommend adding this to Parent Settings:

🗑 Delete all temporary evidence

But require strong confirmation:

Delete all temporary photos and recordings?

Task completion records, Coins, Stars,
messages and Memories will NOT be deleted.

12 temporary files will be removed.

[ Cancel ]
[ Delete 12 Files ]

This is useful when the Supabase Free storage is getting full.

31. Do Not Add “Download” to Child UI in V1

I recommend:

Child:
Take / select / record
Preview
Replace
Remove before submit

Parent:

Download
Keep as Memory
Delete

This keeps file management simple and parent-controlled.

32. Updated Implementation Phases
Phase 1 — Reflection
REFLECTION_TEXT
REFLECTION_CHOICE
Phase 2 — Temporary Photo

Implement:

PHOTO_OPTIONAL
PHOTO_REQUIRED

Compression
Private Storage
expires_at = +7 days
Parent preview

⬇️ Download
🗑 Delete
Phase 3 — Temporary Audio

Implement:

AUDIO_SHORT

Recording
Playback
30-sec default
Private Storage
7-day expiration

⬇️ Download
🗑 Delete
Phase 4 — Family Memories

Implement:

❤️ Keep as Memory

Private family-memories bucket

⬇️ Download Memory
🗑 Delete Memory
Phase 5 — Cleanup

Implement:

Daily Vercel Cron

ACTIVE
+
expires_at <= NOW()

→ Storage delete
→ EXPIRED
Phase 6 — Storage Management

Implement:

Settings
→ Privacy & Storage

Temporary media usage
Memory usage

🗑 Delete all temporary evidence

Bulk download can wait.

33. Updated Full Acceptance Scenario

Coding AI should test this entire flow:

Parent creates:

🎤 English Speaking

Evidence:
Short Audio

Max:
30 sec

Parent approval:
Required

Berry records:

00:24

Berry:

▶ Listen
🔄 Record Again
✅ Submit

Server:

status = ACTIVE

created_at:
15 Aug

expires_at:
22 Aug

Parent opens it:

🎤 Berry — English Speaking

▶ 00:24

Auto-delete in 7 days

[ ⬇️ Save to device ]
[ ❤️ Keep as Memory ]
[ 🗑️ Delete ]

[ ❤️ Great speaking! ]
[ ✅ Approve ]
Scenario A — Download

Parent chooses:

⬇️ Save to device

File downloads to PC/mobile.

Server record remains:

ACTIVE
expires_at = Aug 22
Scenario B — Delete

Parent chooses:

🗑️ Delete

Result:

Storage file removed

status = DELETED
deleted_at = NOW()
deletion_reason = PARENT_DELETED

But:

Task completion ✅
Coins ✅
Stars ✅
Parent message ✅

remain.

Scenario C — Keep as Memory

Parent selects:

❤️ Keep as Memory

Result:

family_memories record created
media moved/copied safely

Evidence:
PROMOTED

Memory:
available indefinitely

Parent can later:

⬇️ Download Memory

or

🗑 Delete Memory
Scenario D — Parent does nothing

After Aug 22:

Cron
 ↓
delete temporary audio
 ↓
status = EXPIRED

Task history remains intact.

34. Final Media Policy

Tôi sẽ đưa rule này vào specification của BloomQuest:

BLOOMQUEST CHILD MEDIA POLICY

📷 Photos
Temporary
7 days maximum

🎤 Audio
Temporary
7 days maximum

⬇️ Save to Device
Available to Parent
Does NOT change expiration

❤️ Keep as Memory
Explicit Parent action
No automatic expiration

🗑 Delete
Parent can delete immediately

✏️ Text Reflection
May remain in activity history

🔐 All media
Private

🎥 Video
Not supported in V1

Thiết kế này cũng rất phù hợp với Supabase Free: evidence không tích tụ, bố/mẹ có thể download những gì muốn giữ về PC/mobile rồi xóa khỏi cloud, còn ❤️ Keep as Memory chỉ nên dành cho một số ít khoảnh khắc đặc biệt. Với cách này, bạn cũng không bị “lock-in” vào Storage của BloomQuest: dữ liệu gia đình luôn có đường để lấy ra và tự quản lý.