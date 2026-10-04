---
phase: 4
title: "Repeated-Forgetting Detection + Habit Support"
status: pending
priority: P1
effort: "4h"
dependencies: [1, 2]
---

# Phase 4: Repeated-Forgetting Detection + Habit Support

## Overview

Implement rule-based detection of repeated forgetting patterns and surface a habit support suggestion to the parent. If a child repeatedly forgets a responsibility, the parent sees a card suggesting they start habit building for that task — connecting to the existing habit system. The system never auto-punishes; it only suggests.

## Requirements

- Functional:
  - Detect when a child has multiple FORGOTTEN events for the same task within a configurable window (default: 3+ FORGOTTEN in last 7 relevant days)
  - Surface a suggestion card on the parent dashboard or approvals page
  - Suggestion says: "Berry may still need support with 'Prepare School Bag'. [Start Habit Support]"
  - "Start Habit Support" action transitions the task's `behavior_type` from `responsibility` to `habit_building` and creates a `child_task_reward_progress` entry at `full_reward` stage
  - Parent can dismiss the suggestion without acting
  - Never auto-change behavior_type without parent confirmation
  - Track reminder counts on events
- Non-functional:
  - Analysis runs on-demand when parent views dashboard/approvals (not a background job)
  - Suggestion threshold is a constant (not per-task configurable in V1)
  - Follow existing UI patterns (Card component, emerald/amber styling)
  - i18n: bilingual strings

## Architecture

### Forgetting Analysis Function

New helper in `lib/responsibility.ts`:

```typescript
interface ForgettingSummary {
  taskId: string;
  taskName: string;
  taskNameVi: string | null;
  childId: string;
  childName: string;
  independentCount: number;   // task_assignments approved without FORGOTTEN event
  forgottenCount: number;     // FORGOTTEN events in window
  neededHelpCount: number;    // NEEDED_HELP events in window
  totalRelevantDays: number;  // days with an assignment
  suggestHabitSupport: boolean;
}

async function getResponsibilitySummary(
  familyId: string,
  childId: string,
  windowDays: number = 7,
): Promise<ForgettingSummary[]>
```

This function:
1. Queries `responsibility_events` for the child in the last `windowDays` days
2. Groups by `task_id`
3. Counts FORGOTTEN, NEEDED_HELP, and independent completions
4. Flags `suggestHabitSupport = true` when `forgottenCount >= SUGGEST_THRESHOLD` (default 3)
5. Only considers tasks with `behavior_type = 'responsibility'` (not already habit_building)

### Habit Support Transition Action

New server action in `app/[locale]/(parent)/tasks/responsibility-actions.ts`:

```typescript
export async function startHabitSupport(formData: FormData) {
  const task_id = z.string().uuid().parse(formData.get("task_id"));
  const child_id = z.string().uuid().parse(formData.get("child_id"));
  const { supabase, familyId } = await requireFamily();

  // Verify task belongs to family and is responsibility type
  // Change behavior_type to habit_building
  // Create child_task_reward_progress entry at full_reward stage
  // Revalidate paths
}
```

### Reverse Transition: Habit Mastered -> Responsibility

When a habit_building task reaches `graduated` stage, the parent can convert it back to a responsibility:

```typescript
export async function makeResponsibility(formData: FormData) {
  const task_id = z.string().uuid().parse(formData.get("task_id"));
  const { supabase, familyId } = await requireFamily();
  
  // Set behavior_type = 'responsibility'
  // Optionally set responsibility_policy = 'REPAIR_REQUIRED'
  // Revalidate paths
}
```

### Parent Dashboard Integration

On the parent dashboard or approvals page, show suggestion cards:

```tsx
{suggestions.filter(s => s.suggestHabitSupport).map(s => (
  <Card className="border-amber-200 bg-amber-50/60">
    <div className="flex items-center gap-3">
      <span className="text-2xl">🌿</span>
      <div className="flex-1">
        <p className="text-sm text-stone-700">
          {t("parent.habitSuggestion", { child: s.childName, task: localName(s) })}
        </p>
      </div>
    </div>
    <div className="mt-2 flex gap-2">
      <form action={startHabitSupport}>
        <input type="hidden" name="task_id" value={s.taskId} />
        <input type="hidden" name="child_id" value={s.childId} />
        <Button size="sm" variant="primary">
          {t("parent.startHabitBuilding")}
        </Button>
      </form>
      <Button size="sm" variant="ghost" onClick={dismiss}>
        {t("parent.dismissSuggestion")}
      </Button>
    </div>
  </Card>
))}
```

