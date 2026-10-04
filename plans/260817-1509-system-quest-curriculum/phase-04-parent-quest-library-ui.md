---
phase: 4
title: "Parent Quest Library UI"
status: pending
priority: P1
effort: "6h"
dependencies: [2, 3]
---

# Phase 4: Parent Quest Library UI

## Overview

Build a new **Quest Library** page in the parent shell where parents can browse, filter, and add System Quest templates for their children. This replaces the current "clone all templates" button with a curated, age-aware discovery experience.

## Requirements

- Functional:
  - Child selector at top (dropdown showing family's children with ages)
  - Domain tab bar showing 9 skill domains
  - Filterable by age range, difficulty, independence level, behavior type
  - Quest detail card with title, description, domain, age range, difficulty badge, independence level, development goal, parent tip
  - "Add for [Child]" button that copies template to family and optionally assigns
  - Age warning when template is outside recommended range
  - Search by quest name
- Non-functional:
  - Server Component by default; filters use search params
  - Mobile-first responsive design following existing design system
  - Bilingual — all text via `t()` or `localName()`/`localDesc()`

## Architecture

### New route: `app/[locale]/(parent)/library/`

```
library/
  page.tsx          — Server Component: fetch + render
  actions.ts        — Server Actions: copyTemplateToFamily
  QuestFilters.tsx   — Client Component: filter state + URL params
  QuestCard.tsx     — Server or Client Component: template display
  loading.tsx       — Skeleton loading state
```

### Data flow

```
1. Parent selects a child → child_id in URL search params
2. Server fetches child's date_of_birth → derives age
3. Server queries system templates filtered by age + domain + filters
4. Renders quest cards grouped/sorted by recommendation score
5. "Add for [Child]" → server action copies template → revalidates /tasks
```

### Server action: `copyTemplateToFamily`

```typescript
export async function copyTemplateToFamily(formData: FormData) {
  const templateId = z.string().uuid().parse(formData.get("template_id"));
  const childId = z.string().uuid().parse(formData.get("child_id"));
  const { supabase, userId, familyId } = await requireFamily();
  const admin = createAdminClient();

  // Fetch system template (bypass RLS)
  const { data: tpl } = await admin.from("tasks")
    .select("*")
    .eq("id", templateId)
    .eq("is_system_template", true)
    .single();
  if (!tpl) throw new Error("Template not found");

  // Insert family copy
  const { data: familyTask, error } = await supabase.from("tasks").insert({
    family_id: familyId,
    name: tpl.name,
    name_vi: tpl.name_vi,
    description: tpl.description,
    description_vi: tpl.description_vi,
    category: tpl.category,
    skill_domain: tpl.skill_domain,
    behavior_type: tpl.behavior_type,
    availability_type: tpl.availability_type,
    coin_reward: tpl.coin_reward,
    star_reward: tpl.star_reward,
    difficulty: tpl.difficulty,
    independence_level: tpl.independence_level,
    evidence_type: tpl.evidence_type,
    evidence_required: tpl.evidence_required,
    requires_approval: tpl.requires_approval,
    requires_supervision: tpl.requires_supervision,
    development_goal: tpl.development_goal,
    development_goal_vi: tpl.development_goal_vi,
    parent_tip: tpl.parent_tip,
    parent_tip_vi: tpl.parent_tip_vi,
    source_template_key: tpl.template_key,
    skill_ladder_key: tpl.skill_ladder_key,
    skill_ladder_level: tpl.skill_ladder_level,
    in_pool: tpl.availability_type === 'choice_pool' || tpl.availability_type === 'both',
    pool_max_per_day: tpl.pool_max_per_day,
    is_system_template: false,
    created_by: userId,
  }).select("id").single();
  if (error) throw error;

  // Optionally auto-assign to child
  if (childId && familyTask) {
    await supabase.from("task_assignments").insert({
      task_id: familyTask.id,
      child_id: childId,
      due_date: todayISO(),
      status: "todo",
      assignment_source: "parent",
    });
  }

  revalidatePath("/[locale]/(parent)/tasks", "page");
  revalidatePath("/[locale]/(parent)/library", "page");
}
```

### Quest card layout (mobile)

```
┌────────────────────────────────────┐
│ 🧠 LEARNING          Ages 9-11    │
│ ─────────────────────────────────  │
│ 🍳 Make Your Own Breakfast         │
│ Practice simple food preparation   │
│                                    │
│ ★ 2/10  🌿 Supported              │
│ 🪙 5  ⭐ 1                        │
│                                    │
│ WHY THIS MATTERS                   │
│ Practice independence in basic     │
│ meal preparation.                  │
│                                    │
│ PARENT TIP                         │
│ Let the child choose ingredients   │
│ and do safe steps independently.   │
│                                    │
│         [ Add for Berry ]          │
└────────────────────────────────────┘
```

## Related Code Files

- Create: `app/[locale]/(parent)/library/page.tsx`
- Create: `app/[locale]/(parent)/library/actions.ts`
- Create: `app/[locale]/(parent)/library/QuestFilters.tsx`
- Create: `app/[locale]/(parent)/library/QuestCard.tsx`
- Create: `app/[locale]/(parent)/library/loading.tsx`
- Modify: `app/[locale]/(parent)/layout.tsx` — add "Quest Library" nav link
- Modify: `messages/en.json` + `messages/vi.json` — add `parent.library.*` strings

## Implementation Steps

1. **Create route directory** `app/[locale]/(parent)/library/`.

2. **`page.tsx`** (Server Component):
   - Extract `child_id`, `domain`, `difficulty`, `independence`, `search` from search params.
   - Fetch selected child's age via `child_age_by_id()` or `date_of_birth` + JS compute.
   - Fetch all children for the child selector dropdown.
   - Query system templates with filters:
     ```sql
     SELECT * FROM tasks
     WHERE is_system_template = true
       AND active = true
       AND (skill_domain = $domain OR $domain IS NULL)
       AND (min_age <= $childAge OR min_age IS NULL)
       AND (max_age >= $childAge OR max_age IS NULL)
       -- additional filters...
     ORDER BY
       ABS(recommended_age - $childAge) ASC,
       skill_domain,
       difficulty
     ```
   - Check which templates are already in the family (by `source_template_key`).
   - Render domain tabs, filter bar, quest cards.

3. **`QuestFilters.tsx`** (Client Component):
   - Child selector dropdown (updates URL param `child_id`).
   - Domain tab bar (9 domains + "All").
   - Collapsible advanced filters: difficulty range, independence level, behavior type.
   - Search input (debounced, updates URL param `search`).
   - Uses `useRouter()` and `useSearchParams()` to update URL without reload.

4. **`QuestCard.tsx`**:
   - Displays template with domain color/icon from `domainStyle()`.
   - Age range badge: "Ages 9-11".
   - Difficulty stars: "★ 5/10".
   - Independence badge: "🌿 Supported".
   - Expandable "Why this matters" and "Parent tip" sections.
   - "Add for [Child]" form button.
   - If already added, show "✓ Added" badge.
   - If outside age range, show warning: "Usually recommended for ages 11-13. You can still add it."

5. **`loading.tsx`**: Skeleton with domain tab placeholders + 4 card skeletons.

6. **Nav link**: Add to parent sidebar/nav. Icon: "✨". Label: `t("parent.questLibrary")`.

7. **i18n strings**: Add all quest library strings to both locale files:
   - `parent.questLibrary`, `parent.libraryFor`, `parent.addForChild`, `parent.alreadyAdded`
   - `parent.ageWarning`, `parent.whyMatters`, `parent.parentTipLabel`
   - `parent.allDomains`, `parent.filterDifficulty`, `parent.filterIndependence`
   - Domain labels: `parent.domain.LEARNING`, etc.

## Success Criteria

- [ ] Quest Library page accessible from parent nav
- [ ] Child selector shows family children with ages
- [ ] 9 domain tabs filter templates correctly
- [ ] Quest cards display all metadata (domain, age, difficulty, independence, dev goal, parent tip)
- [ ] "Add for [Child]" creates family task copy and optionally assigns
- [ ] Already-added templates show "Added" badge
- [ ] Out-of-age-range warning shown but not blocking
- [ ] Search filters by template name
- [ ] Advanced filters (difficulty, independence, behavior type) work
- [ ] Fully bilingual (en/vi)
- [ ] Mobile-friendly responsive layout
- [ ] Loading skeleton displayed during fetch

## Risk Assessment

- **Risk**: Too many templates (180) renders slowly on mobile.
  - **Mitigation**: Pagination or virtual scrolling. Default to showing templates for selected child's age only (~15-30 results). "Show all ages" toggle for manual browsing.
  - **Signal**: Page load >3s on mobile.
  - **Response**: Add pagination with 20 templates per page.

- **Risk**: Parent doesn't set child birthday → no age for filtering.
  - **Mitigation**: If no birthday, show all templates grouped by age. Show prompt to set birthday.
  - **Signal**: Child selector shows "Age unknown".
  - **Response**: Functional but degraded experience.
