---
phase: 5
title: "Growing Independence Dashboard"
status: pending
priority: P2
effort: "4h"
dependencies: [1, 2, 3]
---

# Phase 5: Growing Independence Dashboard

## Overview

Add a "Growing Independence" section to the parent stats page showing per-child independence trends — how many days the child completed responsibilities independently vs. with reminders, plus repair completion stats and habit graduation progress. This is NOT a performance score or sibling comparison; it's a supportive progress view.

## Requirements

- Functional:
  - Show per-child independence metrics:
    - Independent completions (responsibility tasks completed without FORGOTTEN events)
    - Reminder count trend (decreasing = good)
    - Repairs completed
    - Areas needing more support (tasks with highest FORGOTTEN count)
    - Habits graduated
  - Trends shown as "this week" vs. simple directional indicators (up/down/same)
  - NO sibling ranking or comparison
  - NO "bad behavior score" or "obedience score"
  - NO percentages comparing children
  - Phrasing: "may need more support" not "is bad at"
  - Accessible from parent stats page
- Non-functional:
  - Server component (data fetched server-side)
  - Reuse existing Card, ProgressBar components
  - Follow existing stats page patterns
  - i18n: bilingual strings

## Architecture

### Data Queries

```typescript
// lib/responsibility.ts
async function getIndependenceTrend(
  familyId: string,
  childId: string,
  windowDays: number = 7,
): Promise<IndependenceTrend>

interface IndependenceTrend {
  childId: string;
  childName: string;
  totalResponsibilityAssignments: number;  // in window
  independentCompletions: number;           // completed without FORGOTTEN event
  forgottenCount: number;                  // FORGOTTEN events in window
  repairsCompleted: number;                // RESOLVED events in window
  remindersThisWeek: number;               // REMINDER events in window
  remindersPrevWeek: number;               // for trend comparison
  habitsGraduated: number;                 // lifetime count
  topNeedSupport: {                        // top 3 tasks with most FORGOTTEN
    taskName: string;
    taskNameVi: string | null;
    forgottenCount: number;
    independentDays: number;
    totalDays: number;
  }[];
}
```

### Queries

1. **Independent completions**: Count task_assignments with `status = 'approved'` for tasks with `behavior_type = 'responsibility'` in the window, WHERE no FORGOTTEN event exists for the same child+task+date.

2. **Forgotten count**: Count FORGOTTEN events in window.

3. **Repairs completed**: Count RESOLVED events in window.

4. **Reminder trend**: Compare REMINDER event count this week vs. last week.

5. **Top need-support**: Group FORGOTTEN events by task, order by count DESC, limit 3.

6. **Habits graduated**: Count `child_task_reward_progress` rows with `reward_stage = 'graduated'`.

### Parent Stats Page Integration

Add a new section to `app/[locale]/(parent)/stats/page.tsx` or create a sub-page `app/[locale]/(parent)/stats/independence/page.tsx` linked from the main stats page.