### Reminder Count

Each FORGOTTEN event increments a `reminder_count`. The total reminder count per task per child per week can be shown in analytics (Phase 5). This serves as an independence signal:

```
Week 1: 5 reminders
Week 2: 3 reminders  
Week 3: 1 reminder
Week 4: independent 5/5
```

## Related Code Files

- Create: `lib/responsibility.ts` — `getResponsibilitySummary()`, `getOpenRepairItems()`, constants
- Modify: `app/[locale]/(parent)/tasks/responsibility-actions.ts` — add `startHabitSupport`, `makeResponsibility`
- Modify: `app/[locale]/(parent)/dashboard/page.tsx` or `approvals/page.tsx` — add suggestion cards
- Modify: `messages/en.json` — add habit suggestion strings
- Modify: `messages/vi.json` — add habit suggestion strings

## Implementation Steps

1. Create `lib/responsibility.ts` with:
   - `SUGGEST_THRESHOLD` constant (default 3)
   - `ANALYSIS_WINDOW_DAYS` constant (default 7)
   - `getResponsibilitySummary()` function
   - `getOpenRepairItems()` function (also used by Phase 3)
2. Add `startHabitSupport` server action:
   - Validate parent session and family scope
   - Update `tasks.behavior_type` from `responsibility` to `habit_building`
   - Upsert `child_task_reward_progress` with `reward_stage = 'full_reward'`
   - Revalidate paths
3. Add `makeResponsibility` server action for reverse transition
4. Add i18n strings:
   - `parent.habitSuggestion` — "It seems {child} may still need support with '{task}'."
   - `parent.startHabitBuilding` — "Start Habit Building"
   - `parent.dismissSuggestion` — "Dismiss"
   - `parent.makeResponsibility` — "Make This a Responsibility"
5. Integrate suggestion cards into parent dashboard
6. Test: create 3+ FORGOTTEN events for same task -> verify suggestion appears
7. Test: start habit support -> verify task changes to `habit_building` with `full_reward` stage
8. Test: verify suggestion disappears after task is converted

## Success Criteria

- [ ] `getResponsibilitySummary()` correctly counts FORGOTTEN events per task
- [ ] Suggestion appears when threshold reached (3+ FORGOTTEN in 7 days)
- [ ] Suggestion does NOT appear for tasks already in `habit_building` mode
- [ ] `startHabitSupport` transitions task from `responsibility` to `habit_building`
- [ ] `child_task_reward_progress` entry created at `full_reward` stage
- [ ] `makeResponsibility` transitions back when habit is mastered
- [ ] Parent can dismiss suggestion without acting
- [ ] System never auto-changes behavior_type
- [ ] All strings bilingual
- [ ] No punishment or penalty logic triggered

## Risk Assessment

- **Risk**: Changing `behavior_type` on a shared task (multiple children) affects all children. **Mitigation**: `behavior_type` is per-task, and each child has their own `child_task_reward_progress`. The transition should note that the task is now habit_building for ALL assigned children. If per-child behavior is needed later, add a per-child override table. For V1, document this limitation clearly in the UI ("This will change the task type for all children").
- **Risk**: Parent might not see suggestions if they don't visit dashboard regularly. **Mitigation**: This is acceptable for V1. Future: add push notifications or email digest.
- **Risk**: Threshold of 3 may be too aggressive for some tasks. **Mitigation**: Use constant that's easy to adjust. V2 could make this configurable per task.
- **Risk**: The `startHabitSupport` action changes `behavior_type` but doesn't set `coin_reward`/`star_reward` if they were 0 (responsibilities default to 0). The habit_building flow expects rewards to fade from `full_reward`. If rewards are 0, the fading stages are meaningless. **Mitigation**: When transitioning to `habit_building`, also set reasonable default rewards (e.g., `coin_reward = 5, star_reward = 1`) if they are currently 0. Alternatively, the parent should be prompted to set rewards as part of the transition.
- **Risk**: The `dismiss` action for suggestions is shown as a client-side `onClick` in a server component context. **Mitigation**: Either use a client component wrapper for the dismiss button, or implement dismiss as a server action that sets a "dismissed suggestion" flag (e.g., in a simple dismissed_suggestions table or localStorage).
