---
phase: 6
title: "Choice Quest Pool Integration"
status: pending
priority: P2
effort: "4h"
dependencies: [5]
---

# Phase 6: Choice Quest Pool Integration

## Overview

Replace the current random pool selection in the child's home page with age-aware, recommendation-driven candidates. The existing `pool_claims`, `child_pool_config`, and `pool_refresh_log` infrastructure is preserved — only the candidate selection logic changes.

## Requirements

- Functional:
  - Pool shows age-appropriate system quest templates (from recommendations)
  - Pool size scales with age (3-4 for ages 7-8, up to 5-7 for ages 13+)
  - Daily/weekly claim limits still enforced
  - No duplicate claims
  - Refresh mechanism shows new candidates from remaining pool
  - Claimed quest becomes a normal task assignment (existing flow preserved)
  - Domain diversity in visible pool choices
- Non-functional:
  - Backward compatible — families without `date_of_birth` see current pool behavior
  - No breaking changes to `pool_claims`, `child_pool_config`, or `pool_refresh_log`

## Architecture

### Current pool flow (unchanged structure)

```
1. Child opens home page
2. Server fetches pool tasks (currently: random from in_pool=true family tasks)
3. Child claims a pool quest → pool_claims + task_assignment created
4. Child refreshes pool (1/day) → new random selection
5. Claimed quest flows through normal submit → approve → reward pipeline
```

### New pool candidate selection

Replace step 2's random selection with:

```
1. If child has date_of_birth → use getRecommendations(childId, familyId, poolSize, 'pool')
2. Filter to templates available in family (cloned) OR system templates with availability_type IN ('choice_pool', 'both')
3. Exclude already-claimed-today and active assignments
4. Apply domain diversity (no more than 2 from same domain in visible pool)
5. If child has no date_of_birth → fall back to current random selection
```

### Age-scaled pool size

```typescript
function poolSizeForAge(age: number | null): number {
  if (age === null) return 4; // default
  if (age <= 8) return 3;
  if (age <= 10) return 4;
  if (age <= 12) return 5;
  if (age <= 14) return 6;
  return 7; // 15+
}
```

Update `child_pool_config.pool_size` default based on child age when creating config row.

### Mixed pool: family tasks + system recommendations

The pool can contain:
1. **Family pool tasks** — family-created tasks with `in_pool = true` (current behavior)
2. **System template recommendations** — age-appropriate templates not yet in family

For system templates in the pool, claiming creates the family task copy AND the assignment in one transaction (similar to `copyTemplateToFamily` from Phase 4).

## Related Code Files

- Modify: `app/[locale]/child/(app)/home/page.tsx` — update pool candidate query
- Modify: `app/[locale]/child/(app)/actions.ts` — update `claimChoiceQuestAction` to handle system template claiming
- Modify: `lib/recommendations.ts` — add `getPoolCandidates()` function
- Modify: `supabase/migrations/0013_pool_config_defaults.sql` — no change (config is per-child, not global)

## Implementation Steps

1. **Add `getPoolCandidates()` to `lib/recommendations.ts`**:
   ```typescript
   export async function getPoolCandidates(
     childId: string,
     familyId: string,
   ): Promise<PoolCandidate[]> {
     const admin = createAdminClient();
     const child = await getChildWithAge(admin, childId);
     const poolSize = poolSizeForAge(child.age);

     // 1. Get family pool tasks (current behavior)
     const { data: familyPool } = await admin.from("tasks")
       .select("*")
       .eq("family_id", familyId)
       .eq("in_pool", true)
       .eq("active", true);

     // 2. If child has age, get system recommendations
     let systemCandidates: any[] = [];
     if (child.age !== null) {
       const recs = await getRecommendations(childId, familyId, poolSize * 2, 'pool');
       systemCandidates = recs.map(r => ({
         ...r.template,
         _isSystemTemplate: true,
         _reason: r.reason,
       }));
     }

     // 3. Merge, deduplicate, and select top poolSize
     const merged = deduplicateAndMerge(familyPool ?? [], systemCandidates);

     // 4. Exclude already claimed today
     const { data: todayClaims } = await admin.from("pool_claims")
       .select("task_id")
       .eq("child_id", childId)
       .eq("claimed_date", todayISO());
     const claimedIds = new Set((todayClaims ?? []).map(c => c.task_id));

     const available = merged.filter(t => !claimedIds.has(t.id));

     // 5. Apply domain diversity and return top N
     return applyDomainDiversity(available, poolSize, 2);
   }
   ```

2. **Update child home page pool section**:
   - Replace current random pool query with `getPoolCandidates()`.
   - Display recommendation reason on each pool card (subtle text below title).
   - Show age badge on system template cards.

3. **Update `claimChoiceQuestAction`**:
   - If the claimed task is a system template (`is_system_template = true`), first copy it to the family (like `copyTemplateToFamily`), then create the assignment and pool claim.
   - If it's already a family task, use existing claim logic.

4. **Update pool refresh logic**:
   - When child refreshes pool, call `getPoolCandidates()` with different random seed / offset to show different candidates.
   - Existing `pool_refresh_log` tracking (1 refresh/day) remains unchanged.

5. **Backward compatibility test**:
   - Child without `date_of_birth` → pool shows family tasks only (current behavior).
   - Child with `date_of_birth` → pool shows mix of family + age-appropriate system templates.

## Success Criteria

- [ ] Pool shows age-appropriate candidates for children with birthday set
- [ ] Pool size scales with child age (3 for age 7, up to 7 for age 15+)
- [ ] Domain diversity maintained (max 2 from same domain in visible pool)
- [ ] System templates can be claimed directly from pool (auto-copies to family)
- [ ] Daily/weekly claim limits still enforced
- [ ] Pool refresh shows new candidates
- [ ] No duplicate claims
- [ ] Children without birthday see current pool behavior (no regression)
- [ ] Claimed quest flows through existing submit → approve → reward pipeline

## Risk Assessment

- **Risk**: Mixed pool (family + system) confuses the UI or creates inconsistent states.
  - **Mitigation**: System template pool cards show a subtle "✨ Recommended" badge to distinguish from family tasks. Claiming always creates a family copy first.
  - **Signal**: Pool claim errors or orphaned assignments.
  - **Response**: Add error boundary; log claim failures.

- **Risk**: Pool query is slow (joins system templates + family tasks + claims + recommendations).
  - **Mitigation**: All queries use indexed columns. Pool size is small (3-7 items). `getRecommendations()` is already optimized for <200ms.
  - **Signal**: Pool section loads slowly.
  - **Response**: Cache pool candidates for 5 minutes per child.
