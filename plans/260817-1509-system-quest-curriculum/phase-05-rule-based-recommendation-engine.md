---
phase: 5
title: "Rule-Based Recommendation Engine"
status: pending
priority: P1
effort: "4h"
dependencies: [2, 3]
---

# Phase 5: Rule-Based Recommendation Engine

## Overview

Implement the V1 recommendation algorithm described in the curriculum document (section 19). This is a deterministic, rule-based system — no AI or ML. It ranks system quest templates for a given child based on age proximity, domain diversity, recency, and difficulty appropriateness.

## Requirements

- Functional:
  - Given a child ID, return ranked list of recommended system templates
  - Age-appropriate filtering (within min_age..max_age range)
  - Domain diversity — prefer under-represented domains
  - Avoid recently completed templates
  - Respect availability_type (only CHOICE_POOL or BOTH templates for child pool)
  - Never use sibling data in ranking
  - Explainable — each recommendation has a reason string
- Non-functional:
  - Pure SQL/TypeScript function, no external service
  - Query completes in <200ms for typical family
  - Testable with unit tests (no DB dependency for scoring logic)

## Architecture

### Two-layer design

1. **SQL candidate filter** — Postgres query returning eligible templates
2. **TypeScript ranker** — `lib/recommendations.ts` scores and sorts candidates

### SQL candidate filter

```sql
-- Candidates for child age N
SELECT t.*, 
  child_age($dob) as child_age,
  ABS(t.recommended_age - child_age($dob)) as age_distance
FROM tasks t
WHERE t.is_system_template = true
  AND t.active = true
  AND t.template_key IS NOT NULL
  AND (t.min_age IS NULL OR t.min_age <= child_age($dob))
  AND (t.max_age IS NULL OR t.max_age >= child_age($dob))
  AND (t.availability_type IN ('choice_pool', 'both'))  -- for pool context
  -- Exclude templates already active in family
  AND t.template_key NOT IN (
    SELECT source_template_key FROM tasks
    WHERE family_id = $familyId AND active = true AND source_template_key IS NOT NULL
  )
ORDER BY age_distance ASC, t.skill_domain, t.difficulty;
```

### TypeScript scoring function

```typescript
// lib/recommendations.ts

interface RecommendationCandidate {
  id: string;
  template_key: string;
  skill_domain: string;
  recommended_age: number;
  difficulty: number;
  independence_level: string;
  behavior_type: string;
}

interface RecommendationResult {
  template: RecommendationCandidate;
  score: number;
  reason: string;  // e.g., "Berry hasn't practiced Money skills recently"
}

export function scoreCandidate(
  candidate: RecommendationCandidate,
  childAge: number,
  recentDomains: Map<string, number>,  // domain → count in last 14 days
  recentTemplateKeys: Set<string>,      // completed in last 7 days
  activeDomainCount: number,            // total active domains
): { score: number; reason: string } {
  let score = 100;
  let reason = '';

  // 1. Age proximity (max 30 points)
  const ageDist = Math.abs(candidate.recommended_age - childAge);
  score -= ageDist * 10;  // -10 per year distance

  // 2. Domain diversity (max 25 points)
  const domainActivity = recentDomains.get(candidate.skill_domain) ?? 0;
  if (domainActivity === 0) {
    score += 25;
    reason = `No ${candidate.skill_domain} practice recently`;
  } else if (domainActivity < 3) {
    score += 10;
  }

  // 3. Recency penalty (-20 if completed very recently)
  if (recentTemplateKeys.has(candidate.template_key)) {
    score -= 20;
  }

  // 4. Independence level match (+5 for age-appropriate level)
  const expectedLevel = childAge <= 9 ? 'GUIDED' : childAge <= 12 ? 'SUPPORTED' : 'INDEPENDENT';
  if (candidate.independence_level === expectedLevel) {
    score += 5;
  }

  // 5. Variety bonus — avoid all-same behavior type
  // (Applied at list level, not per-candidate)

  if (!reason) {
    reason = ageDist === 0
      ? 'Recommended for this age'
      : `Suitable for ages ${candidate.recommended_age}`;
  }

  return { score: Math.max(score, 0), reason };
}
```

### Recommendation API

