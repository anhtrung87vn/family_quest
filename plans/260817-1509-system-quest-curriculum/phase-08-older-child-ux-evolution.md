---
phase: 8
title: "Older Child UX Evolution"
status: pending
priority: P3
effort: "6h"
dependencies: [4, 5, 6, 7]
---

# Phase 8: Older Child UX Evolution

## Overview

Adapt the child-facing UX to reflect the maturity level of the child. Younger children (7-9) see a task-centric daily view; older children (13+) see goal-oriented, project-focused views with less emphasis on coin rewards. This phase does not require a full redesign — it's incremental adaptation of existing UI components based on the child's age.

## Requirements

- Functional:
  - Age-adapted home page layout (3 tiers: 7-9, 10-12, 13+)
  - Younger children: task-centric with emoji celebrations
  - Middle children: task + habit progress + simple weekly goals
  - Older teens: goals/projects emphasis, reduced coin prominence, weekly review
  - Habit graduation celebration when stage changes to GRADUATED
  - Age-appropriate quest pool sizing (from Phase 6)
- Non-functional:
  - No separate app for different age groups — same route, conditionally rendered sections
  - Graceful degradation if no birthday set (show current layout)
  - Preserve all existing functionality (submit, evidence, pool, messages)

## Architecture

### Age-tier rendering strategy

In `app/[locale]/child/(app)/home/page.tsx`, derive age and conditionally render sections:

```typescript
const childAge = child.date_of_birth ? computeAge(child.date_of_birth) : null;
const ageTier = childAge === null ? 'default'
  : childAge <= 9 ? 'young'
  : childAge <= 12 ? 'middle'
  : 'teen';
```

### Young tier (7-9): Current layout with minor polish

```
🌱 My Responsibilities     (behavior_type = responsibility)
🎯 Today's Quests          (behavior_type = challenge/habit_building)
✨ Pick a Quest             (choice pool — 3-4 options)
💌 Messages from Parents
```

- Coin/star rewards prominent
- Big emoji celebrations on completion
- Simple language

### Middle tier (10-12): Add habit + weekly sections

```
🌱 My Responsibilities
🎯 Today's Quests
🌿 My Habits               (habit_building tasks with streak/progress)
✨ Pick a Quest             (4-5 options)
📅 My Week                  (upcoming assignments this week)
💌 Messages
```

- Habit progress bars showing streak
- Weekly overview of upcoming tasks
- Coins still visible but not dominant

### Teen tier (13+): Goal-oriented layout

```
🎯 My Priorities            (top 3 tasks for today)
🌱 Responsibilities         (collapsed by default — they know what to do)
📋 Active Projects          (multi-day challenge tasks)
✨ Choose a Challenge       (5-7 options, labeled "challenges" not "quests")
📈 My Progress              (skill ladder summary)
📅 This Week                (week view)
💌 Messages
```

