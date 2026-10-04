---
phase: 3
title: "Child Repair UX"
status: pending
priority: P1
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Child Repair UX

## Overview

Add a "Repair" section to the child home page showing open responsibility events that need resolution. The child can mark a repair as done with a simple tap. No coins, no stars, no confetti — just a quiet positive acknowledgment.

## Requirements

- Functional:
  - Child home shows a "Repair" section when open FORGOTTEN or NEEDED_HELP events exist
  - Section title: "🌱 VIEC CAN SUA LAI" (vi) / "Things to fix" (en)
  - Each repair item shows the task name and a gentle prompt
  - Child taps "Done" to resolve the repair
  - Resolution is idempotent (double-tap returns current state, no error)
  - No Coin reward on repair
  - No Star reward on repair
  - No confetti animation on repair (no `confetti` cookie set)
  - A small positive acknowledgment: "Done! Good job fixing it." / "Da sua xong."
  - Repair items are validated: child can only resolve own events, event must be OPEN
  - REFUSED events are NOT shown as repair items to the child (parent handles those)
  - EXCUSED events are never shown (already resolved)
- Non-functional:
  - Follow existing child home page patterns (server component with admin client)
  - Repair section appears between Responsibilities and Core Quests sections
  - Use emerald/green color scheme consistent with responsibility section
  - No shame language — use supportive wording
  - i18n: all strings in both en.json and vi.json

## Architecture

### Data Flow

```
Child Home (server component)
  ↓ createAdminClient()
  ↓ SELECT from responsibility_events WHERE child_id = session.childId AND status = 'OPEN' AND event_type IN ('FORGOTTEN', 'NEEDED_HELP')
  ↓ JOIN tasks to get task name
  ↓ Render repair cards
  ↓
Child taps "Done"
  ↓ resolveRepairAction(formData) — server action
  ↓ Validate: child session, event belongs to child, event is OPEN
  ↓ UPDATE responsibility_events SET status = 'RESOLVED', resolved_at = now()
  ↓ DO NOT insert coin_transactions or star_transactions
  ↓ Revalidate paths
```

### Server Action: `resolveRepairAction`

Added to `app/[locale]/child/(app)/actions.ts`:

```typescript
export async function resolveRepairAction(formData: FormData) {
  const event_id = z.string().uuid().parse(formData.get("event_id"));
  const session = await getChildSession();
  if (!session) throw new Error("No child session");

  const admin = createAdminClient();

  // Fetch event and validate ownership
  const { data: event } = await admin
    .from("responsibility_events")
    .select("id, child_id, status, event_type")
    .eq("id", event_id)
    .single();

  if (!event) throw new Error("Event not found");
  if (event.child_id !== session.childId) throw new Error("Not your event");
  
  // Idempotent: if already resolved, return silently
  if (event.status === "RESOLVED") return;
  if (event.status !== "OPEN") throw new Error("Event not open");

  // Only allow child to resolve FORGOTTEN and NEEDED_HELP events
  if (!["FORGOTTEN", "NEEDED_HELP"].includes(event.event_type)) {
    throw new Error("Cannot resolve this event type");
  }

  await admin
    .from("responsibility_events")
    .update({
      status: "RESOLVED",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", event_id);

  // NO coin/star transactions
  // NO confetti cookie
  // NO streak recording (repair is not a quest completion)

  revalidatePath("/[locale]/child/(app)/home", "page");
}
```

### Child Home Integration

In `app/[locale]/child/(app)/home/page.tsx`, after the Responsibilities section:

```tsx
{/* 🌱 Repair — only when open items exist */}
{repairItems.length > 0 && (
  <section>
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-emerald-700">
      🌱 {t("child.repairSection")}
    </h2>
    <ul className="space-y-2">
      {repairItems.map((item) => (
        <li key={item.id}>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-lg shrink-0">{taskStyle(item.task?.category).icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 truncate">{localName(item.task)}</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {t("child.repairPrompt")}
                </div>
              </div>
            </div>
            <form action={resolveRepairAction} className="mt-2">
              <input type="hidden" name="event_id" value={item.id} />
              <Button type="submit" size="sm" className="w-full">
                {t("child.repairDone")}
              </Button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  </section>
)}
```

