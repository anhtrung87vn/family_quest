---
title: "Responsibility, Repair & Logical Consequence System"
description: "Add a responsibility-and-repair layer to BloomQuest so the app distinguishes between forgotten responsibilities, needed help, excused absences, and intentional refusal — with repair flows, habit support suggestions, and growing-independence analytics — without introducing a punishment economy."
status: pending
priority: P1
effort: "2-3 weeks"
tags: [responsibility, repair, consequences, habit-support, independence, no-penalty]
created: 2026-08-17
blockedBy: []
blocks: []
---

# Responsibility, Repair & Logical Consequence System

## Overview

BloomQuest already supports rewards, tasks, habits, parent approval, Quest Coins, Stars, Choice Quests, and family encouragement. The missing capability is a structured way to handle situations when a child forgets a responsibility, needs help, or intentionally refuses an agreed task — **without introducing a penalty economy**.

This plan implements a five-level response model: normal mistakes, forgotten responsibilities with repair, repeated forgetting with habit support suggestions, intentional refusal with parent-selected logical consequences, and serious behavior handled outside the app.

**Source document**: `docs/BloomQuest_Responsibility_Repair_Implementation_Plan.md`

**Core invariants (never violated):**
- Quest Coins are never deducted as punishment
- Stars are never removed as punishment
- Past achievement is preserved
- The system never auto-punishes — parent is always the decision-maker
- Child-facing language is supportive, not shaming

## Codebase Analysis

### What exists today
- `tasks` table with `behavior_type` column (`responsibility`, `habit_building`, `challenge`, `character`, `family`) — migration 0015
- `child_task_reward_progress` table with habit fading stages (`full_reward` -> `reduced_reward` -> `stars_only` -> `graduated`) — migration 0015
- `task_assignments` with statuses: `todo`, `submitted`, `approved`, `rejected`, `expired`
- `task_completions` with statuses: `submitted`, `approved`, `rejected`
- `award_task()` and `auto_award_task()` Postgres functions already handle `responsibility` behavior_type by defaulting to `graduated` stage (0 coins, 0 stars)
- Child home already groups tasks by `behavior_type` with separate sections: Responsibilities, Habit Building, Core Quests, Character/Family
- Streak system with grace-day logic in `lib/streaks.ts`
- Soft-delete pattern for tasks (`active: false`)
- Parent approval workflow in `approvals/actions.ts`
- Bilingual support (en/vi) via `name_vi`/`description_vi` + `next-intl`
- System quest templates with `is_system_template = true`
- RLS enforced on all tables via `auth_family_id()`

### What does NOT exist yet
- **No `responsibility_policy` field** on tasks — no way to configure what happens when a responsibility is missed
- **No `responsibility_events` table** — no tracking of forgotten/excused/refused events
- **No repair UX** — child cannot see or resolve open repair items
- **No parent missed-responsibility action** — parent cannot classify why a task was missed
- **No repeated-forgetting detection** — no analysis of forgetting patterns
- **No habit support suggestion** — no path from repeated forgetting to habit building
- **No growing-independence analytics** — no tracking of independent completions vs reminders
- **No privilege rule support** — no "complete before privilege" mechanism

### Key constraints
- Never rewrite applied production migrations (0001-0028)
- Family-created tasks must not be reclassified
- System templates use `family_id = '00000000-0000-0000-0000-000000000000'`
- Server-side validation + RLS must remain enforced
- Child is NOT an `auth.user` — uses HMAC-signed cookie session; actions use `createAdminClient()` scoped by `session.childId`
- No penalty fields, no coin/star deductions for discipline
- Bilingual (en/vi) for all user-facing text
- No sibling comparison or ranking

### Cross-plan dependencies
- **System Quest Curriculum** (`260817-1509-system-quest-curriculum`): That plan adds `skill_domain`, `parent_tip`, `independence_level`, and other curriculum columns to `tasks`. This plan's `responsibility_policy` column must coexist. The curriculum plan also updates system templates — this plan will add `responsibility_policy` defaults to responsibility templates. These plans are independent and do not block each other, but migration numbering must be coordinated.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Add `responsibility_policy` to tasks table | P1 |
| 2 | Create `responsibility_events` table with RLS | P1 |
| 3 | Parent can classify missed responsibility (Forgot/Needed Help/Excused/Refused) | P1 |
| 4 | Child sees repair items and can resolve them (no reward) | P1 |
| 5 | Repeated-forgetting detection with habit support suggestion | P1 |
| 6 | Growing Independence parent dashboard | P2 |
| 7 | Logical consequence support (COMPLETE_BEFORE_PRIVILEGE display) | P3 |

## Phases