```typescript
// lib/recommendations.ts (continued)

export async function getRecommendations(
  childId: string,
  familyId: string,
  limit: number = 15,
  context?: 'library' | 'pool',
): Promise<RecommendationResult[]> {
  const admin = createAdminClient();
  
  // 1. Get child age
  const { data: child } = await admin
    .from("children")
    .select("date_of_birth")
    .eq("id", childId)
    .single();
  if (!child?.date_of_birth) return []; // No birthday → no recommendations
  
  const childAge = computeAge(child.date_of_birth);

  // 2. Get recent activity (last 14 days)
  const { data: recentCompletions } = await admin
    .from("task_assignments")
    .select("task:tasks(skill_domain, source_template_key)")
    .eq("child_id", childId)
    .eq("status", "approved")
    .gte("created_at", fourteenDaysAgo());

  // Build domain frequency map and recent template set
  const recentDomains = new Map<string, number>();
  const recentTemplateKeys = new Set<string>();
  for (const r of recentCompletions ?? []) {
    const task = Array.isArray(r.task) ? r.task[0] : r.task;
    if (task?.skill_domain) {
      recentDomains.set(task.skill_domain, (recentDomains.get(task.skill_domain) ?? 0) + 1);
    }
    if (task?.source_template_key) {
      recentTemplateKeys.add(task.source_template_key);
    }
  }

  // 3. Get candidates from system templates
  let query = admin.from("tasks")
    .select("*")
    .eq("is_system_template", true)
    .eq("active", true)
    .not("template_key", "is", null)
    .lte("min_age", childAge)
    .gte("max_age", childAge);

  if (context === 'pool') {
    query = query.in("availability_type", ["choice_pool", "both"]);
  }

  const { data: candidates } = await query;

  // 4. Score and rank
  const scored = (candidates ?? []).map(c => ({
    template: c,
    ...scoreCandidate(c, childAge, recentDomains, recentTemplateKeys, recentDomains.size),
  }));

  // 5. Sort by score desc, then ensure domain variety
  scored.sort((a, b) => b.score - a.score);

  // 6. Apply diversity constraint: no more than 3 from same domain in top results
  return applyDomainDiversity(scored, limit, 3);
}
```

## Related Code Files

- Create: `lib/recommendations.ts` — scoring + recommendation fetching
- Create: `tests/recommendations.test.ts` — unit tests for scoring logic
- Modify: `app/[locale]/(parent)/library/page.tsx` — use recommendations for "Recommended" tab
- Modify: `app/[locale]/child/(app)/home/page.tsx` — use recommendations for pool candidates (Phase 6)

## Implementation Steps

1. **Create `lib/recommendations.ts`**:
   - Export `computeAge(dob: string): number` — derive age from ISO date string
   - Export `scoreCandidate()` — pure function, no DB dependency
   - Export `applyDomainDiversity()` — post-process to ensure variety
   - Export `getRecommendations()` — full pipeline with DB queries
   - Export `getRecommendationReason()` — human-readable explanation

2. **Create `tests/recommendations.test.ts`**:
   - Test `computeAge()` with edge cases (today's birthday, leap year)
   - Test `scoreCandidate()` with various inputs:
     - Exact age match → high score
     - 3-year age gap → lower score
     - Under-represented domain → boost
     - Recently completed → penalty
   - Test `applyDomainDiversity()` — max 3 per domain
   - Test scoring does not use sibling data (function signature prevents it)

3. **Integrate with Quest Library**: In Phase 4's `page.tsx`, add a "Recommended" tab that uses `getRecommendations()` to show the top suggestions with reason strings.

4. **Reason strings for i18n**: Add to both locale files:
   - `parent.recReason.noPractice`: "No {domain} practice recently"
   - `parent.recReason.recommended`: "Recommended for this age"
   - `parent.recReason.suitable`: "Suitable for ages {age}"

## Success Criteria

- [ ] `scoreCandidate()` is a pure function with no DB dependency
- [ ] `getRecommendations()` returns age-appropriate, domain-diverse results
- [ ] Each recommendation includes a human-readable reason
- [ ] Under-represented domains are boosted
- [ ] Recently completed templates are penalized
- [ ] No sibling data is used anywhere in the pipeline
- [ ] Unit tests pass for scoring logic
- [ ] Recommendations complete in <200ms for typical dataset

## Risk Assessment

- **Risk**: Scoring weights produce unintuitive rankings.
  - **Mitigation**: Start with simple weights (age=10, domain=25, recency=-20). Tune based on real family usage in Phase 8.
  - **Signal**: Parent feedback that recommendations don't make sense.
  - **Response**: Adjust weights — all are constants in `recommendations.ts`, easy to tune.

- **Risk**: No `date_of_birth` set → `getRecommendations()` returns empty.
  - **Mitigation**: Document this clearly in Quest Library UI. Show "Set birthday to get personalized recommendations."
  - **Signal**: Empty recommendations panel.
  - **Response**: Fall back to showing all templates sorted by domain, no age filtering.
