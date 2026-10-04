---
phase: 2
title: "Parent Missed-Responsibility Actions"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Parent Missed-Responsibility Actions

## Overview

Enable parents to classify why a responsibility was missed — Forgot, Needed Help, Not Applicable, Refused, or Skip — and create the corresponding `responsibility_event`. This is the primary parent interaction point for the repair system.

## Requirements

- Functional:
  - Parent can handle a missed responsibility from the approvals/dashboard page
  - Classification options: Forgot, Needed Help, Not Applicable, Refused, Skip
  - Each classification maps to an `event_type` and creates (or skips) a `responsibility_event`
  - `FORGOTTEN` with `REPAIR_REQUIRED` policy creates an OPEN repair item
  - `EXCUSED` creates no repair requirement (RESOLVED immediately or CANCELLED)
  - `REFUSED` prompts parent for logical consequence guidance
  - `NEEDED_HELP` creates an OPEN event with note about what help is needed
  - No Coin/Star penalty is ever generated
  - Parent can add a note to any classification
  - Validation: parent session, family scope, task belongs to family, task is responsibility type
- Non-functional:
  - Follow existing server action patterns (`"use server"`, Zod validation, `resolveContext()`)
  - Revalidate relevant paths after mutation
  - i18n: all UI strings in both `en.json` and `vi.json`

## Architecture

### Server Actions

New file: `app/[locale]/(parent)/tasks/responsibility-actions.ts`

Following the existing pattern from `tasks/actions.ts`:

```typescript
"use server";
import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { resolveContext } from "@/lib/dev-family";
import { createAdminClient } from "@/lib/supabase/admin";

const requireFamily = resolveContext;

// Schema for handling a missed responsibility
const handleMissedSchema = z.object({
  task_id: z.string().uuid(),
  child_id: z.string().uuid(),
  task_assignment_id: z.string().uuid().optional().nullable(),
  reason: z.enum(["forgot", "needed_help", "excused", "refused", "skip"]),
  parent_note: z.string().max(500).optional().nullable(),
});
```

### Action: `handleMissedResponsibility`

1. Parse + validate input with Zod
2. Resolve auth context (`resolveContext()`)
3. Verify task belongs to family and is `behavior_type = 'responsibility'`
4. Verify child belongs to family
5. Map reason to `event_type`:
   - `forgot` -> `FORGOTTEN`, status `OPEN`
   - `needed_help` -> `NEEDED_HELP`, status `OPEN`
   - `excused` -> `EXCUSED`, status `RESOLVED` (no repair needed)
   - `refused` -> `REFUSED`, status `OPEN`
   - `skip` -> no event created (or `EXCUSED` with CANCELLED)
6. Insert into `responsibility_events` (use admin client for child-scoped data)
7. **Never** insert into `coin_transactions` or `star_transactions`
8. Revalidate paths

### Parent UX Flow

On the parent dashboard or task detail, when a responsibility task is unfinished:

```
[ 🌱 Handle missed responsibility ]
      ↓
Modal/sheet with options:
  ○ Forgot (Quên)
  ○ Needed help (Cần hỗ trợ)  
  ○ Not applicable today (Không phù hợp hôm nay)
  ○ Refused (Không chịu làm)
  ○ Skip this time (Bỏ qua lần này)

Optional: [Parent note textarea]

[ Submit ]
```

This can be rendered as a simple form with radio buttons inside a Card component, following existing BloomQuest UI patterns.

### Integration Points

The "Handle missed responsibility" button should appear:
1. On the **parent dashboard** next to unfinished responsibility tasks (tasks with `behavior_type = 'responsibility'` and today's assignment status = `todo` or `expired`)
2. On the **approvals page** as an alternative to approve/reject for responsibility tasks
3. Optionally on the **task detail** page

For V1, integrate into the **approvals page** since parents already check it daily. The dashboard integration can follow.

## Related Code Files

- Create: `app/[locale]/(parent)/tasks/responsibility-actions.ts`
- Modify: `app/[locale]/(parent)/approvals/page.tsx` — add "Handle missed" button for responsibility tasks
- Modify: `messages/en.json` — add parent responsibility UI strings
- Modify: `messages/vi.json` — add parent responsibility UI strings

## Implementation Steps

1. Create `responsibility-actions.ts` with `handleMissedResponsibility` server action
2. Add `getOpenResponsibilityEvents(childId)` helper to fetch open events for a child
3. Add i18n strings for parent responsibility UI in both `en.json` and `vi.json`:
   - `parent.handleMissed` — button label
   - `parent.whatHappened` — "What happened?"
   - `parent.reasonForgot` — "Forgot"
   - `parent.reasonNeededHelp` — "Needed help"
   - `parent.reasonExcused` — "Not applicable today"
   - `parent.reasonRefused` — "Refused"
   - `parent.reasonSkip` — "Skip this time"
   - `parent.parentNote` — "Note (optional)"
   - `parent.handleSubmit` — "Submit"
   - `parent.responsibilityHandled` — confirmation message
4. Modify approvals page to show a "Handle missed responsibility" action for unfinished responsibility tasks
5. Create a `MissedResponsibilityForm` client component with radio buttons + optional note + submit
6. Wire form submission to the server action
7. Test: create a responsibility task, leave it unfinished, classify as forgotten -> verify event created, no coin/star change

## Success Criteria

- [ ] Parent can classify a missed responsibility from the approvals page
- [ ] All 5 classification options work correctly
- [ ] `FORGOTTEN` creates an OPEN event (repair item)
- [ ] `EXCUSED` creates a RESOLVED/CANCELLED event (no repair)
- [ ] `REFUSED` creates an OPEN event with guidance display
- [ ] No `coin_transactions` or `star_transactions` rows created
- [ ] Parent note is saved when provided
- [ ] Family scope validated — parent cannot create events for other families
- [ ] Task is verified as `behavior_type = 'responsibility'` before allowing classification
- [ ] Strings are bilingual (en/vi)
- [ ] Path revalidation works correctly

## Risk Assessment

- **Risk**: Parents might not check the approvals page for missed responsibilities. **Mitigation**: V1 focuses on approvals page; add dashboard integration in a follow-up if adoption is low. The daily cron that generates assignments already surfaces expired tasks.
- **Risk**: Multiple parents in same family could classify the same missed task. **Mitigation**: Check if an event already exists for this task+child+date before creating. If exists, update rather than duplicate. The `occurred_at` date can serve as a natural dedup key.
- **Risk**: The action allows classifying ANY task as a missed responsibility, but should only work for `behavior_type = 'responsibility'` or `'habit_building'`. **Mitigation**: Validate `behavior_type` in the server action — reject with a clear error if the task is a challenge/character type.
- **Risk**: Action uses `resolveContext()` (parent session) but inserts into `responsibility_events` which tracks child data. The admin client is needed for cross-child writes. **Mitigation**: Use `createAdminClient()` for the INSERT (same pattern as `approveCompletion` in approvals/actions.ts), but validate parent session via `resolveContext()` first.
- **Risk**: `handleMissedResponsibility` doesn't specify how to surface unfinished responsibility tasks. The approvals page currently only shows `submitted` completions. **Mitigation**: The page must also query `task_assignments` with `status = 'todo'` and `due_date < today` for responsibility tasks to show "missed" items. This is a new query pattern for that page.
- **Risk**: Vietnamese diacritics missing in the wording examples. **Mitigation**: Use proper Vietnamese with diacritics in `vi.json`: "Quên", "Cần hỗ trợ", "Không phù hợp hôm nay", "Không chịu làm", "Bỏ qua lần này".