### UX Wording

| Key | English | Vietnamese |
|-----|---------|------------|
| `child.repairSection` | Things to fix | Viec can sua lai |
| `child.repairPrompt` | Let's finish this one | Minh hoan thanh nhe |
| `child.repairDone` | Done! | Xong roi! |
| `child.repairResolved` | Fixed! Good job. | Da sua xong. |

**Never use**: Failed, Violation, Penalty, Bad behavior, Punishment, You lost.

### Celebration Policy

- Repair resolution: quiet positive feedback (`"Fixed!"` + checkmark)
- No confetti (reserved for reward quests)
- No coins/stars displayed
- Parent can still send a supportive message after repair via existing parent_messages system

## Related Code Files

- Modify: `app/[locale]/child/(app)/home/page.tsx` — add repair section + data fetch
- Modify: `app/[locale]/child/(app)/actions.ts` — add `resolveRepairAction`
- Modify: `messages/en.json` — add child repair UI strings
- Modify: `messages/vi.json` — add child repair UI strings

## Implementation Steps

1. Add repair-related i18n strings to both `en.json` and `vi.json`
2. Add `resolveRepairAction` server action to child `actions.ts`
3. In child home page, add data fetch for open repair items:
   - Query `responsibility_events` WHERE `child_id = session.childId` AND `status = 'OPEN'` AND `event_type IN ('FORGOTTEN', 'NEEDED_HELP')`
   - JOIN tasks to get task name, category, name_vi
4. Add repair section UI between Responsibilities and Core Quests
5. Wire the "Done" button to `resolveRepairAction`
6. Style with emerald theme, matching existing responsibility card style
7. Test idempotency: tap "Done" twice, verify no error and event stays RESOLVED
8. Test authorization: verify child A cannot resolve child B's events
9. Test no-reward: verify no `coin_transactions` or `star_transactions` created on repair
10. Test visibility: verify REFUSED and EXCUSED events are NOT shown to child

## Success Criteria

- [ ] Repair section appears on child home when open FORGOTTEN/NEEDED_HELP events exist
- [ ] Repair section is hidden when no open events exist
- [ ] Child can tap "Done" to resolve a repair item
- [ ] Resolution is idempotent (double-tap safe)
- [ ] No Coin reward generated
- [ ] No Star reward generated
- [ ] No confetti animation
- [ ] Positive, supportive wording used (no shame language)
- [ ] REFUSED events NOT shown to child
- [ ] EXCUSED events NOT shown to child
- [ ] Child A cannot resolve child B's events
- [ ] Bilingual strings in en/vi
- [ ] Repair section positioned correctly in child home layout

## Risk Assessment

- **Risk**: Repair items could pile up if child ignores them. **Mitigation**: The section is visually prominent but not blocking. Parent can cancel stale events. Future: add a "stale event" cleanup cron or parent notification after X days.
- **Risk**: Task may have been soft-deleted between event creation and child viewing repair. **Mitigation**: JOIN with `tasks` table — if task not found or inactive, still show the event with a generic label. The event itself carries enough context.
- **Risk**: Child home page already has many sections and is long. **Mitigation**: Repair section only appears when events exist (conditional render). It uses compact cards similar to responsibilities, not taking excessive space.
- **Risk**: The `resolveRepairAction` uses `createAdminClient()` inline import pattern inconsistently — some child actions import at top level, others inline. **Mitigation**: Follow the existing pattern in child `actions.ts` — import `createAdminClient` inline via `await import("@/lib/supabase/admin")` for consistency with `claimChoiceQuestAction` and `requestRewardAction`.
- **Risk**: Repair items have no date context — child sees "Put dirty clothes away" but doesn't know when this was missed. **Mitigation**: Add the `occurred_at` date to the repair card UI as a subtle timestamp (e.g., "Yesterday" or "Aug 15"). This helps when multiple repair items exist.
- **Risk**: The repair query uses a JOIN to `tasks` table, but tasks uses soft-delete. If the task is deactivated after the event is created, the JOIN may return null. **Mitigation**: Use a LEFT JOIN or handle null task gracefully — show the event with a generic label like "Responsibility" if the task is not found.