- Coins shown smaller / secondary
- Stars and progress bars emphasized
- "Goals" and "Projects" language instead of "Quests"
- Responsibilities collapsed (they're routine)
- Weekly planning view

### Habit graduation celebration

When `reward_stage` changes to `graduated`, show a one-time celebration:

```
┌────────────────────────────────────┐
│        🎓 Congratulations!        │
│                                    │
│   "Prepare School Bag" is now a   │
│   responsibility you've mastered!  │
│                                    │
│   You've grown more independent.   │
│                                    │
│          [ Awesome! 🎉 ]          │
└────────────────────────────────────┘
```

Tracked via a `celebrated_at` field or a simple check against `child_task_reward_progress.graduated_at`.

### Dashboard cards for parent (from curriculum §38)

Add age-aware insight cards to parent dashboard:

```
🌱 Growing Independence
2 habits ready for graduation review

✨ Self-Chosen This Month
8 quests

🧭 Explore Something New
No Money quests in 3 weeks

🏠 Life Skills
Cooking L4 practiced recently
```

## Related Code Files

- Modify: `app/[locale]/child/(app)/home/page.tsx` — conditional rendering by age tier
- Create: `components/ui/HabitProgress.tsx` — habit progress bar with streak
- Create: `components/ui/GraduationCelebration.tsx` — graduation modal/banner
- Create: `components/ui/WeekView.tsx` — weekly task overview for middle/teen tiers
- Modify: `app/[locale]/(parent)/dashboard/page.tsx` — add insight cards
- Modify: `lib/coverage.ts` — add `getDashboardInsights()` for parent cards
- Modify: `messages/en.json` + `messages/vi.json` — add age-tier-specific strings

## Implementation Steps

1. **Add age derivation to child home page**:
   - Fetch `date_of_birth` alongside existing child data.
   - Compute age tier (young/middle/teen/default).
   - Pass tier to conditional rendering blocks.

2. **Refactor home page into sections**:
   - Extract each section (responsibilities, quests, pool, messages) into sub-components.
   - Conditionally include/exclude sections based on tier.
   - Adjust section ordering per tier.

3. **Young tier (7-9) — minimal changes**:
   - Current layout is already task-centric.
   - Add "My Responsibilities" section header grouping `behavior_type = 'responsibility'` tasks.
   - Keep coin/star badges prominent.

4. **Middle tier (10-12) — add habit + week**:
   - Add "My Habits" section showing `behavior_type = 'habit_building'` tasks with streak progress.
   - Add "My Week" section showing upcoming 7 days of assignments.
   - Create `WeekView.tsx` — grid of 7 days with task counts and upcoming assignments.

5. **Teen tier (13+) — goal-oriented**:
   - Rename "Today's Quests" → "My Priorities".
   - Collapse "Responsibilities" by default (use `Collapsible` component).
   - Add "Active Projects" section for multi-day challenges (tasks with difficulty >= 7).
   - Reduce coin badge size; emphasize stars and progress.
   - Change "Pick a Quest" → "Choose a Challenge".

6. **Graduation celebration**:
   - Create `GraduationCelebration.tsx` — modal/banner with animation.
   - Check for newly graduated habits (graduated_at within last 24h, not yet celebrated).
   - Show once per graduation event.

7. **Parent dashboard insight cards**:
   - Add `getDashboardInsights()` to `lib/coverage.ts`.
   - Returns structured data for 4-5 insight cards.
   - Render on parent dashboard below existing content.

8. **i18n for age tiers**: Add strings for each tier's section headers and labels. Use `t("child.tier.teen.priorities")` pattern.

## Success Criteria

- [ ] Child home page adapts layout based on age tier
- [ ] 7-9 year olds see task-centric layout with prominent rewards
- [ ] 10-12 year olds see habit progress and weekly view additions
- [ ] 13+ see goal-oriented layout with reduced coin emphasis
- [ ] Responsibilities section collapsed by default for teens
- [ ] Graduation celebration shows for newly graduated habits
- [ ] Parent dashboard shows age-aware insight cards
- [ ] No birthday set → current layout (no regression)
- [ ] All sections bilingual
- [ ] Mobile-friendly for all tiers

## Risk Assessment

- **Risk**: Teen layout removes too much gamification, reducing engagement.
  - **Mitigation**: Stars and progress bars remain visible. Only coin prominence is reduced, not removed. Parents can still set coin rewards on any task.
  - **Signal**: Drop in teen engagement metrics.
  - **Response**: Adjust tier thresholds or make layout preference configurable.

- **Risk**: Complex conditional rendering makes home page hard to maintain.
  - **Mitigation**: Extract each tier's unique sections into separate components. Core data fetching remains shared. Each tier is a render variation, not a separate page.
  - **Signal**: Home page file exceeds 500 lines.
  - **Response**: Split into `HomeYoung.tsx`, `HomeMiddle.tsx`, `HomeTeen.tsx` sub-components.

- **Risk**: Graduation celebration fires repeatedly or not at all.
  - **Mitigation**: Track celebration display via `graduated_at` timestamp comparison. Only show if `graduated_at` is within last 24h and the child hasn't dismissed it (tracked via a cookie or session flag).
  - **Signal**: Duplicate celebrations or missing celebrations.
  - **Response**: Add `celebrated_at` column to `child_task_reward_progress` table.