| # | Phase | Status | Priority | Effort | Dependencies |
|---|-------|--------|----------|--------|--------------|
| 1 | [Phase 1: Schema — responsibility_policy + responsibility_events](./phase-01-schema.md) | Pending | P1 | 3h | — |
| 2 | [Phase 2: Parent Missed-Responsibility Actions](./phase-02-parent-actions.md) | Pending | P1 | 4h | 1 |
| 3 | [Phase 3: Child Repair UX](./phase-03-child-repair-ux.md) | Pending | P1 | 5h | 1, 2 |
| 4 | [Phase 4: Repeated-Forgetting Detection + Habit Support](./phase-04-habit-support.md) | Pending | P1 | 4h | 1, 2 |
| 5 | [Phase 5: Growing Independence Dashboard](./phase-05-independence-dashboard.md) | Pending | P2 | 4h | 1, 2, 3 |
| 6 | [Phase 6: System Template Defaults + i18n](./phase-06-templates-i18n.md) | Pending | P2 | 2h | 1 |
| 7 | [Phase 7: Testing + Regression](./phase-07-testing.md) | Pending | P1 | 4h | 1-6 |

## Success Criteria

- [ ] Responsibilities can exist with zero Coins/Stars and have a `responsibility_policy`
- [ ] Parent can classify a missed responsibility as Forgot / Needed Help / Excused / Refused
- [ ] Forgotten responsibilities create repair items visible to the child
- [ ] Child can complete repair without earning or losing Coins/Stars
- [ ] Repair actions are idempotent (double-tap safe)
- [ ] Repeated forgetting generates a habit support suggestion for the parent
- [ ] Parent controls any intentional-refusal consequence
- [ ] No punishment economy exists — no penalty fields, no coin/star deductions for discipline
- [ ] Earned Coins are never removed by discipline events
- [ ] Stars are never removed as punishment
- [ ] Parent can see independence/reminder trends per child (without sibling ranking)
- [ ] Child does not see a failure ledger — only sees actionable repair items
- [ ] Existing BloomQuest task/reward/evidence/approval/quest flows remain functional
- [ ] Bilingual (en/vi) support for all new strings
- [ ] RLS enforced on `responsibility_events` table
- [ ] All new server actions validate sessions and family scope

## Architecture Decision: Separate Event Table

Responsibility events are stored in a new `responsibility_events` table, **not** overloaded onto `coin_transactions` or `star_transactions`. This keeps the coin/star ledger clean (append-only reward/redemption only) and allows responsibility tracking to have its own lifecycle (OPEN -> RESOLVED/CANCELLED) without polluting the existing approval flow.

## Red-Team Review Findings

Issues identified and addressed in phase files:

1. **Dedup risk**: No unique constraint on `responsibility_events` for child+task+date — handled via server-side dedup check (Phase 2), not DB constraint, since same-day duplicates are legitimate for multi-occurrence tasks.
2. **Habit transition reward gap**: Converting a responsibility (0 coins) to `habit_building` makes fading stages meaningless. Phase 4 updated to prompt parent to set rewards during transition.
3. **Approvals page query gap**: Current approvals page only shows `submitted` completions. Phase 2 needs a new query for expired/missed responsibility assignments — documented.
4. **Shared task mutation**: `startHabitSupport` changes `behavior_type` for all children. Phase 4 documents this limitation with a clear UI warning.
5. **Soft-delete task edge case**: If task is deactivated after event creation, repair card JOIN returns null. Phase 3 uses LEFT JOIN with graceful fallback.
6. **Vietnamese diacritics**: Phase 2/6 i18n examples updated to use proper Vietnamese with diacritics.
7. **Dismiss button pattern**: Phase 4 dismiss suggestion is a client-side action in server component — needs client wrapper or server action.
8. **Streak interaction**: The spec (section 24) requires EXCUSED events to not break streaks. Existing streak system in `lib/streaks.ts` has grace-day logic but no integration with responsibility events. This is acceptable for V1 — EXCUSED events don't affect the streak system because they're a separate tracking system. Future: add EXCUSED-aware grace days.
9. **Logging/audit (spec section 47)**: The spec calls for server-side logging of event lifecycle changes. This is handled by existing `console.error("[context]")` patterns in server actions. No separate audit table is needed for V1 — the `responsibility_events` table itself IS the audit trail (with `created_at`, `updated_at`, `resolved_at` timestamps). `console.error` logging in catch blocks follows existing project patterns.

## Open Questions

None — the source document is comprehensive and prescriptive. The only deferred item is the full privilege-rule engine (Phase 2 / optional in the source doc). The streak-excused integration is documented as a future enhancement above.

<!-- slug: responsibility-repair -->
