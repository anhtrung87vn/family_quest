---
phase: 7
title: "Skill Ladders and Coverage"
status: pending
priority: P2
effort: "4h"
dependencies: [2, 3]
---

# Phase 7: Skill Ladders and Coverage

## Overview

Add two parent-facing features: (1) **Development Coverage** — a visual breakdown of which skill domains a child has practiced recently, and (2) **Skill Ladder Progress** — showing where a child sits on multi-step ladders like Cooking L1→L9.

## Requirements

- Functional:
  - Development coverage chart showing 9 domains with activity bars
  - Skill ladder progress for each of the 14 ladders
  - Data derived from completed task assignments (no new tracking table needed)
  - Habit graduation signals shown alongside ladder progress
  - Next suggested ladder level highlighted
  - No sibling comparison; no percentages implying child quality
  - Labels use "areas practiced", not "performance score"
- Non-functional:
  - Server-rendered (no charting library needed — CSS bars)
  - Mobile-friendly
  - Data query performant (single aggregation query)

## Architecture

### Development Coverage Data

Query completed assignments in last 30 days, group by `skill_domain`:

```sql
SELECT t.skill_domain, COUNT(DISTINCT ta.id) as practice_count
FROM task_assignments ta
JOIN tasks t ON t.id = ta.task_id
WHERE ta.child_id = $childId
  AND ta.status = 'approved'
  AND ta.created_at >= NOW() - INTERVAL '30 days'
  AND t.skill_domain IS NOT NULL
GROUP BY t.skill_domain
```

Render as horizontal bars (CSS-only, no chart library):

```
🧠 Learning             ███████░░░  7
🎯 Self Management      █████░░░░░  5
🏠 Life Skills          ████░░░░░░  4
💰 Money                ███░░░░░░░  3
💬 Communication        ██████░░░░  6
❤️ Character & Family   ███████░░░  7
🏃 Health               █████░░░░░  5
💻 Digital              ███░░░░░░░  3
🌍 World                ████░░░░░░  4
```

### Skill Ladder Progress Data

For each of the 14 ladders, find the highest `skill_ladder_level` completed by the child:

```sql
SELECT t.skill_ladder_key, MAX(t.skill_ladder_level) as max_completed_level
FROM task_assignments ta
JOIN tasks t ON t.id = ta.task_id
WHERE ta.child_id = $childId
  AND ta.status = 'approved'
  AND t.skill_ladder_key IS NOT NULL
GROUP BY t.skill_ladder_key
```

Then for each ladder, show:
- Completed levels (filled dots)
- Next suggested level (highlighted dot with link to Quest Library)
- Future levels (empty dots)

### Ladder visualization (CSS)

```
🍳 Cooking
● ● ● ○ ○ ○ ○ ○ ○   Level 3 of 9
            ↑ Next: Cook a simple meal with supervision

💰 Money
● ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○   Level 2 of 12
      ↑ Next: Shop within a small budget
```

### Habit graduation signals

From `child_task_reward_progress` where `reward_stage = 'graduated'`:

```
🎓 Graduated Habits
✓ Prepare School Bag — graduated 2 months ago
✓ Make My Bed — graduated 1 month ago
```

## Related Code Files

- Create: `app/[locale]/(parent)/stats/coverage/page.tsx` — development coverage view
- Create: `app/[locale]/(parent)/stats/ladders/page.tsx` — skill ladder progress view
- Create: `lib/coverage.ts` — data fetching for coverage + ladders
- Modify: `app/[locale]/(parent)/stats/page.tsx` — add links/cards to coverage + ladders
- Modify: `messages/en.json` + `messages/vi.json` — add coverage/ladder strings

## Implementation Steps

1. **Create `lib/coverage.ts`**:
   ```typescript
   export async function getDevelopmentCoverage(childId: string, days: number = 30) {
     const admin = createAdminClient();
     // ... query as above
     // Returns: { domain: SkillDomain, count: number }[]
   }

   export async function getSkillLadderProgress(childId: string) {
     const admin = createAdminClient();
     // ... query as above
     // Returns: { ladder: string, maxLevel: number, totalLevels: number, nextTemplate?: SystemTemplate }[]
   }

   export async function getGraduatedHabits(childId: string) {
     const admin = createAdminClient();
     const { data } = await admin.from("child_task_reward_progress")
       .select("task_id, graduated_at, task:tasks(name, name_vi)")
       .eq("child_id", childId)
       .eq("reward_stage", "graduated")
       .not("graduated_at", "is", null)
       .order("graduated_at", { ascending: false });
     return data ?? [];
   }
   ```

2. **Create `app/[locale]/(parent)/stats/coverage/page.tsx`**:
   - Server Component.
   - Child selector (same pattern as Quest Library).
   - 9-domain horizontal bar chart (CSS width percentage).
   - Label: "Areas Practiced (Last 30 Days)".
   - Domain color from `domainStyle()`.
   - Below bars: "Explore Something New" suggestion for lowest-activity domain.

3. **Create `app/[locale]/(parent)/stats/ladders/page.tsx`**:
   - Server Component.
   - Child selector.
   - Grid of 14 ladder cards.
   - Each card: ladder name, dot progress, current level, next level suggestion.
   - "Next" links to Quest Library filtered by that ladder's domain.

4. **Add graduated habits section**: On the ladders page or as a separate section on stats, show graduated habits with celebration styling.

5. **Link from stats page**: Add two new cards on the stats index page:
   - "🧭 Development Coverage" → `/stats/coverage`
   - "📈 Skill Ladders" → `/stats/ladders`

6. **Ladder metadata constant**: Define ladder max levels in `lib/recommendations.ts` or a new `lib/ladders.ts`:
   ```typescript
   export const SKILL_LADDERS: Record<string, { label_en: string; label_vi: string; maxLevel: number; icon: string }> = {
     COOKING: { label_en: 'Cooking', label_vi: 'Nấu ăn', maxLevel: 9, icon: '🍳' },
     HOUSEHOLD_CARE: { label_en: 'Household Care', label_vi: 'Chăm sóc nhà', maxLevel: 8, icon: '🏠' },
     // ... 12 more ladders
   };
   ```

7. **i18n strings**: Add coverage/ladder labels to both locale files.

## Success Criteria

- [ ] Development coverage page shows 9-domain activity bars for selected child
- [ ] Bars scale relative to most-practiced domain (not absolute counts)
- [ ] Labels say "areas practiced" not "performance"
- [ ] Skill ladder page shows progress dots for each of 14 ladders
- [ ] Next suggested level is highlighted with link to Quest Library
- [ ] Graduated habits section shows with celebration styling
- [ ] No sibling comparison anywhere on these pages
- [ ] Mobile-friendly layout
- [ ] Stats index page links to both new views

## Risk Assessment

- **Risk**: Child has no completed tasks with `skill_domain` → empty coverage view.
  - **Mitigation**: Show EmptyState: "Start quests to see your child's development coverage!" with link to Quest Library.
  - **Signal**: Empty bars on coverage page.
  - **Response**: Expected for new users; no action needed.

- **Risk**: Ladder progress is misleading if parent assigns out-of-order levels.
  - **Mitigation**: Show "highest completed level" not "sequential completion". Tooltips explain that ladders are recommendations, not requirements.
  - **Signal**: Parent confusion about ladder progress.
  - **Response**: Add explanatory text to ladder cards.
