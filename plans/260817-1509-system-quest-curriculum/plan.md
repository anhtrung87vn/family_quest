---
title: "System Quest Curriculum"
description: "Evolve BloomQuest from a simple task/reward app into a developmental life-skills curriculum with 180 age-aware System Quest templates, a Parent Quest Library, rule-based recommendations, skill ladders, and age-adaptive UX."
status: pending
priority: P1
effort: "3-4 weeks"
tags: [curriculum, quest-library, age-aware, skill-ladders, recommendations]
created: 2026-08-17
---

# System Quest Curriculum

## Overview

Transform BloomQuest from a flat task/reward app into a **developmental life-skills curriculum** covering ages 7-18. The system will offer 180 curated System Quest templates organized by 9 development domains, with age-aware recommendations, skill ladders, habit graduation tracking, and a Parent Quest Library for discovery.

**North Star**: At age 18, the child should need BloomQuest less than at age 7 because responsibilities, habits, planning, self-management, and practical life skills have increasingly become internalized.

**Source document**: `docs/BloomQuest_System_Quest_Curriculum_Implementation_Plan.md`

## Codebase Analysis

### What exists today
- `tasks` table with `behavior_type`, `availability_type`, `evidence_type` columns (migration 0015)
- `child_task_reward_progress` table with reward fading stages (0015)
- Quest Pool system with `pool_claims`, `child_pool_config`, `pool_refresh_log` (0012-0013)
- ~30 existing system quest pool templates + ~30 core task templates (0004, 0006, 0012)
- `family_quests` table for cooperative family quests (0009, 0011)
- Bilingual support via `name_vi`/`description_vi` columns (0023-0024)
- `is_system_template` flag + nil UUID (`00000000-...`) family sentinel
- `cloneSystemTemplates()` and `resetAndRecloneTasks()` server actions
- `category` field uses: `learning`, `responsibility`, `family`, `health`, `creativity`

### What does NOT exist yet
- **No child age/birthday field** — `children` table has `grade` but no `date_of_birth`
- **No curriculum-specific fields** — `template_key`, `skill_domain`, `min_age`, `recommended_age`, `max_age`, `independence_level`, `development_goal`, `parent_tip`, `skill_ladder_key`, `skill_ladder_level`, `estimated_minutes`, `recommended_frequency`, `requires_supervision`, `source_template_key`
- **No Quest Library UI** — parents currently see a flat task list with a "clone templates" button
- **No recommendation engine** — pool candidates are randomly selected from `in_pool = true` tasks
- **No skill ladder tracking** — no ladder progression metadata
- **No development coverage analytics** — no domain activity tracking

### Key constraints
- Never rewrite applied production migrations (0001-0024)
- Family-created tasks must not be reclassified or broken
- System templates use `family_id = '00000000-0000-0000-0000-000000000000'`
- Server-side validation + RLS must remain enforced
- Bilingual (en/vi) for all user-facing text
- No sibling comparison or ranking

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Add `date_of_birth` to children + derive age | P1 |
| 2 | Extend tasks schema with curriculum fields (domain, age range, template_key, etc.) | P1 |
| 3 | Seed 180 System Quest templates covering ages 7-18 | P1 |
| 4 | Build Parent Quest Library with age-aware filtering + "Add for child" | P1 |
| 5 | Implement rule-based recommendation engine | P1 |
| 6 | Integrate age-aware candidates into Child Choice Quest Pool | P2 |
| 7 | Add skill ladder metadata and development coverage view | P2 |
| 8 | Adapt child UX for older teens (goal/project emphasis over coins) | P3 |

## Phases

| # | Phase | Status | Priority | Effort | Dependencies |
|---|-------|--------|----------|--------|--------------|
| 1 | [Phase 1: Child Age Support](./phase-01-start.md) | Pending | P1 | 2h | — |
| 2 | [Phase 2: Schema Foundation](./phase-02-schema-foundation.md) | Pending | P1 | 4h | 1 |
| 3 | [Phase 3: Seed Curriculum 180 Templates](./phase-03-seed-curriculum-180-templates.md) | Pending | P1 | 8h | 2 |
| 4 | [Phase 4: Parent Quest Library UI](./phase-04-parent-quest-library-ui.md) | Pending | P1 | 6h | 2, 3 |
| 5 | [Phase 5: Rule-Based Recommendation Engine](./phase-05-rule-based-recommendation-engine.md) | Pending | P1 | 4h | 2, 3 |
| 6 | [Phase 6: Choice Quest Pool Integration](./phase-06-choice-quest-pool-integration.md) | Pending | P2 | 4h | 5 |
| 7 | [Phase 7: Skill Ladders and Coverage](./phase-07-skill-ladders-and-coverage.md) | Pending | P2 | 4h | 2, 3 |
| 8 | [Phase 8: Older Child UX Evolution](./phase-08-older-child-ux-evolution.md) | Pending | P3 | 6h | 4, 5, 6, 7 |

## Success Criteria

- [ ] Children table has `date_of_birth`; parent can set birthday; age is derived
- [ ] Tasks table has all curriculum fields (domain, age range, template_key, difficulty 1-10, independence_level, development_goal, parent_tip, skill_ladder metadata)
- [ ] 180 System Quest templates seeded covering every age 7-18 with bilingual titles
- [ ] Parent Quest Library shows age-filtered templates with domain tabs, quest detail cards, and "Add for Child" flow
- [ ] Recommendation engine ranks templates by age proximity, domain diversity, and recency
- [ ] Child Choice Pool uses age-aware candidates instead of random selection
- [ ] Skill ladders and development coverage view available on parent stats
- [ ] Existing tasks, assignments, rewards, evidence, and approval flows unchanged
- [ ] No sibling ranking or comparison introduced
- [ ] RLS and server-side authorization enforced on all new surfaces

## Architecture Decision: Reuse `tasks` Table

The curriculum templates live in the existing `tasks` table (with `is_system_template = true`, `family_id = nil UUID`). This avoids a parallel task system and reuses all existing completion, reward, evidence, and approval logic. New nullable columns extend the schema backward-compatibly.

## Open Questions

None — the source document (`docs/BloomQuest_System_Quest_Curriculum_Implementation_Plan.md`) is comprehensive and prescriptive.

<!-- slug: system-quest-curriculum -->
