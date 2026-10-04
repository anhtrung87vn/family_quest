---
phase: 6
title: "System Template Defaults + i18n"
status: pending
priority: P2
effort: "2h"
dependencies: [1]
---

# Phase 6: System Template Defaults + i18n

## Overview

Update system quest templates with appropriate `responsibility_policy` defaults and add all bilingual (en/vi) translations for the responsibility/repair feature. Ensure the System Quest Curriculum templates get correct default policies when cloned to families.

## Requirements

- Functional:
  - System responsibility templates get `responsibility_policy = 'REPAIR_REQUIRED'` by default
  - System homework/school templates get `responsibility_policy = 'COMPLETE_BEFORE_PRIVILEGE'`
  - Character/family templates get `responsibility_policy = 'NONE'` or `'PARENT_DECIDES'`
  - Challenge templates keep `responsibility_policy = 'NONE'`
  - All new i18n strings added to both `messages/en.json` and `messages/vi.json`
  - `cloneSystemTemplates()` copies `responsibility_policy` to family tasks
  - Parent task form shows responsibility_policy selector when `behavior_type = 'responsibility'`
- Non-functional:
  - Only update `is_system_template = true` rows
  - Do NOT modify existing family tasks
  - Migration is idempotent

## Architecture

### Template Policy Mapping

| Template | behavior_type | responsibility_policy |
|----------|---------------|----------------------|
| Make My Bed | responsibility | REPAIR_REQUIRED |
| Put Away Belongings | responsibility | REPAIR_REQUIRED |
| Clear My Plate | responsibility | REPAIR_REQUIRED |
| Put Dirty Clothes Away | responsibility | REPAIR_REQUIRED |
| Brush Teeth | responsibility | REPAIR_REQUIRED |
| Take Care of Plants | responsibility | REPAIR_REQUIRED |
| Prepare School Bag | habit_building | NONE |
| Finish Homework | habit_building | COMPLETE_BEFORE_PRIVILEGE |
| Keep Desk Organized | habit_building | NONE |
| Screen Time Self-Control | habit_building | COMPLETE_BEFORE_PRIVILEGE |
| Help Someone | character | NONE |
| Do a Kind Act | character | NONE |
| Help Sister | character | PARENT_DECIDES |
| Read 20 Minutes | challenge | NONE |
| (all challenges) | challenge | NONE |

### Migration Update

In `supabase/migrations/0029_responsibility_events.sql` (same migration as Phase 1, or a separate 0030):

```sql
-- Set responsibility_policy for system responsibility templates
UPDATE tasks SET responsibility_policy = 'REPAIR_REQUIRED'
  WHERE is_system_template = true
    AND behavior_type = 'responsibility';

-- Homework-type habit_building templates
UPDATE tasks SET responsibility_policy = 'COMPLETE_BEFORE_PRIVILEGE'
  WHERE is_system_template = true
    AND name IN ('Finish Homework', 'Screen Time Self-Control');
```

### Clone Template Update

Modify `cloneSystemTemplates()` in `app/[locale]/(parent)/tasks/actions.ts` to include `responsibility_policy` in the SELECT field list.

### Parent Task Form Enhancement

When `behavior_type = 'responsibility'`, show a select/radio for `responsibility_policy`:

```
When this responsibility is missed:
● Ask child to complete it (REPAIR_REQUIRED)
○ Complete before selected privilege (COMPLETE_BEFORE_PRIVILEGE)
○ Parent decides each time (PARENT_DECIDES)
○ No follow-up (NONE)
```

Do NOT show coin penalty inputs.

### i18n Strings

All new strings organized by feature area:

**Parent - Responsibility handling:**
- `parent.handleMissed` / `parent.whatHappened`
- `parent.reasonForgot` / `parent.reasonNeededHelp` / etc.
- `parent.responsibilityHandled`
- `parent.habitSuggestion` / `parent.startHabitBuilding`
- `parent.makeResponsibility` / `parent.dismissSuggestion`

**Parent - Task form:**
- `parent.responsibilityPolicy` — "When this responsibility is missed"
- `parent.policyRepairRequired` — "Ask child to complete it"
- `parent.policyCompleteBeforePrivilege` — "Complete before privilege"
- `parent.policyParentDecides` — "Parent decides each time"
- `parent.policyNone` — "No follow-up"

**Parent - Independence dashboard:**
- `parent.growingIndependence` / `parent.independentDays`
- `parent.remindersThisWeek` / `parent.repairsCompleted`
- `parent.fewerReminders` / `parent.moreReminders` / `parent.sameReminders`
- `parent.mayNeedSupport` / `parent.daysIndependent`
- `parent.habitsGraduated`

**Child - Repair:**
- `child.repairSection` — "Things to fix" / "Viec can sua lai"
- `child.repairPrompt` — "Let's finish this one" / "Minh hoan thanh nhe"
- `child.repairDone` — "Done!" / "Xong roi!"
- `child.repairResolved` — "Fixed! Good job." / "Da sua xong."

## Related Code Files

- Modify: `supabase/migrations/0029_responsibility_events.sql` — add template backfill
- Modify: `app/[locale]/(parent)/tasks/actions.ts` — add `responsibility_policy` to clone SELECT, add to `createTask` and `updateTask` schemas
- Modify: `app/[locale]/(parent)/tasks/TaskList.tsx` or form component — add responsibility_policy selector
- Modify: `messages/en.json` — all new strings
- Modify: `messages/vi.json` — all new strings

## Implementation Steps

1. Add template backfill SQL to the migration (Phase 1 migration file)
2. Update `cloneSystemTemplates()` SELECT to include `responsibility_policy`
3. Update `resetAndRecloneTasks()` SELECT to include `responsibility_policy`
4. Add `responsibility_policy` to `createTaskSchema` and `updateTaskSchema`
5. Add responsibility_policy selector to parent task form (conditional on behavior_type)
6. Add ALL i18n strings to `messages/en.json`
7. Add ALL i18n strings to `messages/vi.json`
8. Verify clone creates tasks with correct policy
9. Verify form shows/hides policy selector based on behavior_type

## Success Criteria

- [ ] System responsibility templates have `REPAIR_REQUIRED` policy
- [ ] Homework templates have `COMPLETE_BEFORE_PRIVILEGE` policy
- [ ] Challenge/character templates keep `NONE` policy
- [ ] Clone copies `responsibility_policy` to new family tasks
- [ ] Parent task form shows policy selector for responsibility tasks
- [ ] All i18n strings present in both en.json and vi.json
- [ ] No existing family tasks modified by migration
- [ ] Task create/update forms accept responsibility_policy field

## Risk Assessment

- **Risk**: Missing translation strings cause runtime errors. **Mitigation**: Use `t()` with fallback keys; test both locales manually. Add a CI step to verify all keys exist in both locale files.
- **Risk**: Clone query change could break if column doesn't exist yet (migration not run). **Mitigation**: `responsibility_policy` has a DEFAULT in the column definition, so SELECT will always return a value. Clone happens after migration.