```tsx
<section>
  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-emerald-700">
    🌱 {t("parent.growingIndependence")}
  </h2>
  
  {children.map(child => {
    const trend = independenceTrends.find(t => t.childId === child.id);
    if (!trend) return null;
    return (
      <Card key={child.id}>
        <div className="font-semibold text-stone-800">{child.name}</div>
        
        {/* Independence this week */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-600">
              {trend.independentCompletions}/{trend.totalResponsibilityAssignments}
            </div>
            <div className="text-[10px] text-stone-500">
              {t("parent.independentDays")}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 p-2.5 text-center">
            <div className="text-lg font-bold text-amber-600">
              {trend.remindersThisWeek}
            </div>
            <div className="text-[10px] text-stone-500">
              {t("parent.remindersThisWeek")}
            </div>
          </div>
          <div className="rounded-xl bg-blue-50 p-2.5 text-center">
            <div className="text-lg font-bold text-blue-600">
              {trend.repairsCompleted}
            </div>
            <div className="text-[10px] text-stone-500">
              {t("parent.repairsCompleted")}
            </div>
          </div>
        </div>

        {/* Reminder trend arrow */}
        {trend.remindersPrevWeek > 0 && (
          <div className="mt-2 text-xs text-stone-500">
            {trend.remindersThisWeek < trend.remindersPrevWeek
              ? `↓ ${t("parent.fewerReminders")}`
              : trend.remindersThisWeek > trend.remindersPrevWeek
              ? `↑ ${t("parent.moreReminders")}`
              : `→ ${t("parent.sameReminders")}`}
          </div>
        )}

        {/* Areas needing support */}
        {trend.topNeedSupport.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-stone-600 mb-1">
              💡 {t("parent.mayNeedSupport")}
            </div>
            {trend.topNeedSupport.map(task => (
              <div key={task.taskName} className="text-xs text-stone-500 flex items-center gap-1">
                <span>·</span>
                <span>{locale === "vi" && task.taskNameVi ? task.taskNameVi : task.taskName}</span>
                <span className="text-stone-400">
                  ({task.independentDays}/{task.totalDays} {t("parent.daysIndependent")})
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  })}
</section>
```

### Analytics Guardrails

Explicitly NOT implemented:
- `bad_behavior_score`
- `obedience_score`
- `discipline_score`
- `child_ranking`
- Sibling comparison grids
- Percentage-based performance comparisons between children

## Related Code Files

- Modify: `lib/responsibility.ts` — add `getIndependenceTrend()` function
- Modify: `app/[locale]/(parent)/stats/page.tsx` — add Growing Independence link card
- Create: `app/[locale]/(parent)/stats/independence/page.tsx` — independence dashboard sub-page
- Modify: `messages/en.json` — add independence dashboard strings
- Modify: `messages/vi.json` — add independence dashboard strings

## Implementation Steps

1. Add `getIndependenceTrend()` to `lib/responsibility.ts`
2. Add i18n strings:
   - `parent.growingIndependence` — "Growing Independence"
   - `parent.independentDays` — "Independent days"
   - `parent.remindersThisWeek` — "Reminders this week"
   - `parent.repairsCompleted` — "Repairs completed"
   - `parent.fewerReminders` — "Fewer reminders than last week"
   - `parent.moreReminders` — "More reminders than last week"
   - `parent.sameReminders` — "Same as last week"
   - `parent.mayNeedSupport` — "May need more support"
   - `parent.daysIndependent` — "days independent"
   - `parent.habitsGraduated` — "Habits mastered"
3. Create independence sub-page at `stats/independence/page.tsx`
4. Add link card on main stats page (matching existing Coverage/Ladders pattern)
5. Test with sample data: create FORGOTTEN events + approved assignments -> verify metrics
6. Verify no sibling comparison is possible
7. Verify phrasing is supportive, not judgmental

## Success Criteria

- [ ] Independence dashboard accessible from parent stats page
- [ ] Per-child metrics show: independent completions, reminders, repairs, need-support areas
- [ ] Trend arrows show direction (fewer reminders = good)
- [ ] No sibling ranking or comparison displayed
- [ ] No "bad behavior score" or percentage comparison
- [ ] Phrasing is supportive ("may need more support")
- [ ] Graduated habits count displayed
- [ ] All strings bilingual (en/vi)
- [ ] Data queries perform well (indexed columns used)

## Risk Assessment

- **Risk**: Independence metrics could feel like a score to parents. **Mitigation**: Use supportive framing, show absolute numbers not percentages, never compare siblings. The design shows each child independently.
- **Risk**: With little data (new users), the dashboard looks empty. **Mitigation**: Show an empty state message: "Data will appear as responsibility events are tracked." Don't show the section if zero responsibility events exist.
- **Risk**: Query performance with many events. **Mitigation**: Indexed on `child_id + status` and `child_id + occurred_at DESC`. Window-based queries (7 days) keep result sets small.
